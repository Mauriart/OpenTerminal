import type { Candle, Quote } from "./yahoo.js";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Nasdaq stamps `lastTradeTimestamp` like "Nov 17, 2026". */
export function parseNasdaqTradeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  const day = Number(match[2]);
  if (!month || day < 1 || day > 31) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nyParts(now: Date): { date: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) bag[part.type] = part.value;
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    date: `${bag.year}-${bag.month}-${bag.day}`,
    minutes: hour * 60 + Number(bag.minute),
  };
}

function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function previousWeekday(iso: string): string {
  let date = addCalendarDays(iso, -1);
  while (weekdayIndex(date) === 0 || weekdayIndex(date) === 6) date = addCalendarDays(date, -1);
  return date;
}

/**
 * Session date a quote's last sale should belong to.
 * Before the cash open (and on weekends) that is the previous completed
 * session; once the bell has rung it is today's date in New York.
 */
export function expectedQuoteSession(now = new Date()): string {
  const { date, minutes } = nyParts(now);
  const open = 9 * 60 + 30;
  if (weekdayIndex(date) === 0 || weekdayIndex(date) === 6 || minutes < open) return previousWeekday(date);
  return date;
}

export function quoteIsBehind(tradeDate: string | null, expectedSession: string): boolean {
  return tradeDate !== null && tradeDate < expectedSession;
}

export function normalizeCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const candle of candles) {
    if (![candle.time, candle.open, candle.high, candle.low, candle.close].every((n) => typeof n === "number" && Number.isFinite(n))) {
      continue;
    }
    byTime.set(candle.time, candle);
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function isDailySeries(candles: Candle[]): boolean {
  if (candles.length < 2) {
    const time = candles[0]?.time ?? 0;
    return time % 86400 === 0;
  }
  const gaps: number[] = [];
  for (let i = 1; i < candles.length; i++) gaps.push(candles[i].time - candles[i - 1].time);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] >= 20 * 60 * 60;
}

function nyDate(ms: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(ms));
}

/** Trading date stamped on a bar. Daily feeds use UTC midnight of that session. */
export function barTradingDate(timeSec: number, daily: boolean): string {
  if (daily) return new Date(timeSec * 1000).toISOString().slice(0, 10);
  return nyDate(timeSec * 1000);
}

export function seriesTradingDate(candles: Candle[]): string {
  if (candles.length === 0) return "";
  const daily = isDailySeries(candles);
  return barTradingDate(candles[candles.length - 1].time, daily);
}

function previousSessionClose(series: Candle[]): number | null {
  const daily = isDailySeries(series);
  const lastDate = barTradingDate(series[series.length - 1].time, daily);
  for (let i = series.length - 2; i >= 0; i--) {
    if (barTradingDate(series[i].time, daily) < lastDate) return series[i].close;
  }
  return null;
}

/**
 * Keep the series that reaches the later session. A refresh that only has the
 * previous close (155.46 on Nov 17) must not replace the latest close
 * (150.96 on Nov 18). Same session: keep the series we already show unless
 * the new one extends it, so daily and intraday feeds don't swap the chart.
 */
export function preferLatest(previous: Candle[] | null, incoming: Candle[]): Candle[] {
  const next = normalizeCandles(incoming);
  const prev = previous ? normalizeCandles(previous) : [];
  if (prev.length === 0) return next;
  if (next.length === 0) return prev;
  const prevDate = seriesTradingDate(prev);
  const nextDate = seriesTradingDate(next);
  if (nextDate > prevDate) return next;
  if (nextDate < prevDate) return prev;
  const prevLast = prev[prev.length - 1];
  const nextLast = next[next.length - 1];
  if (nextLast.time > prevLast.time) return next;
  if (nextLast.time === prevLast.time && nextLast.close !== prevLast.close) return next;
  return prev;
}

/**
 * When a quote's last sale is an older session than `expectedSession`, replace
 * it with the newest candle close. Returns null if the candles are stale too.
 */
export function overlayLatestClose(quote: Quote, candles: Candle[], expectedSession: string): Quote | null {
  const series = normalizeCandles(candles);
  if (series.length === 0 || seriesTradingDate(series) < expectedSession) return null;
  const last = series[series.length - 1];
  const previousClose = previousSessionClose(series) ?? quote.previousClose;
  const price = last.close;
  const change = previousClose !== null ? price - previousClose : null;
  const changePercent = previousClose ? ((change ?? 0) / previousClose) * 100 : null;
  return {
    ...quote,
    price,
    open: last.open,
    high: last.high,
    low: last.low,
    previousClose,
    change,
    changePercent,
    volume: last.volume,
    time: last.time,
    source: quote.source === "nasdaq" ? "nasdaq-chart" : quote.source,
  };
}
