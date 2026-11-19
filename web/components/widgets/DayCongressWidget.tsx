"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { t } from "../../lib/i18n";
import { Err, Foot, Learn } from "./daytrade/ui";

type Filing = {
  doc_id: string;
  name: string;
  district: string;
  filed: string | null;
  year: number;
  url: string;
  type_name?: string;
};

function tradeSideLabel(type?: string): string {
  const value = (type ?? "").toUpperCase();
  if (value === "P" || value.startsWith("PURCHASE")) return t("dt.congress.buy");
  if (value.startsWith("S")) return t("dt.congress.sell");
  return type || "—";
}

type Report = {
  parsed: boolean;
  report: null | {
    name?: string;
    filed?: string;
    rows?: Array<{
      ticker?: string | null;
      asset?: string;
      type?: string;
      date?: string;
      amount?: string;
      owner?: string;
      late?: boolean;
    }>;
  };
};

export default function DayCongressWidget() {
  const [member, setMember] = useState("Pelosi");
  const [query, setQuery] = useState("Pelosi");
  const year = new Date().getFullYear();
  const index = useQuery({
    queryKey: ["dt-congress", query, year],
    queryFn: () => apiGet<{ filings: Filing[]; year: number }>(`/api/daytrade/congress?member=${encodeURIComponent(query)}&year=${year}`),
    staleTime: 300_000,
  });
  const read = useMutation({
    mutationFn: (filing: Filing) =>
      apiGet<Report>(`/api/daytrade/congress/${filing.doc_id}?year=${filing.year}&filed=${filing.filed ?? ""}`),
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <form
        className="flex gap-1 px-2 py-1 border-b border-[var(--border)]"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(member.trim() || "Pelosi");
        }}
      >
        <input aria-label={t("dt.congress.member")} value={member} onChange={(e) => setMember(e.target.value)} className="flex-1" />
        <button className="term-btn" type="submit">{t("dt.congress.load")}</button>
      </form>
      <div className="flex-1 overflow-auto min-h-0">
        {index.isLoading && <div className="p-2 dim">{t("dt.congress.loading")}</div>}
        {index.error && <Err error={index.error as Error} />}
        {index.data && index.data.filings.length === 0 && <p className="p-2 dim">{t("dt.congress.empty", { year: index.data.year })}</p>}
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("dt.congress.filed")}</th>
              <th>{t("dt.congress.name")}</th>
              <th>{t("dt.congress.district")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(index.data?.filings ?? []).map((filing) => (
              <tr key={filing.doc_id}>
                <td className="!text-left dim">{filing.filed}</td>
                <td className="!text-left">{filing.name}</td>
                <td>{filing.district}</td>
                <td>
                  <button className="term-btn" onClick={() => read.mutate(filing)}>{t("dt.congress.read")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {read.isPending && <p className="p-2 dim">{t("dt.congress.reading")}</p>}
        {read.error && <Err error={read.error as Error} />}
        {read.data && !read.data.parsed && <p className="p-2 dim">{t("dt.congress.noPdf")}</p>}
        {read.data?.report?.rows && (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("dt.congress.ticker")}</th>
                <th>{t("dt.congress.side")}</th>
                <th>{t("dt.congress.tradeDate")}</th>
                <th>{t("dt.congress.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {read.data.report.rows.map((row, i) => (
                <tr key={`${row.ticker}-${row.date}-${i}`}>
                  <td className="!text-left font-bold">{row.ticker ?? row.asset}</td>
                  <td>{tradeSideLabel(row.type)}</td>
                  <td className="dim">{row.date}{row.late ? ` · ${t("dt.congress.late")}` : ""}</td>
                  <td>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Learn>
          <p>{t("dt.congress.help")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}
