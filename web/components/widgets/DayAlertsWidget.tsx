"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "../../lib/api";
import { t, type MessageKey } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { Err, Foot, Learn, type SessionView } from "./daytrade/ui";

type Rule = { id: string; type: string; symbol?: string; price?: number; pct?: number; at?: string; label?: string };
type Check = { rings?: Array<{ id: string; symbol?: string; message: string }>; quotes?: Record<string, number>; market?: { open?: boolean; reason?: string } };

function alertKind(type: string): string {
  const key =
    type === "pct_move" ? "dt.alerts.pct" : type === "opening_bell" ? "dt.alerts.bell" : type === "time" ? "dt.alerts.flat" : (`dt.alerts.${type}` as MessageKey);
  const label = t(key as MessageKey);
  return label === key ? type : label;
}

const KINDS = [
  ["above", "dt.alerts.above"],
  ["below", "dt.alerts.below"],
  ["stop", "dt.alerts.stop"],
  ["target", "dt.alerts.target"],
  ["pct", "dt.alerts.pct"],
] as const;

export default function DayAlertsWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const qc = useQueryClient();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("above");
  const [price, setPrice] = useState("");
  const rules = useQuery({
    queryKey: ["dt-alerts"],
    queryFn: () => apiGet<{ rules: Rule[] }>("/api/daytrade/alerts"),
  });
  const add = useMutation({
    mutationFn: () => apiPost("/api/daytrade/alerts", { kind, symbol, price: Number(price) }),
    onSuccess: () => {
      setPrice("");
      qc.invalidateQueries({ queryKey: ["dt-alerts"] });
    },
  });
  const bell = useMutation({
    mutationFn: () => apiPost("/api/daytrade/alerts", { kind: "opening-bell" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt-alerts"] }),
  });
  const check = useMutation({
    mutationFn: () => apiPost<Check>("/api/daytrade/alerts/check", {}),
  });
  const watchPlan = useMutation({
    mutationFn: async () => {
      const session = await apiPost<SessionView>("/api/daytrade/plan", { symbol, targetR: 1, fresh: true });
      if (!session.plan) throw new Error(t("dt.plan.none"));
      return apiPost("/api/daytrade/alerts", { kind: "from-plan", plan: session.plan });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt-alerts"] }),
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <form
        className="flex flex-wrap gap-1 px-2 py-1 border-b border-[var(--border)]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <select value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number][0])} aria-label={t("dt.alerts.add")}>
          {KINDS.map(([value, key]) => (
            <option key={value} value={value}>{t(key)}</option>
          ))}
        </select>
        <input className="w-20" inputMode="decimal" aria-label={t("dt.alerts.price")} placeholder={t("dt.alerts.price")} value={price} onChange={(e) => setPrice(e.target.value)} />
        <button className="term-btn" type="submit" disabled={add.isPending || !price}>{t("dt.alerts.add")}</button>
        <button className="term-btn" type="button" onClick={() => bell.mutate()}>{t("dt.alerts.bell")}</button>
        <button className="term-btn" type="button" onClick={() => watchPlan.mutate()} disabled={watchPlan.isPending}>{t("dt.alerts.fromPlan")}</button>
        <button className="term-btn" type="button" onClick={() => check.mutate()} disabled={check.isPending}>
          {check.isPending ? t("dt.alerts.checking") : t("dt.alerts.check")}
        </button>
      </form>
      <div className="flex-1 overflow-auto min-h-0">
        {(add.error || bell.error || check.error || watchPlan.error || rules.error) && (
          <Err error={((add.error || bell.error || check.error || watchPlan.error || rules.error) as Error)} />
        )}
        {check.data && (
          <div className="px-2 py-1 text-[11px]">
            {(check.data.rings ?? []).length === 0 && <p className="dim">{t("dt.alerts.quiet")}</p>}
            {(check.data.rings ?? []).map((ring) => (
              <p key={ring.id} className="text-[var(--amber)]">{t("dt.alerts.rang")}: {ring.message}</p>
            ))}
          </div>
        )}
        <ul className="text-[11px]">
          {(rules.data?.rules ?? []).map((rule) => (
            <li key={rule.id} className="flex justify-between gap-2 px-2 py-0.5 border-b border-[#161616]">
              <span>
                {rule.symbol ?? "NYSE"} · {alertKind(rule.type)}
                {rule.price != null ? ` ${rule.price}` : ""}
                {rule.pct != null ? ` ${rule.pct}%` : ""}
                {rule.at ? ` ${rule.at}` : ""}
              </span>
              <button
                className="dim hover:text-[var(--down)]"
                title={t("dt.size.delete")}
                onClick={async () => {
                  await apiDelete(`/api/daytrade/alerts/${encodeURIComponent(rule.id)}`);
                  qc.invalidateQueries({ queryKey: ["dt-alerts"] });
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {rules.data && rules.data.rules.length === 0 && <p className="p-2 dim">{t("dt.alerts.empty")}</p>}
        <Learn>
          <p>{t("dt.alerts.hint")}</p>
          <p>{t("dt.flatHint")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}
