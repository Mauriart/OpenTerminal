import { describe, expect, it } from "vitest";
import type { Candle, Quote } from "./yahoo.js";
import {
  expectedQuoteSession,
  normalizeCandles,
  overlayLatestClose,
  parseNasdaqTradeDate,
  preferLatest,
  quoteIsBehind,
  seriesTradingDate,
} from "./candles.js";
import { orderedCandles, preferLatestClose } from "../../../web/lib/candles.js";
import { layoutsEqual, mergeLayout, nextLayoutItem } from "../../../web/lib/layout.js";

const nov17 = Date.parse("2026-11-17T00:00:00Z") / 1000;
const nov18 = Date.parse("2026-11-18T00:00:00Z") / 1000;

function bar(time: number, close: number): Candle {
  return { time, open: close, high: close, low: close, close, volume: 1 };
}

const quote = (price: number): Quote => ({
  symbol: "NVDA",
  name: "NVIDIA",
  price,
  change: null,
  changePercent: null,
  open: null,
  high: null,
  low: null,
  previousClose: null,
  bid: null,
  ask: null,
  volume: null,
  avgVolume: null,
  marketCap: null,
  pe: null,
  eps: null,
  dividendYield: null,
  week52High: null,
  week52Low: null,
  beta: null,
  sharesOutstanding: null,
  currency: "USD",
  exchange: "NASDAQ",
  marketState: "Closed",
  time: null,
  source: "nasdaq",
});

describe("session dating while the cash market is closed", () => {
  it("expects the Nov 18 session before the Nov 19 open", () => {
    expect(expectedQuoteSession(new Date("2026-11-19T07:04:00Z"))).toBe("2026-11-18");
  });

  it("expects today's session after the close and during the day", () => {
    expect(expectedQuoteSession(new Date("2026-11-18T21:30:00Z"))).toBe("2026-11-18");
    expect(expectedQuoteSession(new Date("2026-11-18T15:00:00Z"))).toBe("2026-11-18");
  });

  it("parses Nasdaq's last-trade stamp and flags the previous session", () => {
    expect(parseNasdaqTradeDate("Nov 17, 2026")).toBe("2026-11-17");
    expect(quoteIsBehind("2026-11-17", "2026-11-18")).toBe(true);
    expect(quoteIsBehind("2026-11-18", "2026-11-18")).toBe(false);
    expect(quoteIsBehind(null, "2026-11-18")).toBe(false);
  });
});

describe("history last close", () => {
  const older = [bar(nov17, 155.46)];
  const latest = [bar(nov17, 155.46), bar(nov18, 150.96)];

  it("labels the UTC-midnight daily bar as that session", () => {
    expect(seriesTradingDate(normalizeCandles(latest))).toBe("2026-11-18");
  });

  it("does not let a Nov 17 refresh replace the Nov 18 close", () => {
    const kept = preferLatest(latest, older);
    expect(kept[kept.length - 1].close).toBe(150.96);
    expect(kept.map((c) => c.close)).toEqual([155.46, 150.96]);
  });

  it("upgrades to the Nov 18 close when a provider finally has it", () => {
    const kept = preferLatest(older, [...latest].reverse());
    expect(kept[kept.length - 1].close).toBe(150.96);
    expect(kept[0].time).toBe(nov17);
  });

  it("keeps an intraday series once it already shows that close", () => {
    const intraday = [bar(Date.parse("2026-11-18T20:45:00Z") / 1000, 155.46), bar(Date.parse("2026-11-18T21:00:00Z") / 1000, 150.96)];
    const daily = latest;
    const kept = preferLatest(intraday, daily);
    expect(kept[kept.length - 1].close).toBe(150.96);
    expect(kept).toHaveLength(2);
    expect(kept[1].time).toBe(intraday[1].time);
  });
});

describe("quote overlay", () => {
  it("replaces a stale last sale with the latest candle close", () => {
    const fixed = overlayLatestClose(quote(155.46), [bar(nov17, 155.46), bar(nov18, 150.96)], "2026-11-18");
    expect(fixed?.price).toBe(150.96);
    expect(fixed?.previousClose).toBe(155.46);
    expect(fixed?.change).toBeCloseTo(150.96 - 155.46);
    expect(fixed?.source).toBe("nasdaq-chart");
    expect(fixed?.time).toBe(nov18);
  });

  it("refuses candles that are also a session behind", () => {
    expect(overlayLatestClose(quote(155.46), [bar(nov17, 155.46)], "2026-11-18")).toBeNull();
  });
});

describe("chart client guard", () => {
  const latest = [bar(nov17, 155.46), bar(nov18, 150.96)];
  const older = [bar(nov17, 155.46)];

  it("keeps the newer close when a refetch ends on the previous session", () => {
    const kept = preferLatestClose(latest, older);
    expect(kept[kept.length - 1].close).toBe(150.96);
    expect(kept).toBe(latest);
  });

  it("orders a reversed payload so the overlay reads the latest close", () => {
    const ordered = orderedCandles([...latest].reverse());
    expect(ordered[ordered.length - 1].close).toBe(150.96);
  });

  it("returns the same array when the refetch is unchanged", () => {
    expect(preferLatestClose(latest, latest.map((c) => ({ ...c })))).toBe(latest);
  });
});

describe("panel layout", () => {
  it("places the next panel under the lowest one", () => {
    const scan = { i: "scan", x: 0, y: 19, w: 7, h: 12 };
    expect(nextLayoutItem([scan], "plan", { w: 5, h: 12 })).toEqual({ i: "plan", x: 0, y: 31, w: 5, h: 12 });
  });

  it("keeps a panel a stale grid callback dropped", () => {
    const current = [
      { i: "chart", x: 0, y: 0, w: 7, h: 12 },
      { i: "scan", x: 0, y: 19, w: 7, h: 12 },
      { i: "plan", x: 0, y: 31, w: 5, h: 12 },
    ];
    const fromGrid = current.slice(0, 2);
    const merged = mergeLayout(current, fromGrid, ["chart", "scan", "plan"]);
    expect(merged.map((item) => item.i)).toEqual(["chart", "scan", "plan"]);
    expect(layoutsEqual(merged, current)).toBe(true);
  });
});
