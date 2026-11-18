"use client";

import { useMutation } from "@tanstack/react-query";
import { apiGet, fmt, fmtBig } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { Err, Foot, Learn } from "./daytrade/ui";

type Quarter = {
  end: string;
  fiscal?: string;
  revenue: number | null;
  revenue_yoy: number | null;
  operating_margin: number | null;
  eps_diluted: number | null;
  eps_yoy: number | null;
};

type Company = {
  ticker: string;
  result?: { entity?: string; rows?: Quarter[] };
  filings?: {
    report?: { form: string; filed: string; url: string } | null;
    earnings_8k?: { filed: string; url: string; exhibit?: string | null } | null;
  } | null;
  changes?: string[];
};

export default function DayAnalystWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const run = useMutation({
    mutationFn: () => apiGet<Company[] | { companies: Company[] }>(`/api/daytrade/analyst/${encodeURIComponent(symbol)}`),
  });
  const payload = run.data;
  const company = Array.isArray(payload) ? payload[0] : payload?.companies?.[0];
  const rows = company?.result?.rows ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-2 py-1 border-b border-[var(--border)]">
        <button className="term-btn" onClick={() => run.mutate()} disabled={run.isPending}>{t("dt.analyst.run")}</button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {run.isPending && <div className="p-2 dim">{t("dt.analyst.loading", { symbol })}</div>}
        {run.error && <Err error={run.error as Error} />}
        {company && rows.length === 0 && <p className="p-2 dim">{t("dt.analyst.empty", { symbol })}</p>}
        {rows.length > 0 && (
          <>
            <p className="px-2 pt-1 text-[11px]">{company?.result?.entity}</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("dt.analyst.quarter")}</th>
                  <th>{t("dt.analyst.revenue")}</th>
                  <th>{t("dt.analyst.yoy")}</th>
                  <th>{t("dt.analyst.margin")}</th>
                  <th>{t("dt.analyst.eps")}</th>
                  <th>{t("dt.analyst.epsYoy")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.end}>
                    <td className="!text-left">{row.end}</td>
                    <td>{fmtBig(row.revenue)}</td>
                    <td className={row.revenue_yoy == null ? "dim" : row.revenue_yoy < 0 ? "down" : "up"}>{pct(row.revenue_yoy)}</td>
                    <td>{row.operating_margin == null ? "—" : `${row.operating_margin.toFixed(1)}%`}</td>
                    <td>{fmt(row.eps_diluted)}</td>
                    <td className={row.eps_yoy == null ? "dim" : row.eps_yoy < 0 ? "down" : "up"}>{pct(row.eps_yoy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-2 py-1 text-[10px] space-y-1">
              {company?.filings?.report && (
                <a className="block text-[var(--amber)]" href={company.filings.report.url} target="_blank" rel="noreferrer">
                  {t("dt.analyst.report", { form: company.filings.report.form })} · {company.filings.report.filed}
                </a>
              )}
              {company?.filings?.earnings_8k && (
                <a className="block text-[var(--amber)]" href={company.filings.earnings_8k.exhibit || company.filings.earnings_8k.url} target="_blank" rel="noreferrer">
                  {t("dt.analyst.earnings")} · {company.filings.earnings_8k.filed}
                </a>
              )}
            </div>
            {(company?.changes ?? []).length > 0 && (
              <details className="px-2 text-[10px] dim">
                <summary className="cursor-pointer">{t("dt.analyst.source")}</summary>
                {(company?.changes ?? []).map((line) => <p key={line}>{line}</p>)}
              </details>
            )}
          </>
        )}
        <Learn>
          <p>{t("dt.analyst.help")}</p>
          <p>{t("dt.scan.secSkipped")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}

function pct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}
