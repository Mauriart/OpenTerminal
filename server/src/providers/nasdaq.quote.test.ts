import { afterEach, describe, expect, it, vi } from "vitest";
import { quote, resetNasdaqCachesForTests } from "./nasdaq.js";

const NOV17_MS = Date.parse("2026-11-17T00:00:00Z");
const NOV18_MS = Date.parse("2026-11-18T00:00:00Z");

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("nasdaq quote when the last sale lags the chart", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetNasdaqCachesForTests();
  });

  it("returns the Nov 18 close instead of the Nov 17 last sale", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T07:04:00Z"));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("slookup")) {
        return jsonResponse({ data: [{ symbol: "NVDA", asset: "STOCKS" }] });
      }
      if (url.includes("/info")) {
        return jsonResponse({
          data: {
            companyName: "NVIDIA Corporation",
            exchange: "NASDAQ",
            marketStatus: "Closed",
            primaryData: {
              lastSalePrice: "$155.46",
              netChange: "-0.68",
              percentageChange: "-0.44%",
              lastTradeTimestamp: "Nov 17, 2026",
              volume: "406,985,086",
            },
          },
        });
      }
      if (url.includes("/summary")) return jsonResponse({ data: null });
      if (url.includes("/chart")) {
        return jsonResponse({
          data: {
            chart: [
              { x: NOV17_MS, y: 155.46, z: { open: "156.895", high: "158.19", low: "150.3301", close: "155.46", volume: "406,985,100" } },
              { x: NOV18_MS, y: 150.96, z: { open: "159.19", high: "159.7", low: "150.4", close: "150.96", volume: "349,791,400" } },
            ],
          },
        });
      }
      throw new Error("unexpected " + url);
    });
    vi.stubGlobal("fetch", fetchMock);

    const q = await quote("NVDA");
    expect(q.price).toBe(150.96);
    expect(q.previousClose).toBe(155.46);
    expect(q.source).toBe("nasdaq-chart");
    expect(q.change).toBeCloseTo(150.96 - 155.46);

    const callsAfter = fetchMock.mock.calls.length;
    const again = await quote("NVDA");
    expect(again.price).toBe(150.96);
    expect(fetchMock.mock.calls.length).toBe(callsAfter);
  });
});
