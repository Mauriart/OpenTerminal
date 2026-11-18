import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

let tmpDir: string;
let service: typeof import("../daytrade/service.js");
let runner: typeof import("../daytrade/runner.js");
let daytradeRouter: typeof import("./daytrade.js").daytradeRouter;
let db: typeof import("../db.js").db;

function fakeRes(): Response & { statusCode?: number; body?: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(function (this: { statusCode?: number }, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: { body?: unknown }, payload: unknown) {
      this.body = payload;
      return this;
    }),
    end: vi.fn(),
  };
  return res as unknown as Response & { statusCode?: number; body?: unknown };
}

function handler(method: "get" | "post" | "delete", path: string) {
  const layer = (daytradeRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> }).stack.find(
    (entry) => entry.route?.path === path && entry.route.methods[method]
  );
  if (!layer?.route) throw new Error(`no ${method} ${path}`);
  return layer.route.stack[0].handle as (req: Request, res: Response) => Promise<unknown> | unknown;
}

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "daytrade-test-"));
  process.env.DATA_DIR = tmpDir;
  delete process.env.SEC_USER_AGENT;
  const dbMod = await import("../db.js");
  db = dbMod.db;
  service = await import("../daytrade/service.js");
  runner = await import("../daytrade/runner.js");
  ({ daytradeRouter } = await import("./daytrade.js"));
});

afterAll(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("day-trade argument guard", () => {
  it("rejects symbols and scripts that are not a single ticker or a pack file", () => {
    expect(() => service.assertTicker("AAPL;rm -rf")).toThrow(/invalid symbol/);
    expect(() => service.assertTicker("../TSLA")).toThrow(/invalid symbol/);
    expect(service.assertTicker("brk-b")).toBe("BRK-B");
    expect(() => service.assertSymbols("AAPL,MSFT,BAD TICKER")).toThrow(/invalid symbol/);
    expect(() =>
      service.assertSymbols(Array.from({ length: 25 }, (_, i) => `A${String.fromCharCode(65 + i)}`).join(","))
    ).toThrow(/too many symbols/);
    expect(() => runner.resolveScript("trader-exit/../../etc/passwd")).toThrow(/script not allowed/);
    expect(() => runner.resolveScript("trader-broker/ticket.py && touch /tmp/x")).toThrow(/script not allowed/);
  });

  it("requires an SEC user-agent before any SEC tool runs", () => {
    expect(() => service.requireSecUserAgent()).toThrow(/SEC_USER_AGENT/);
  });
});

describe("day-trade routes reject bad input before calling Python", () => {
  it("refuses a paper ticket without an explicit confirmation", async () => {
    const res = fakeRes();
    await handler("post", "/paper")({ body: { symbol: "AAPL", budget: 5000, maxLoss: 50, confirm: false } } as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "explicit confirmation required" });
    const count = db.prepare("SELECT COUNT(*) AS n FROM paper_trades").get() as { n: number };
    expect(count.n).toBe(0);
  });

  it("rejects a scan list and an analyst request that would otherwise hit the network", async () => {
    const scan = fakeRes();
    await handler("get", "/scan")({ query: { symbols: "AAPL;curl" } } as unknown as Request, scan);
    expect(scan.status).toHaveBeenCalledWith(400);

    const analyst = fakeRes();
    await handler("get", "/analyst/:symbol")({ params: { symbol: "AAPL" } } as unknown as Request, analyst);
    expect(analyst.status).toHaveBeenCalledWith(400);
    expect(analyst.json).toHaveBeenCalledWith({
      error: "SEC_USER_AGENT is required (Name email@example.com).",
    });
  });
});

