"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost, fmt } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { Err, Foot, Learn, LevelBar, Replay, money, statusLine, type SessionView } from "./daytrade/ui";

export default function DayPlanWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const plan = useMutation({
    mutationFn: () => apiPost<SessionView>("/api/daytrade/plan", { symbol, targetR: 1, fresh: true }),
  });
  const data = plan.data;
  const levels = data?.plan;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--border)]">
        <button className="term-btn" onClick={() => plan.mutate()} disabled={plan.isPending}>{t("dt.plan.run")}</button>
        <span className="dim text-[10px]">1R</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {plan.isPending && <div className="p-2 dim">{t("dt.plan.loading")}</div>}
        {plan.error && <Err error={plan.error as Error} />}
        {data && (
          <>
            <Replay replay={data.replay} date={data.asOf ?? data.entry.date} />
            <p className="px-2 py-1 text-[11px] leading-snug">{statusLine(data.entry.status, data.entry.phase, data.plannedAhead)}</p>
            {data.entry.opening_range && (
              <p className="px-2 text-[10px] dim" title={t("dt.openingRange")}>
                {t("dt.scan.range")} {fmt(data.entry.opening_range.low)} – {fmt(data.entry.opening_range.high)}
                {data.entry.trigger?.time ? ` · ${data.entry.trigger.time}` : ""}
              </p>
            )}
            {levels ? (
              <>
                <LevelBar stop={levels.stop} entry={levels.entry} target={levels.target} />
                <table className="data-table mt-6">
                  <tbody>
                    <Row k={t("dt.entry")} v={`${money(levels.entry)}${levels.entry_time ? ` · ${levels.entry_time}` : ""}`} hint={t("dt.openingRange")} />
                    <Row k={t("dt.stop")} v={money(levels.stop)} hint={t("dt.stopHint")} />
                    <Row k={t("dt.target")} v={`${money(levels.target)} · ${levels.target_r}R`} hint={t("dt.targetHint")} />
                    <Row k={t("dt.risk")} v={money(levels.risk_per_share)} hint={t("dt.rHint")} />
                    <Row k={t("dt.plan.reward")} v={String(levels.reward_risk)} hint={t("dt.rHint")} />
                    <Row k={t("dt.flat")} v={`${levels.flat_by} ET`} hint={t("dt.flatHint")} />
                  </tbody>
                </table>
              </>
            ) : (
              <p className="px-2 py-2 dim">{t("dt.plan.none")}</p>
            )}
          </>
        )}
        <Learn>
          <p>{t("dt.openingRange")}</p>
          <p>{t("dt.stopHint")}</p>
          <p>{t("dt.targetHint")}</p>
          <p>{t("dt.rHint")}</p>
          <p>{t("dt.flatHint")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}

function Row({ k, v, hint }: { k: string; v: string; hint: string }) {
  return (
    <tr title={hint}>
      <td className="!text-left dim">{k}</td>
      <td>{v}</td>
    </tr>
  );
}
