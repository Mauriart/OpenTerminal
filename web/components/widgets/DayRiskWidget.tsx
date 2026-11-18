"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, fmt } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { Err, Foot, Learn, Replay, money, reasonLine, type SessionView } from "./daytrade/ui";

type SizeDoc = {
  verdict: "PASS" | "BLOCK" | null;
  reasonCodes: string[];
  simulated?: boolean;
  sizing: null | {
    qty: number;
    entry: number;
    stop: number;
    target: number;
    risk_per_share: number;
    max_loss: number;
    cost: number;
    bound_by: string;
    flat_by?: string;
  };
  session: SessionView;
  risk?: { results?: Array<{ reasons?: string[] }> } | null;
};

type Paper = {
  id: number;
  symbol: string;
  quantity: number;
  entry: number;
  stop: number;
  target: number;
  max_loss: number | null;
  session_date: string;
  replay: number;
  status: string;
};

export default function DayRiskWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const qc = useQueryClient();
  const [budget, setBudget] = useState("5000");
  const [maxLoss, setMaxLoss] = useState("50");
  const [confirm, setConfirm] = useState(false);
  const size = useMutation({
    mutationFn: () =>
      apiPost<SizeDoc>("/api/daytrade/size", {
        symbol,
        budget: Number(budget),
        maxLoss: Number(maxLoss),
        targetR: 1,
        fresh: true,
      }),
  });
  const save = useMutation({
    mutationFn: () =>
      apiPost<Paper>("/api/daytrade/paper", {
        symbol,
        budget: Number(budget),
        maxLoss: Number(maxLoss),
        targetR: 1,
        confirm: true,
      }),
    onSuccess: () => {
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ["dt-paper"] });
    },
  });
  const journal = useQuery({
    queryKey: ["dt-paper"],
    queryFn: () => apiGet<Paper[]>("/api/daytrade/paper"),
  });
  const data = size.data;
  const reasons = data?.risk?.results?.[0]?.reasons ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      <form
        className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-[var(--border)]"
        onSubmit={(e) => {
          e.preventDefault();
          size.mutate();
        }}
      >
        <input className="w-20" aria-label={t("dt.budget")} title={t("dt.budget")} value={budget} onChange={(e) => setBudget(e.target.value)} />
        <input className="w-16" aria-label={t("dt.size.maxLoss")} title={t("dt.size.maxLoss")} value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} />
        <button className="term-btn" type="submit" disabled={size.isPending}>{t("dt.size.run")}</button>
      </form>
      <div className="flex-1 overflow-auto min-h-0">
        {size.isPending && <div className="p-2 dim">{t("dt.size.loading")}</div>}
        {size.error && <Err error={size.error as Error} />}
        {data && (
          <>
            <Replay replay={data.session.replay} date={data.session.asOf ?? data.session.plan?.date} />
            <div className={`px-2 py-1 text-[13px] font-bold ${data.verdict === "PASS" ? "up" : "down"}`}>
              {data.verdict === "PASS" ? t("dt.pass") : t("dt.block")}
            </div>
            <ul className="px-2 text-[11px] space-y-1">
              {(data.reasonCodes.length ? data.reasonCodes : data.verdict === "PASS" ? [] : ["other"]).map((code) => (
                <li key={code}>{reasonLine(code)}</li>
              ))}
            </ul>
            {reasons.length > 0 && (
              <details className="px-2 text-[10px] dim">
                <summary className="cursor-pointer">{t("dt.engine")}</summary>
                {reasons.map((reason) => <p key={reason}>{reason}</p>)}
              </details>
            )}
            {data.sizing && data.sizing.qty > 0 && (
              <table className="data-table">
                <tbody>
                  <tr><td className="!text-left dim">{t("dt.shares")}</td><td>{data.sizing.qty}</td></tr>
                  <tr><td className="!text-left dim">{t("dt.entry")}</td><td>{money(data.sizing.entry)}</td></tr>
                  <tr><td className="!text-left dim">{t("dt.stop")}</td><td>{money(data.sizing.stop)}</td></tr>
                  <tr><td className="!text-left dim">{t("dt.target")}</td><td>{money(data.sizing.target)}</td></tr>
                  <tr><td className="!text-left dim">{t("dt.cost")}</td><td>{fmt(data.sizing.cost)}</td></tr>
                  <tr><td className="!text-left dim">{t("dt.maxLoss")}</td><td className="down">{fmt(data.sizing.max_loss)}</td></tr>
                </tbody>
              </table>
            )}
            {data.verdict === "PASS" && (
              <form
                className="px-2 py-2 space-y-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (confirm) save.mutate();
                }}
              >
                <label className="flex gap-2 items-start text-[10px] leading-snug">
                  <input type="checkbox" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  <span>{t("dt.size.confirm")}</span>
                </label>
                <button className="term-btn" type="submit" disabled={!confirm || save.isPending}>
                  {save.isPending ? t("dt.size.saving") : t("dt.size.save")}
                </button>
                {save.data && <p className="up text-[10px]">{t("dt.paper")} · {t("dt.noBroker")}</p>}
                {save.error && <Err error={save.error as Error} />}
              </form>
            )}
          </>
        )}
        <div className="px-2 pt-2 text-[10px] text-[var(--amber)]">{t("dt.size.journal")}</div>
        <table className="data-table">
          <tbody>
            {(journal.data ?? []).map((row) => (
              <tr key={row.id}>
                <td className="!text-left">
                  <span className="text-[var(--amber)]">{t("dt.paper")}</span> {row.symbol} × {row.quantity}
                  <div className="dim">{row.session_date} · {fmt(row.entry)} / {fmt(row.stop)} / {fmt(row.target)}</div>
                </td>
                <td>
                  <button
                    className="dim hover:text-[var(--down)]"
                    title={t("dt.size.delete")}
                    onClick={async () => {
                      await apiDelete(`/api/daytrade/paper/${row.id}`);
                      qc.invalidateQueries({ queryKey: ["dt-paper"] });
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {journal.data && journal.data.length === 0 && (
              <tr><td className="dim">{t("dt.size.empty")}</td></tr>
            )}
          </tbody>
        </table>
        <Learn>
          <p>{t("dt.riskHint")}</p>
          <p>{t("dt.noBroker")}</p>
          <p>{t("dt.stopHint")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}
