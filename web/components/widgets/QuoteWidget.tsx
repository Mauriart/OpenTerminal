"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, fmt, fmtBig, pctClass, type Quote } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import Flash from "../Flash";

type ShortVolume = { date: string; shortVolume: number; shortExemptVolume: number; totalVolume: number; shortVolumePercent: number };

export default function QuoteWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const { data, error } = useQuery({
    queryKey: ["quote", symbol],
    queryFn: async () => (await apiGet<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbol)}`))[0],
    refetchInterval: 1_000,
  });
  // FINRA's Reg SHO file only updates once a day (next-morning), so no point polling it fast.
  const { data: shortVol } = useQuery({
    queryKey: ["short-volume", symbol],
    queryFn: () => apiGet<ShortVolume | null>(`/api/short-volume/${encodeURIComponent(symbol)}`),
    staleTime: 3_600_000,
  });

  if (error) return <div className="p-2 down">{t("common.error", { message: (error as Error).message })}</div>;
  if (!data) return <div className="p-2 dim">{t("quote.loading", { symbol })}</div>;

  const rows: Array<{ label: string; value: string; title?: string }> = [
    { label: t("quote.open"), value: fmt(data.open) },
    { label: t("quote.high"), value: fmt(data.high) },
    { label: t("quote.low"), value: fmt(data.low) },
    { label: t("quote.prevClose"), value: fmt(data.previousClose) },
    { label: t("quote.bid"), value: fmt(data.bid), title: t("quote.bidHint") },
    { label: t("quote.ask"), value: fmt(data.ask), title: t("quote.askHint") },
    { label: t("quote.volume"), value: fmtBig(data.volume) },
    { label: t("quote.avgVolume"), value: fmtBig(data.avgVolume) },
    ...(shortVol
      ? [{ label: t("quote.shortVol"), value: fmt(shortVol.shortVolumePercent, 1) + "%", title: t("quote.shortHint") }]
      : []),
    { label: t("quote.marketCap"), value: fmtBig(data.marketCap) },
    { label: t("quote.pe"), value: fmt(data.pe), title: t("quote.peHint") },
    { label: t("quote.eps"), value: fmt(data.eps), title: t("quote.epsHint") },
    { label: t("quote.divYield"), value: data.dividendYield !== null ? fmt(data.dividendYield * 100) + "%" : "—" },
    { label: t("quote.high52"), value: fmt(data.week52High) },
    { label: t("quote.low52"), value: fmt(data.week52Low) },
    { label: t("quote.beta"), value: fmt(data.beta), title: t("quote.betaHint") },
    { label: t("quote.shares"), value: fmtBig(data.sharesOutstanding) },
  ];

  return (
    <div className="p-2">
      <div className="flex items-baseline gap-3 mb-1">
        <Flash value={data.price} className="text-xl font-bold">{fmt(data.price)}</Flash>
        <Flash value={data.changePercent} className={`${pctClass(data.changePercent)} text-sm`}>
          {data.change !== null && data.change >= 0 ? "+" : ""}
          {fmt(data.change)} ({fmt(data.changePercent)}%)
        </Flash>
        <span className="dim text-[10px] ml-auto">
          {data.exchange ?? ""} · {data.currency ?? ""} · {data.source}
        </span>
      </div>
      <div className="dim text-[11px] mb-2 truncate">{data.name}</div>
      <div className="grid grid-cols-2 gap-x-4">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between border-b border-[#161616] py-0.5">
            <span className="dim" title={row.title}>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
