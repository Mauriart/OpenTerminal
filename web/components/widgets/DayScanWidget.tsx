"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, fmt } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useTerminal } from "../../store/terminal";
import { Err, Foot, Learn, Replay, setupName } from "./daytrade/ui";

type Hit = {
  symbol: string;
  setups?: string[];
  price?: number;
  rsi?: number;
  or_low?: number;
  or_high?: number;
  pct_over?: number;
};

type ScanDoc = {
  mode: string;
  as_of: string | null;
  scanned: number;
  hits: Hit[];
  note?: string;
  replay?: boolean;
  asOf?: string | null;
  live?: boolean;
};

type NewsDoc = {
  secSkipped?: boolean;
  items?: Array<{ title?: string; source?: string; time?: string; kind?: string }>;
};

const TICKER = /^[A-Z]{1,5}(?:[.-][A-Z]{1,2})?$/;

export default function DayScanWidget() {
  const watchlist = useTerminal((s) => s.watchlist);
  const setActiveSymbol = useTerminal((s) => s.setActiveSymbol);
  const [mode, setMode] = useState<"daily" | "orb">("daily");
  const [selected, setSelected] = useState<string | null>(null);
  const symbols = watchlist.map((s) => s.toUpperCase()).filter((s) => TICKER.test(s)).slice(0, 24);
  const list = symbols.join(",");

  const scan = useQuery({
    queryKey: ["dt-scan", mode, list],
    queryFn: () => apiGet<ScanDoc>(`/api/daytrade/scan?mode=${mode}&symbols=${encodeURIComponent(list)}`),
    staleTime: 120_000,
    enabled: symbols.length > 0,
  });

  const symbol = selected ?? scan.data?.hits?.[0]?.symbol ?? symbols[0];
  const news = useQuery({
    queryKey: ["dt-news", symbol],
    queryFn: () => apiGet<NewsDoc>(`/api/daytrade/news/${encodeURIComponent(symbol)}`),
    enabled: Boolean(symbol),
    staleTime: 120_000,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--border)]">
        <button className={`term-btn ${mode === "daily" ? "active" : ""}`} onClick={() => setMode("daily")}>{t("dt.scan.daily")}</button>
        <button className={`term-btn ${mode === "orb" ? "active" : ""}`} onClick={() => setMode("orb")}>{t("dt.scan.orb")}</button>
        <span className="dim text-[10px] ml-auto">{scan.data ? `${scan.data.hits.length}/${scan.data.scanned}` : symbols.length}</span>
      </div>
      {scan.data && <Replay replay={Boolean(scan.data.replay)} date={scan.data.asOf ?? scan.data.as_of} />}
      <div className="flex-1 overflow-auto min-h-0">
        {scan.isLoading && <div className="p-2 dim">{t("dt.scan.loading")}</div>}
        {scan.error && <Err error={scan.error as Error} />}
        {scan.data && (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("dt.symbol")}</th>
                <th>{t("dt.price")}</th>
                {mode === "daily" ? <th>{t("dt.scan.rsi")}</th> : <th>{t("dt.scan.range")}</th>}
                <th>{mode === "daily" ? t("dt.learn") : t("dt.scan.over")}</th>
              </tr>
            </thead>
            <tbody>
              {scan.data.hits.map((hit) => (
                <tr
                  key={hit.symbol}
                  onClick={() => {
                    setSelected(hit.symbol);
                    setActiveSymbol(hit.symbol);
                  }}
                >
                  <td className="font-bold">{hit.symbol}</td>
                  <td>{fmt(hit.price)}</td>
                  {mode === "daily" ? (
                    <td>{hit.rsi != null ? hit.rsi.toFixed(1) : "—"}</td>
                  ) : (
                    <td className="dim">{fmt(hit.or_low)}–{fmt(hit.or_high)}</td>
                  )}
                  <td className="!text-left">
                    {mode === "daily"
                      ? (hit.setups ?? []).map(setupName).join(", ")
                      : hit.pct_over != null ? `${hit.pct_over.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
              {scan.data.hits.length === 0 && (
                <tr><td colSpan={4} className="dim p-2">{t("dt.scan.empty")}</td></tr>
              )}
            </tbody>
          </table>
        )}
        <div className="px-2 pt-2 text-[10px] text-[var(--amber)]">{t("dt.scan.news")} {symbol ? `· ${symbol}` : ""}</div>
        {news.isLoading && <div className="px-2 dim text-[10px]">{t("dt.scan.newsLoading")}</div>}
        {news.error && <Err error={news.error as Error} />}
        {news.data?.secSkipped && <div className="px-2 text-[10px] dim">{t("dt.scan.secSkipped")}</div>}
        <ul className="px-2 pb-1 text-[10px] space-y-1">
          {(news.data?.items ?? []).slice(0, 6).map((item, i) => (
            <li key={`${item.title}-${i}`}>
              <span className="dim">{item.source} </span>
              {item.title}
            </li>
          ))}
          {news.data && (news.data.items ?? []).length === 0 && <li className="dim">{t("dt.scan.newsEmpty")}</li>}
        </ul>
        <Learn>
          <p>{t("dt.scan.note")}</p>
          <p>{t("dt.openingRange")}</p>
          <p>{t("dt.scan.click")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}
