import type { Candle } from "./api";

/** Ascending, one bar per timestamp. The last element is the latest close. */
export function orderedCandles(candles: Candle[]): Candle[] {
  if (candles.length < 2) return candles;
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const out: Candle[] = [];
  for (const candle of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.time === candle.time) out[out.length - 1] = candle;
    else out.push(candle);
  }
  return out;
}

/**
 * Ignore a refresh whose last bar is more than 12 hours older than the series
 * already on screen. That is how the 5D last-price tag flipped from the Nov 18
 * close back to the Nov 17 close while the market was shut.
 * Returns the previous array when nothing material changed, so the chart is not rebuilt.
 */
export function preferLatestClose(previous: Candle[] | null, next: Candle[]): Candle[] {
  const incoming = orderedCandles(next);
  if (!previous?.length) return incoming;
  if (!incoming.length) return previous;
  const prevLast = previous[previous.length - 1];
  const nextLast = incoming[incoming.length - 1];
  if (nextLast.time + 12 * 60 * 60 < prevLast.time) return previous;
  if (
    previous.length === incoming.length &&
    previous[0].time === incoming[0].time &&
    prevLast.time === nextLast.time &&
    prevLast.close === nextLast.close
  ) {
    return previous;
  }
  return incoming;
}
