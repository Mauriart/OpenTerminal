import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { db } from "../db.js";
import { DaytradeError, clip, toolJson } from "./runner.js";

const TICKER = /^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/;
const MEMBER = /^[A-Za-z][A-Za-z .'-]{0,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ALERT_ID = /^[a-z0-9][a-z0-9._-]{0,80}$/;
const DOC_ID = /^\d{1,12}$/;

export const DEFAULT_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD", "AVGO", "JPM", "SPY", "QQQ",
];

const SEC_UA = /^.{2,80}\s+\S+@\S+\.\S+$/;

export function secUserAgent(): string | null {
  const ua = process.env.SEC_USER_AGENT?.trim() ?? "";
  return SEC_UA.test(ua) ? ua : null;
}

export function requireSecUserAgent(): string {
  const ua = secUserAgent();
  if (!ua) throw new DaytradeError(400, "SEC_USER_AGENT is required (Name email@example.com).");
  return ua;
}

export function assertTicker(raw: unknown): string {
  if (typeof raw !== "string") throw new DaytradeError(400, "invalid symbol");
  const symbol = raw.trim().toUpperCase();
  if (!TICKER.test(symbol)) throw new DaytradeError(400, "invalid symbol");
  return symbol;
}

export function assertSymbols(raw: unknown, fallback = DEFAULT_SYMBOLS): string[] {
  const source = raw == null || raw === "" ? fallback : String(raw).split(",");
  const out: string[] = [];
  for (const part of source) {
    const symbol = assertTicker(part);
    if (!out.includes(symbol)) out.push(symbol);
  }
  if (out.length === 0) throw new DaytradeError(400, "invalid symbol");
  if (out.length > 24) throw new DaytradeError(400, "too many symbols");
  return out;
}

export function assertTargetR(value: unknown): 1 | 2 {
  if (value === undefined || value === null || value === "") return 1;
  if (value === 1 || value === 2 || value === "1" || value === "2") return Number(value) as 1 | 2;
  throw new DaytradeError(400, "invalid target R");
}

export function assertMoney(value: unknown, label: string, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) throw new DaytradeError(400, `invalid ${label}`);
  return Math.round(n * 100) / 100;
}