describe("vendored pack, offline", () => {
  it("plans the TSLA opening-range example and blocks the same order outside the entry window", async () => {
    const plan = await runner.toolJson<service.Plan>("trader-exit/exit.py", [
      "plan",
      "--symbol",
      "TSLA",
      "--entry",
      "364.18",
      "--or-high",
      "362.18",
      "--or-low",
      "354.47",
      "--date",
      "2026-10-19",
      "--time",
      "10:15 AM",
      "--setup",
      "orb",
      "--stop",
      "or-mid",
      "--target",
      "1R",
      "--json",
    ]);
    expect(plan.stop).toBe(358.32);
    expect(plan.target).toBe(370.04);
    expect(plan.risk_per_share).toBe(5.86);
    expect(plan.reward_risk).toBe(1);

    const session = {
      symbol: "TSLA",
      replay: true,
      asOf: "2026-10-19 10:15",
      clock: { now_new_york: "2026-10-19 10:15", date: "2026-10-19", weekday: "Monday", open: true, reason: "regular session" },
      entry: {
        symbol: "TSLA",
        date: "2026-10-19",
        status: "triggered",
        phase: "open",
        reason: "",
        opening_range: { high: 362.18, low: 354.47, minutes: 15, complete: true },
        level: 362.18,
        trigger: { time: "10:15 AM", price: 364.18 },
        last: null,
      },
      plan,
      plannedAhead: false,
      reason: "ok" as const,
    };

    const sized = (await service.sizeAndRisk(session, 5000, 50)) as {
      verdict: string;
      sizing: { qty: number; max_loss: number; cost: number };
    };
    expect(sized.verdict).toBe("PASS");
    expect(sized.sizing.qty).toBe(8);
    expect(sized.sizing.max_loss).toBe(46.88);
    expect(sized.sizing.cost).toBe(2913.44);

    const tooEarly = {
      ...session,
      plan: { ...plan, entry_time: "8:00 AM" },
    };
    const blocked = (await service.sizeAndRisk(tooEarly, 5000, 50)) as {
      verdict: string;
      reasonCodes: string[];
    };
    expect(blocked.verdict).toBe("BLOCK");
    expect(blocked.reasonCodes).toContain("window");

    const refused = (await service.sizeAndRisk(session, 5000, 1)) as { verdict: string; reasonCodes: string[] };
    expect(refused.verdict).toBe("BLOCK");
    expect(refused.reasonCodes).toContain("refused");

    const count = db.prepare("SELECT COUNT(*) AS n FROM paper_trades").get() as { n: number };
    expect(count.n).toBe(0);
  }, 30_000);

  it("replays 10,000 sessions from the vendored TSLA fixture", async () => {
    const fixture = join(runner.packRoot(), "tests/fixtures/trader-timemachine/TSLA-60d5m.json.gz");
    const session = {
      symbol: "TSLA",
      replay: true,
      asOf: null,
      clock: { now_new_york: "2026-10-19 10:15", date: "2026-10-19", weekday: "Monday", open: true, reason: "regular session" },
      entry: {
        symbol: "TSLA",
        date: "2026-10-19",
        status: "triggered",
        phase: "open",
        reason: "",
        opening_range: { high: 362.18, low: 354.47, minutes: 15 },
        level: 362.18,
        trigger: { time: "10:15 AM", price: 364.18 },
        last: null,
      },
      plan: {
        symbol: "TSLA",
        side: "buy",
        date: "2026-10-19",
        setup: "orb",
        entry: 364.18,
        entry_time: "10:15 AM",
        stop: 358.32,
        stop_rule: "or_mid",
        stop_label: "opening-range midpoint",
        target: 370.04,
        target_r: 1,
        target_label: "1R",
        risk_per_share: 5.86,
        reward_risk: 1,
        flat_by: "15:55",
        opening_range: { high: 362.18, low: 354.47, minutes: 15 },
      },
      plannedAhead: false,
      reason: "ok" as const,
    };
    const out = (await service.simulate(session, { offline: fixture, replays: 10_000 })) as {
      verdictKey: string;
      timemachine: { mc: { p_target: number; p_stop: number; p_neither: number }; history: { triggered: number; target: number; stop: number; close: number } };
    };
    expect(out.verdictKey).toBe("coinFlip");
    expect(out.timemachine.mc.p_target).toBe(0.2938);
    expect(out.timemachine.mc.p_stop).toBe(0.2548);
    expect(out.timemachine.mc.p_neither).toBe(0.4514);
    expect(out.timemachine.history.triggered).toBe(33);
    expect(out.timemachine.history.target).toBe(13);
    expect(out.timemachine.history.stop).toBe(15);
    expect(out.timemachine.history.close).toBe(5);
  }, 60_000);
});

describe("paper journal", () => {
  it("only stores rows marked SIMULATED", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO paper_trades
            (symbol, quantity, entry, stop, target, session_date, verdict, status, ticket_json)
           VALUES ('AAPL', 1, 100, 90, 110, '2026-10-19', 'PASS', 'LIVE', '{}')`
        )
        .run()
    ).toThrow(/CHECK constraint failed/i);

    const info = db
      .prepare(
        `INSERT INTO paper_trades
          (symbol, quantity, entry, stop, target, session_date, replay, verdict, status, ticket_json)
         VALUES ('AAPL', 1, 100, 90, 110, '2026-10-19', 1, 'PASS', 'SIMULATED', '{"sentToBroker":false}')`
      )
      .run();
    const row = db.prepare("SELECT status, ticket_json FROM paper_trades WHERE id = ?").get(info.lastInsertRowid) as {
      status: string;
      ticket_json: string;
    };
    expect(row.status).toBe("SIMULATED");
    expect(JSON.parse(row.ticket_json).sentToBroker).toBe(false);
  });
});
