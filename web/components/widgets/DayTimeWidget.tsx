"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost, fmt } from "../../lib/api";
import { t } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";
import { Err, FanChart, Foot, Learn, Odds, Replay, pctPoints, verdictLine, type SessionView } from "./daytrade/ui";

type Machine = {
  session: SessionView;
  verdictKey: string | null;
  timemachine: null | {
    verdict?: string;
    verdict_notes?: string[];
    note?: string;
    mc: {
      replays: number;
      seed: number;
      p_target: number;
      p_stop: number;
      p_neither: number;
      avg_R: number;
      median_close: number;
      p5_close: number;
      p95_close: number;
      bands: number[][];
      band_times?: string[];
      hist?: { bins: number[] };
    };
    history: {
      sessions: number;
      triggered: number;
      target: number;
      stop: number;
      close: number;
      avg_R: number | null;
      trades?: Array<{ date: string; outcome: string; R: number }>;
    };
  };
};

export default function DayTimeWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const run = useMutation({
    mutationFn: () => apiPost<Machine>("/api/daytrade/timemachine", { symbol, targetR: 1, fresh: true }),
  });
  const data = run.data;
  const mc = data?.timemachine?.mc;
  const history = data?.timemachine?.history;
  const coin = data?.verdictKey === "coinFlip" || data?.verdictKey === "breakEven";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-2 py-1 border-b border-[var(--border)]">
        <button className="term-btn" onClick={() => run.mutate()} disabled={run.isPending}>{t("dt.time.run")}</button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {run.isPending && <div className="p-2 dim">{t("dt.time.loading", { symbol })}</div>}
        {run.error && <Err error={run.error as Error} />}
        {data && <Replay replay={data.session.replay} date={data.session.asOf ?? data.session.plan?.date} />}
        {data && !data.timemachine && <p className="p-2 dim">{t("dt.time.none")}</p>}
        {mc && data?.session.plan && (
          <>
            <p className={`px-2 pt-1 text-[12px] ${coin ? "text-[var(--amber)]" : ""}`}>{verdictLine(data.verdictKey)}</p>
            {coin && <p className="px-2 py-1 text-[11px] leading-snug">{t("dt.coinFlipExplain")}</p>}
            <Odds target={mc.p_target} stop={mc.p_stop} neither={mc.p_neither} />
            <FanChart bands={mc.bands} times={mc.band_times} entry={data.session.plan.entry} stop={data.session.plan.stop} target={data.session.plan.target} />
            {mc.hist?.bins && <Hist bins={mc.hist.bins} />}
            <p className="px-2 text-[10px] dim">{t("dt.time.median", { median: fmt(mc.median_close), lo: fmt(mc.p5_close), hi: fmt(mc.p95_close) })}</p>
            <p className="px-2 text-[10px] dim">{t("dt.time.avg", { value: mc.avg_R.toFixed(3), risk: fmt(data.session.plan.risk_per_share) })}</p>
            {history?.triggered != null && (
              <p className="px-2 py-1 text-[11px] leading-snug">
                {t("dt.time.history", {
                  sessions: history.sessions,
                  triggered: history.triggered,
                  target: history.target,
                  stop: history.stop,
                  close: history.close,
                  avg: history.avg_R == null ? "—" : history.avg_R.toFixed(3),
                })}
              </p>
            )}
            {history?.trades && history.trades.length > 0 && (
              <div className="px-2 pb-1 flex flex-wrap gap-px" title={t("dt.time.history", { sessions: history.sessions, triggered: history.triggered, target: history.target, stop: history.stop, close: history.close, avg: "" })}>
                {history.trades.slice(0, 40).map((trade, index) => (
                  <span
                    key={`${trade.date}-${trade.outcome}-${index}`}
                    className="w-2 h-3"
                    style={{ background: trade.outcome === "target" ? "var(--up)" : trade.outcome === "stop" ? "var(--down)" : "var(--text-dim)" }}
                    title={`${trade.date} ${trade.outcome} ${trade.R}R`}
                  />
                ))}
              </div>
            )}
            <p className="px-2 text-[10px] dim">{t("dt.time.seed", { seed: mc.seed })} · {pctPoints(mc.p_target)} / {pctPoints(mc.p_stop)}</p>
          </>
        )}
        <Learn>
          <p>{t("dt.coinFlipExplain")}</p>
          <p>{t("dt.rHint")}</p>
        </Learn>
      </div>
      <Foot />
    </div>
  );
}

function Hist({ bins }: { bins: number[] }) {
  const max = Math.max(...bins, 1);
  return (
    <div className="px-2 h-8 flex items-end gap-px">
      {bins.map((n, i) => (
        <div key={i} className="flex-1 bg-[var(--amber-dim)]" style={{ height: `${(n / max) * 100}%` }} />
      ))}
    </div>
  );
}