export function previousWeekdays(iso: string, count: number): string[] {
  if (!DATE.test(iso)) return [];
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const out: string[] = [];
  for (let i = 0; i < 16 && out.length < count; i++) {
    dt.setUTCDate(dt.getUTCDate() - 1);
    const wd = dt.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

export function verdictKey(verdict: string): string {
  if (verdict.startsWith("Close to a coin flip")) return "coinFlip";
  if (verdict.startsWith("Close to break-even")) return "breakEven";
  if (verdict.startsWith("Leans toward the target")) return "leanTarget";
  if (verdict.startsWith("Leans toward the stop")) return "leanStop";
  if (verdict.startsWith("Strongly toward the target")) return "strongTarget";
  if (verdict.startsWith("Strongly toward the stop")) return "strongStop";
  if (verdict.startsWith("No replay reached")) return "none";
  return "other";
}

export function classifyReason(reason: string): string {
  if (reason.startsWith("window:")) return "window";
  if (reason.startsWith("loss:")) return "loss";
  if (reason.startsWith("daily loss:")) return "dailyLoss";
  if (reason.startsWith("reward:risk")) return "reward";
  if (reason.startsWith("cash:")) return "cash";
  if (reason.startsWith("stop:")) return "stop";
  if (reason.startsWith("size:")) return "size";
  if (reason.startsWith("trades:") || reason.startsWith("daily limit")) return "pace";
  if (reason.startsWith("position:")) return "position";
  if (reason.startsWith("short:")) return "short";
  if (reason.startsWith("duplicate:")) return "duplicate";
  if (reason.startsWith("target:")) return "target";
  if (reason.startsWith("pdt:")) return "pdt";
  if (reason.startsWith("format:") || reason.startsWith("asset:") || reason.startsWith("blocked:")) return "format";
  return "other";
}

type Clock = {
  now_new_york: string;
  date: string;
  weekday: string;
  open: boolean;
  reason: string;
  opens?: string;
  closes?: string;
  next_open?: string;
};

type OpeningRange = { high: number; low: number; minutes: number; complete?: boolean };
type EntryResult = {
  symbol: string;
  date: string;
  status: string;
  phase: string;
  reason: string;
  opening_range: OpeningRange | null;
  level: number | null;
  trigger: { time?: string; price?: number; bar_start?: string; pct_over?: number } | null;
  last: { bar_start?: string; close?: number; vs_level_pct?: number } | null;
  now?: string;
};

export type Plan = {
  symbol: string;
  side: string;
  date: string;
  setup: string;
  entry: number;
  entry_time: string | null;
  stop: number;
  stop_rule: string;
  stop_label: string;
  target: number;
  target_r: number;
  target_label: string;
  risk_per_share: number;
  reward_risk: number;
  flat_by: string;
  opening_range: OpeningRange | null;
  warnings?: string[];
  note?: string;
};

export type Session = {
  symbol: string;
  replay: boolean;
  asOf: string | null;
  clock: Clock;
  entry: EntryResult;
  plan: Plan | null;
  plannedAhead: boolean;
  reason: "ok" | "no-setup" | "no-session";
};

const sessionCache = new Map<string, { exp: number; value: Session }>();

async function withTemp<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "dt-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function marketClock(): Promise<Clock> {
  return toolJson<Clock>("trader-alerts/alerts.py", ["clock", "--json"], { timeoutMs: 15_000 });
}

function num(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}

function barCloseAmPm(barStart: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(barStart);
  if (!match) return null;
  let hour = Number(match[1]);
  let minute = Number(match[2]) + 5;
  if (minute >= 60) {
    hour += 1;
    minute -= 60;
  }
  if (hour > 23) return null;
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function to24(ampm: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(ampm.trim());
  if (!match) return "10:15";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

async function checkEntry(symbol: string, now: string | null): Promise<EntryResult> {
  const args = ["check", symbol, "--setup", "orb", "--or-minutes", "15", "--interval", "5m", "--json"];
  if (now) args.push("--now", now);
  return toolJson<EntryResult>("trader-entry/entry.py", args, { timeoutMs: 30_000 });
}

function needsReplay(entry: EntryResult): boolean {
  return (
    entry.status === "no-data" ||
    entry.phase === "pre-open" ||
    entry.phase === "closed" ||
    entry.phase === "forming" ||
    !entry.opening_range
  );
}

async function buildPlan(entry: EntryResult, targetR: 1 | 2): Promise<{ plan: Plan; plannedAhead: boolean } | null> {
  const range = entry.opening_range;
  if (!range) return null;
  let price: number | null = null;
  let time: string | null = null;
  let plannedAhead = false;
  if (entry.status === "triggered" && entry.trigger?.price && entry.trigger.time) {
    price = entry.trigger.price;
    time = entry.trigger.time;
  } else if (entry.last?.close && entry.last.bar_start && entry.last.close > (range.high + range.low) / 2) {
    price = entry.last.close;
    time = barCloseAmPm(entry.last.bar_start);
    plannedAhead = true;
  }
  if (price == null || !time) return null;
  const plan = await toolJson<Plan>("trader-exit/exit.py", [
    "plan",
    "--symbol",
    entry.symbol,
    "--entry",
    num(price),
    "--or-high",
    num(range.high),
    "--or-low",
    num(range.low),
    "--or-minutes",
    String(range.minutes || 15),
    "--date",
    entry.date,
    "--time",
    time,
    "--setup",
    "orb",
    "--stop",
    "or-mid",
    "--target",
    `${targetR}R`,
    "--json",
  ], { timeoutMs: 20_000 });
  return { plan, plannedAhead };
}

export async function loadSession(symbol: string, targetR: 1 | 2, fresh = false): Promise<Session> {
  const key = `${symbol}|${targetR}`;
  const hit = sessionCache.get(key);
  if (!fresh && hit && hit.exp > Date.now()) return hit.value;

  const clock = await marketClock();
  let entry = await checkEntry(symbol, null);
  let replay = false;
  let asOf: string | null = null;
  if (needsReplay(entry)) {
    let found = false;
    for (const day of previousWeekdays(clock.date, 6)) {
      try {
        const past = await checkEntry(symbol, `${day} 16:05`);
        if (past.opening_range?.complete) {
          entry = past;
          replay = true;
          asOf = `${day} 16:05`;
          found = true;
          break;
        }
      } catch {
        // A holiday or a gap in the free 5-minute history: try the day before.
      }
    }
    if (!found) {
      const value: Session = {
        symbol,
        replay: false,
        asOf: null,
        clock,
        entry,
        plan: null,
        plannedAhead: false,
        reason: "no-session",
      };
      sessionCache.set(key, { exp: Date.now() + 45_000, value });
      return value;
    }
  }

  let plan: Plan | null = null;
  let plannedAhead = false;
  let reason: Session["reason"] = "no-setup";
  if (entry.opening_range?.complete) {
    try {
      const built = await buildPlan(entry, targetR);
      if (built) {
        plan = built.plan;
        plannedAhead = built.plannedAhead;
        reason = "ok";
      }
    } catch (err) {
      if (!(err instanceof DaytradeError)) throw err;
      reason = "no-setup";
    }
  } else if (replay && !entry.opening_range) {
    reason = "no-session";
  }

  const value: Session = { symbol, replay, asOf, clock, entry, plan, plannedAhead, reason };
  sessionCache.set(key, { exp: Date.now() + 45_000, value });
  return value;
}

type ScanDoc = {
  mode: string;
  as_of: string | null;
  universe: number;
  scanned: number;
  failed: number;
  hits: Array<Record<string, unknown>>;
  note?: string;
  counts?: Record<string, number>;
};

const scanCache = new Map<string, { exp: number; value: unknown }>();

export async function scanMarket(mode: "daily" | "orb", symbols: string[]): Promise<unknown> {
  const key = `${mode}|${symbols.join(",")}`;
  const hit = scanCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  const args = [
    mode,
    "--symbols",
    symbols.join(","),
    "--json",
    "--no-write",
    "--quiet",
    "--pause",
    "0.15",
    "--show",
    "24",
  ];
  let replay = false;
  let asOf: string | null = null;
  if (mode === "orb") {
    const clock = await marketClock();
    const hm = clock.now_new_york.slice(11, 16);
    const live = clock.open && hm >= "09:50" && hm <= "15:30";
    args.push("--max-confirm", String(symbols.length));
    if (!live) {
      const sessionStarted = clock.reason === "after the close" || (clock.open && hm > "15:30");
      const days = sessionStarted ? [clock.date, ...previousWeekdays(clock.date, 5)] : previousWeekdays(clock.date, 6);
      let lastDetail = "";
      for (const day of days) {
        const stamp = `${day} 10:15`;
        try {
          const doc = await toolJson<ScanDoc>("trader-scanner/scan.py", [...args, "--now", stamp, "--at", "10:15"], {
            timeoutMs: 90_000,
          });
          const value = { ...doc, replay: true, asOf: stamp, live: false };
          scanCache.set(key, { exp: Date.now() + 120_000, value });
          return value;
        } catch (err) {
          lastDetail = err instanceof DaytradeError ? err.detail ?? err.message : String(err);
        }
      }
      throw new DaytradeError(502, "daytrade tool failed", clip(lastDetail));
    }
  }
  const doc = await toolJson<ScanDoc>("trader-scanner/scan.py", args, { timeoutMs: 90_000 });
  const value = { ...doc, replay, asOf, live: mode === "daily" || !replay };
  scanCache.set(key, { exp: Date.now() + 120_000, value });
  return value;
}

export async function headlines(symbol: string): Promise<unknown> {
  const sec = Boolean(secUserAgent());
  const args = ["--tickers", symbol, "--hours", "36", "--all", "--dry-run", "--json"];
  if (!sec) args.push("--no-sec");
  const doc = await toolJson<Record<string, unknown>>("trader-news/news.py", args, { timeoutMs: 40_000 });
  return { ...doc, secSkipped: !sec, symbol };
}

export async function simulate(session: Session, opts?: { offline?: string; replays?: number }): Promise<unknown> {
  if (!session.plan?.entry_time) {
    return { session, timemachine: null, verdictKey: null };
  }
  const plan = session.plan;
  const replays = opts?.replays ?? 10_000;
  const args = [
    "run",
    "--json",
    "--symbol",
    plan.symbol,
    "--side",
    "buy",
    "--date",
    plan.date,
    "--entry",
    num(plan.entry),
    "--stop",
    num(plan.stop),
    "--target",
    num(plan.target),
    "--entry-time",
    plan.entry_time ?? "10:15 AM",
    "--setup",
    plan.setup || "orb",
    "--or-minutes",
    String(plan.opening_range?.minutes ?? 15),
    "--stop-rule",
    plan.stop_rule || "or_mid",
    "--replays",
    String(replays),
    "--seed",
    "19",
  ];
  if (opts?.offline) args.push("--offline", opts.offline);
  const doc = await toolJson<Record<string, unknown>>("trader-timemachine/timemachine.py", args, { timeoutMs: 90_000 });
  const mc = (doc.mc ?? {}) as { sample_paths?: unknown };
  delete mc.sample_paths;
  const verdict = typeof doc.verdict === "string" ? doc.verdict : "";
  return { session, timemachine: doc, verdictKey: verdictKey(verdict) };
}

type Sizing = {
  qty: number;
  refusal: string | null;
  entry: number;
  stop: number;
  target: number;
  risk_per_share: number;
  reward_risk: number;
  max_loss: number;
  cost: number;
  budget: number;
  bound_by: string;
  flat_by?: string;
};

type RiskDoc = {
  pass: number;
  block: number;
  results: Array<{
    verdict: string;
    reasons: string[];
    warnings: string[];
    info: string[];
    max_loss: number | null;
    reward_risk: number | null;
    symbol: string;
    amount: string;
  }>;
  warnings: string[];
  now_new_york: string;
  paper: boolean;
};

function configFor(budget: number, maxLoss: number) {
  return {
    budget,
    cash_buffer_pct: 10,
    max_position_pct: 75,
    max_order_usd: budget,
    min_order_usd: 5,
    max_loss_per_trade_usd: maxLoss,
    max_daily_loss_usd: Math.round(maxLoss * 3 * 100) / 100,
    max_trades_per_day: 3,
    max_orders_per_day: 10,
    min_reward_risk: 1,
    require_stop: true,
    no_entries_before: "09:45",
    no_entries_after: "15:30",
    flat_by: "15:55",
    fractional: false,
    broker: "alpaca",
    paper: true,
    blocked: [],
    allow_options: false,
    allow_margin: false,
    allow_short: false,
    pdt_guard: false,
  };
}

function brokerState(sessionDate: string) {
  const rows = db
    .prepare(
      `SELECT symbol, max_loss, session_date, created_at FROM paper_trades WHERE session_date = ? ORDER BY id`
    )
    .all(sessionDate) as Array<{ symbol: string; max_loss: number | null; session_date: string; created_at: string }>;
  return {
    orders: rows.map((row) => ({
      status: "placed",
      date: row.session_date,
      at: row.created_at,
      symbol: row.symbol,
      side: "buy",
      kind: "entry",
      max_loss: row.max_loss,
    })),
  };
}

export async function sizeAndRisk(session: Session, budget: number, maxLoss: number): Promise<unknown> {
  if (!session.plan) {
    return { session, sizing: null, order: null, risk: null, verdict: null, reasonCodes: ["noSetup"] };
  }
  const plan = session.plan;
  const now = `${plan.date} ${to24(plan.entry_time || "10:15 AM")}`;
  return withTemp(async (dir) => {
    const planPath = join(dir, "plan.json");
    const configPath = join(dir, "config.json");
    const ordersPath = join(dir, "orders.json");
    const statePath = join(dir, "broker.json");
    await writeFile(planPath, JSON.stringify(plan));
    await writeFile(configPath, JSON.stringify(configFor(budget, maxLoss)));
    await writeFile(statePath, JSON.stringify(brokerState(plan.date)));
    const sized = await toolJson<{ sizing: Sizing; orders: Array<Record<string, unknown>>; notes: string[] }>(
      "trader-budget/size.py",
      ["--plan", planPath, "--config", configPath, "--budget", num(budget), "--now", now, "--write", ordersPath, "--json"],
      { cwd: dir, timeoutMs: 20_000 }
    );
    if (!sized.orders?.length) {
      return {
        session,
        sizing: sized.sizing,
        order: null,
        risk: null,
        notes: sized.notes,
        verdict: "BLOCK",
        reasonCodes: ["refused"],
        simulated: true,
        paper: true,
      };
    }
    const risk = await toolJson<RiskDoc>(
      "trader-risk/check.py",
      [
        "--orders",
        ordersPath,
        "--config",
        configPath,
        "--state",
        statePath,
        "--now",
        now,
        "--today",
        plan.date,
        "--no-write",
        "--json",
      ],
      { cwd: dir, timeoutMs: 20_000 }
    );
    const first = risk.results?.[0];
    const reasons = first?.reasons ?? [];
    return {
      session,
      sizing: sized.sizing,
      order: sized.orders[0],
      notes: sized.notes,
      risk: {
        ...risk,
        results: risk.results?.map((row) => ({
          ...row,
          reasonCodes: (row.reasons ?? []).map(classifyReason),
        })),
      },
      verdict: first?.verdict ?? "BLOCK",
      reasonCodes: reasons.map(classifyReason),
      simulated: true,
      paper: true,
    };
  });
}

export type PaperRow = {
  id: number;
  symbol: string;
  quantity: number;
  entry: number;
  stop: number;
  target: number;
  risk_per_share: number | null;
  reward_risk: number | null;
  max_loss: number | null;
  budget: number | null;
  session_date: string;
  replay: number;
  verdict: string;
  status: string;
  ticket_json: string;
  created_at: string;
};

export function listPaper(): PaperRow[] {
  return db.prepare("SELECT * FROM paper_trades ORDER BY id DESC LIMIT 100").all() as PaperRow[];
}

export function deletePaper(id: number): void {
  if (!Number.isInteger(id) || id <= 0) throw new DaytradeError(400, "invalid id");
  db.prepare("DELETE FROM paper_trades WHERE id = ?").run(id);
}

export async function recordPaper(symbol: string, budget: number, maxLoss: number, targetR: 1 | 2): Promise<PaperRow> {
  const session = await loadSession(symbol, targetR, true);
  const checked = (await sizeAndRisk(session, budget, maxLoss)) as {
    verdict: string | null;
    sizing: Sizing | null;
    order: Record<string, unknown> | null;
    risk: unknown;
    reasonCodes: string[];
    session: Session;
  };
  if (checked.verdict !== "PASS" || !checked.sizing || !checked.order) {
    throw new DaytradeError(409, checked.sizing?.refusal ? "size refused" : "risk blocked");
  }
  const sizing = checked.sizing;
  const ticket = {
    simulated: true,
    sentToBroker: false,
    replay: session.replay,
    sessionDate: session.plan?.date,
    symbol,
    quantity: sizing.qty,
    entry: sizing.entry,
    stop: sizing.stop,
    target: sizing.target,
    riskPerShare: sizing.risk_per_share,
    rewardRisk: sizing.reward_risk,
    maxLoss: sizing.max_loss,
    budget,
    verdict: "PASS",
    order: checked.order,
  };
  const info = db
    .prepare(
      `INSERT INTO paper_trades
        (symbol, quantity, entry, stop, target, risk_per_share, reward_risk, max_loss, budget, session_date, replay, verdict, status, ticket_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PASS', 'SIMULATED', ?)`
    )
    .run(
      symbol,
      sizing.qty,
      sizing.entry,
      sizing.stop,
      sizing.target,
      sizing.risk_per_share,
      sizing.reward_risk,
      sizing.max_loss,
      budget,
      session.plan?.date ?? session.entry.date,
      session.replay ? 1 : 0,
      JSON.stringify(ticket)
    );
  return db.prepare("SELECT * FROM paper_trades WHERE id = ?").get(info.lastInsertRowid) as PaperRow;
}

type AlertRule = { id: string; type: string; symbol?: string; price?: number; at?: string; label?: string; note?: string };

async function rulesFile(): Promise<{ rules: string; state: string }> {
  const { dataDir } = await import("../db.js");
  const { mkdir } = await import("node:fs/promises");
  const dir = join(dataDir, "daytrade");
  await mkdir(dir, { recursive: true });
  const rules = join(dir, "alerts.json");
  const state = join(dir, "alerts-state.json");
  try {
    await readFile(rules, "utf8");
  } catch {
    await writeFile(rules, JSON.stringify({ rules: [] }, null, 2));
  }
  return { rules, state };
}

export async function listAlerts(): Promise<{ rules: AlertRule[] }> {
  const { rules } = await rulesFile();
  const text = await readFile(rules, "utf8");
  const doc = JSON.parse(text) as { rules?: AlertRule[] };
  return { rules: doc.rules ?? [] };
}

export async function addAlert(input: {
  symbol?: string;
  kind: "above" | "below" | "stop" | "target" | "pct" | "opening-bell" | "at" | "from-plan";
  price?: number;
  at?: string;
  plan?: Plan;
}): Promise<{ rules: AlertRule[] }> {
  const { rules, state } = await rulesFile();
  const args = ["add", "--rules", rules, "--state", state];
  if (input.kind === "opening-bell") {
    args.push("--opening-bell");
  } else if (input.kind === "at") {
    if (!input.at || !HHMM.test(input.at)) throw new DaytradeError(400, "invalid time");
    args.push("--at", input.at, "--label", "flat by close", "--before-close");
    if (input.symbol) args.push("--symbol", assertTicker(input.symbol));
  } else   if (input.kind === "from-plan") {
    if (!input.plan?.symbol || !input.plan.stop || !input.plan.target) throw new DaytradeError(400, "no plan");
    const { runTool } = await import("./runner.js");
    await withTemp(async (dir) => {
      const planPath = join(dir, "plan.json");
      await writeFile(planPath, JSON.stringify(input.plan));
      const result = await runTool("trader-alerts/alerts.py", [...args, "--from-plan", "--plan", planPath], {
        timeoutMs: 15_000,
      });
      if (result.code !== 0) throw new DaytradeError(502, "daytrade tool failed", clip(result.stderr || result.stdout));
    });
    return listAlerts();
  } else {
    const symbol = assertTicker(input.symbol);
    if (input.price == null || !Number.isFinite(input.price) || input.price <= 0 || input.price > 1_000_000) {
      throw new DaytradeError(400, "invalid price");
    }
    const flag = input.kind === "above" ? "--above" : input.kind === "below" ? "--below" : input.kind === "stop" ? "--stop" : input.kind === "target" ? "--target" : "--pct";
    args.push("--symbol", symbol, flag, num(input.price));
  }
  const { runTool } = await import("./runner.js");
  const result = await runTool("trader-alerts/alerts.py", args, { timeoutMs: 15_000 });
  if (result.code !== 0) throw new DaytradeError(502, "daytrade tool failed", clip(result.stderr || result.stdout));
  return listAlerts();
}

export async function removeAlert(id: string): Promise<{ rules: AlertRule[] }> {
  if (!ALERT_ID.test(id)) throw new DaytradeError(400, "invalid id");
  const { rules, state } = await rulesFile();
  const doc = JSON.parse(await readFile(rules, "utf8")) as { rules: AlertRule[] };
  doc.rules = (doc.rules ?? []).filter((rule) => rule.id !== id);
  await writeFile(rules, JSON.stringify(doc, null, 2));
  try {
    const st = JSON.parse(await readFile(state, "utf8")) as { rung?: Record<string, string> };
    if (st.rung) {
      delete st.rung[id];
      await writeFile(state, JSON.stringify(st, null, 2));
    }
  } catch {
    // No state file yet.
  }
  return { rules: doc.rules };
}

export async function checkAlerts(): Promise<unknown> {
  const { rules, state } = await rulesFile();
  const doc = JSON.parse(await readFile(rules, "utf8")) as { rules?: unknown[] };
  if (!doc.rules?.length) return { market: await marketClock(), rings: [], quotes: {}, errors: [], rules: [] };
  const { runTool } = await import("./runner.js");
  const result = await runTool(
    "trader-alerts/alerts.py",
    ["check", "--rules", rules, "--state", state, "--prices-out", join(dirname(rules), "prices.json"), "--json"],
    { timeoutMs: 40_000 }
  );
  if (!result.json) throw new DaytradeError(502, "daytrade tool failed", clip(result.stderr || result.stdout));
  return result.json;
}

export async function analyst(symbol: string): Promise<unknown> {
  requireSecUserAgent();
  const rows = await toolJson<unknown[]>("trader-analyst/facts.py", [symbol, "--quarters", "6", "--json"], {
    timeoutMs: 40_000,
  });
  return { symbol, companies: rows };
}

export async function congressIndex(member: string, year: number): Promise<unknown> {
  if (!MEMBER.test(member)) throw new DaytradeError(400, "invalid member");
  if (!Number.isInteger(year) || year < 2012 || year > 2100) throw new DaytradeError(400, "invalid year");
  const rows = await toolJson<unknown[]>("trader-pelosi/ptr.py", [
    "index",
    "--member",
    member,
    "--year",
    String(year),
    "--limit",
    "40",
    "--json",
  ], { timeoutMs: 40_000 });
  return { member, year, filings: Array.isArray(rows) ? rows : [] };
}

export async function congressFiling(docId: string, year: number, filed?: string): Promise<unknown> {
  if (!DOC_ID.test(docId)) throw new DaytradeError(400, "invalid id");
  if (!Number.isInteger(year) || year < 2012 || year > 2100) throw new DaytradeError(400, "invalid year");
  if (filed && !DATE.test(filed)) throw new DaytradeError(400, "invalid date");
  return withTemp(async (dir) => {
    const args = ["fetch", docId, "--year", String(year), "--pdf-dir", dir, "--json"];
    if (filed) args.push("--filed", filed);
    const { runTool } = await import("./runner.js");
    const result = await runTool("trader-pelosi/ptr.py", args, { cwd: dir, timeoutMs: 40_000 });
    if (result.json && typeof result.json === "object") return { docId, year, report: result.json, parsed: true };
    const missingPdf =
      /pdftotext/i.test(result.stdout + result.stderr) || result.stdout.toLowerCase().includes("saved");
    if (missingPdf) {
      return {
        docId,
        year,
        report: null,
        parsed: false,
        detail: "pdftotext is not installed; the public PDF is linked from the index.",
      };
    }
    throw new DaytradeError(502, "daytrade tool failed", clip(result.stderr || result.stdout));
  });
}
