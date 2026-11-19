import { Router } from "express";
import { z } from "zod";
import { DaytradeError } from "../daytrade/runner.js";
import {
  addAlert,
  analyst,
  assertMoney,
  assertSymbols,
  assertTargetR,
  assertTicker,
  checkAlerts,
  congressFiling,
  congressIndex,
  deletePaper,
  headlines,
  listAlerts,
  listPaper,
  loadSession,
  marketClock,
  recordPaper,
  removeAlert,
  scanMarket,
  simulate,
  sizeAndRisk,
  type Plan,
} from "../daytrade/service.js";

export const daytradeRouter = Router();

function fail(res: { status: (code: number) => { json: (body: unknown) => unknown } }, err: unknown) {
  if (err instanceof DaytradeError) {
    return res.status(err.status).json({ error: err.message, ...(err.detail ? { detail: err.detail } : {}) });
  }
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") return res.status(503).json({ error: "python3 is required for the day-trade pack" });
  console.error(err);
  return res.status(500).json({ error: "daytrade tool failed" });
}

const planSchema = z.object({
  symbol: z.string(),
  side: z.string().optional(),
  date: z.string(),
  setup: z.string().optional(),
  entry: z.number().positive(),
  entry_time: z.string().nullable().optional(),
  stop: z.number().positive(),
  stop_rule: z.string().optional(),
  stop_label: z.string().optional(),
  target: z.number().positive(),
  target_r: z.number().positive(),
  target_label: z.string().optional(),
  risk_per_share: z.number().nonnegative(),
  reward_risk: z.number().nonnegative(),
  flat_by: z.string(),
  opening_range: z
    .object({ high: z.number(), low: z.number(), minutes: z.number().int().positive() })
    .nullable()
    .optional(),
});

daytradeRouter.get("/clock", async (_req, res) => {
  try {
    res.json(await marketClock());
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/scan", async (req, res) => {
  try {
    const mode = req.query.mode === "orb" ? "orb" : req.query.mode === "daily" || req.query.mode == null ? "daily" : null;
    if (!mode) return res.status(400).json({ error: "invalid scan mode" });
    const symbols = assertSymbols(req.query.symbols);
    res.json(await scanMarket(mode, symbols));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/news/:symbol", async (req, res) => {
  try {
    res.json(await headlines(assertTicker(req.params.symbol)));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.post("/plan", async (req, res) => {
  try {
    const symbol = assertTicker(req.body?.symbol);
    const targetR = assertTargetR(req.body?.targetR);
    res.json(await loadSession(symbol, targetR, Boolean(req.body?.fresh)));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.post("/timemachine", async (req, res) => {
  try {
    const symbol = assertTicker(req.body?.symbol);
    const targetR = assertTargetR(req.body?.targetR);
    const session = await loadSession(symbol, targetR, Boolean(req.body?.fresh));
    res.json(await simulate(session));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.post("/size", async (req, res) => {
  try {
    const symbol = assertTicker(req.body?.symbol);
    const budget = assertMoney(req.body?.budget, "budget", 10, 1_000_000_000);
    const maxLoss = assertMoney(req.body?.maxLoss, "max loss", 1, budget);
    const targetR = assertTargetR(req.body?.targetR);
    const session = await loadSession(symbol, targetR, Boolean(req.body?.fresh));
    res.json(await sizeAndRisk(session, budget, maxLoss));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/paper", (_req, res) => {
  try {
    res.json(listPaper());
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.post("/paper", async (req, res) => {
  try {
    if (req.body?.confirm !== true) return res.status(400).json({ error: "explicit confirmation required" });
    const symbol = assertTicker(req.body?.symbol);
    const budget = assertMoney(req.body?.budget, "budget", 10, 1_000_000_000);
    const maxLoss = assertMoney(req.body?.maxLoss, "max loss", 1, budget);
    const targetR = assertTargetR(req.body?.targetR);
    const row = await recordPaper(symbol, budget, maxLoss, targetR);
    res.status(201).json(row);
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.delete("/paper/:id", (req, res) => {
  try {
    deletePaper(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/alerts", async (_req, res) => {
  try {
    res.json(await listAlerts());
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.post("/alerts", async (req, res) => {
  try {
    const kind = z.enum(["above", "below", "stop", "target", "pct", "opening-bell", "at", "from-plan"]).parse(req.body?.kind);
    let plan: Plan | undefined;
    if (kind === "from-plan") {
      const parsed = planSchema.parse(req.body?.plan);
      plan = {
        symbol: assertTicker(parsed.symbol),
        side: "buy",
        date: parsed.date,
        setup: parsed.setup ?? "orb",
        entry: parsed.entry,
        entry_time: parsed.entry_time ?? null,
        stop: parsed.stop,
        stop_rule: parsed.stop_rule ?? "or_mid",
        stop_label: parsed.stop_label ?? "",
        target: parsed.target,
        target_r: parsed.target_r,
        target_label: parsed.target_label ?? "",
        risk_per_share: parsed.risk_per_share,
        reward_risk: parsed.reward_risk,
        flat_by: parsed.flat_by,
        opening_range: parsed.opening_range ?? null,
      };
    }
    res.status(201).json(
      await addAlert({
        kind,
        symbol: req.body?.symbol,
        price: req.body?.price,
        at: req.body?.at,
        plan,
      })
    );
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "invalid alert" });
    fail(res, err);
  }
});

daytradeRouter.post("/alerts/check", async (_req, res) => {
  try {
    res.json(await checkAlerts());
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.delete("/alerts/:id", async (req, res) => {
  try {
    res.json(await removeAlert(req.params.id));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/analyst/:symbol", async (req, res) => {
  try {
    res.json(await analyst(assertTicker(req.params.symbol)));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/congress", async (req, res) => {
  try {
    const member = typeof req.query.member === "string" && req.query.member.trim() ? req.query.member.trim() : "Pelosi";
    const year = req.query.year == null ? new Date().getFullYear() : Number(req.query.year);
    res.json(await congressIndex(member, year));
  } catch (err) {
    fail(res, err);
  }
});

daytradeRouter.get("/congress/:docId", async (req, res) => {
  try {
    const year = req.query.year == null ? new Date().getFullYear() : Number(req.query.year);
    const filed = typeof req.query.filed === "string" ? req.query.filed : undefined;
    res.json(await congressFiling(req.params.docId, year, filed));
  } catch (err) {
    fail(res, err);
  }
});
