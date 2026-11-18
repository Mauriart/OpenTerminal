"use client";

import type { ReactNode } from "react";
import { fmt } from "../../../lib/api";
import { t, type MessageKey } from "../../../lib/i18n";

export function Learn({ children }: { children: ReactNode }) {
  return (
    <details className="mx-2 my-1 text-[10px] dim leading-snug">
      <summary className="cursor-pointer text-[var(--amber)] select-none">{t("dt.learn")}</summary>
      <div className="mt-1 space-y-1">{children}</div>
    </details>
  );
}

export function Foot() {
  return <div className="px-2 py-1 text-[9px] dim border-t border-[var(--border)] leading-snug">{t("dt.attribution")}</div>;
}

export function Replay({ replay, date }: { replay: boolean; date?: string | null }) {
  if (!replay || !date) return <div className="px-2 pt-1 text-[10px] dim">{t("dt.live")}</div>;
  return <div className="px-2 pt-1 text-[10px] text-[var(--amber)]">{t("dt.replay", { date })}</div>;
}

export function Err({ error }: { error: Error }) {
  return <div className="p-2 down">{t("common.error", { message: error.message })}</div>;
}

export function statusLine(status: string, phase: string, ahead: boolean): string {
  if (ahead) return t("dt.status.ahead");
  if (phase === "pre-open") return t("dt.status.pre-open");
  if (phase === "forming") return t("dt.status.forming");
  const key = `dt.status.${status}` as MessageKey;
  const text = t(key);
  return text === key ? t("dt.status.no-data") : text;
}

const SETUPS: Record<string, MessageKey> = {
  breakout_20d: "dt.setup.breakout_20d",
  bull_flag: "dt.setup.bull_flag",
  reclaim_ma20: "dt.setup.reclaim_ma20",
  oversold: "dt.setup.oversold",
  oversold_bounce: "dt.setup.oversold_bounce",
  orb: "dt.setup.orb",
};

export function setupName(code: string): string {
  const key = SETUPS[code];
  return key ? t(key) : code;
}

export function reasonLine(code: string): string {
  const key = `dt.reason.${code}` as MessageKey;
  const text = t(key);
  return text === key ? t("dt.reason.other") : text;
}

export function verdictLine(key: string | null): string {
  if (!key) return "";
  const message = `dt.verdict.${key}` as MessageKey;
  const text = t(message);
  return text === message ? t("dt.verdict.other") : text;
}

export function money(n: number | null | undefined): string {
  return fmt(n);
}

export function pctPoints(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(1)}%`;
}

export type OpeningRange = { high: number; low: number; minutes?: number; complete?: boolean };

export type EntryView = {
  symbol: string;
  date: string;
  status: string;
  phase: string;
  reason?: string;
  opening_range: OpeningRange | null;
  level: number | null;
  trigger: { time?: string; price?: number; pct_over?: number } | null;
  last: { close?: number; bar_start?: string } | null;
};

export type PlanView = {
  symbol: string;
  date: string;
  setup: string;
  entry: number;
  entry_time: string | null;
  stop: number;
  stop_label?: string;
  target: number;
  target_r: number;
  target_label?: string;
  risk_per_share: number;
  reward_risk: number;
  flat_by: string;
  opening_range: OpeningRange | null;
};

export type SessionView = {
  symbol: string;
  replay: boolean;
  asOf: string | null;
  entry: EntryView;
  plan: PlanView | null;
  plannedAhead: boolean;
  reason: "ok" | "no-setup" | "no-session";
  clock?: { open?: boolean; reason?: string; date?: string };
};

export function LevelBar({ stop, entry, target }: { stop: number; entry: number; target: number }) {
  const lo = Math.min(stop, entry, target);
  const hi = Math.max(stop, entry, target);
  const span = hi - lo || 1;
  const at = (price: number) => ((price - lo) / span) * 100;
  return (
    <div className="mx-2 mt-2 mb-1">
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1 h-px bg-[var(--border)]" />
        <Tick left={at(stop)} color="var(--down)" />
        <Tick left={at(entry)} color="var(--amber)" />
        <Tick left={at(target)} color="var(--up)" />
      </div>
    </div>
  );
}

function Tick({ left, color }: { left: number; color: string }) {
  return <div className="absolute top-0 h-3 w-0.5 -translate-x-1/2" style={{ left: `${left}%`, background: color }} />;
}

export function FanChart({
  bands,
  times,
  entry,
  stop,
  target,
}: {
  bands: number[][];
  times?: string[];
  entry: number;
  stop: number;
  target: number;
}) {
  if (bands.length < 2) return null;
  const width = 520;
  const height = 150;
  const padL = 46;
  const padR = 8;
  const padT = 8;
  const padB = 16;
  const values = bands.flat().concat(entry, stop, target);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i: number) => padL + (i / (bands.length - 1)) * (width - padL - padR);
  const y = (price: number) => padT + (1 - (price - lo) / span) * (height - padT - padB);
  const area = (lowIndex: number, highIndex: number) => {
    const forward = bands.map((band, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(band[highIndex]).toFixed(1)}`);
    const back = [...bands].reverse().map((band, i) => `L${x(bands.length - 1 - i).toFixed(1)},${y(band[lowIndex]).toFixed(1)}`);
    return [...forward, ...back, "Z"].join(" ");
  };
  const median = bands.map((band, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(band[2]).toFixed(1)}`).join(" ");
  const rule = (price: number) => `M${padL},${y(price).toFixed(1)} L${width - padR},${y(price).toFixed(1)}`;
  const ticks = [0, Math.floor(bands.length / 2), bands.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[150px]" role="img" aria-label={t("dt.time.fan")}>
      <path d={area(0, 4)} fill="rgba(255,153,0,0.12)" />
      <path d={area(1, 3)} fill="rgba(255,153,0,0.28)" />
      <path d={median} fill="none" stroke="var(--amber)" strokeWidth="1.4" />
      <path d={rule(stop)} stroke="var(--down)" strokeDasharray="3 3" strokeWidth="1" />
      <path d={rule(target)} stroke="var(--up)" strokeDasharray="3 3" strokeWidth="1" />
      <path d={rule(entry)} stroke="var(--text-dim)" strokeDasharray="2 3" strokeWidth="1" />
      <text x="2" y={y(target) + 3} fill="var(--up)" fontSize="9">{money(target)}</text>
      <text x="2" y={y(entry) + 3} fill="var(--text-dim)" fontSize="9">{money(entry)}</text>
      <text x="2" y={y(stop) + 3} fill="var(--down)" fontSize="9">{money(stop)}</text>
      {times &&
        ticks.map((i) => (
          <text key={i} x={x(i)} y={height - 2} fill="var(--text-dim)" fontSize="9" textAnchor="middle">
            {times[i]?.replace(":00", "")}
          </text>
        ))}
    </svg>
  );
}

export function Odds({ target, stop, neither }: { target: number; stop: number; neither: number }) {
  const rows = [
    { label: t("dt.time.target"), value: target, color: "var(--up)" },
    { label: t("dt.time.stop"), value: stop, color: "var(--down)" },
    { label: t("dt.time.neither"), value: neither, color: "var(--text-dim)" },
  ];
  return (
    <div className="px-2 py-1 space-y-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 text-[10px]">
          <span className="w-24 dim">{row.label}</span>
          <span className="flex-1 h-2 bg-[#161616]">
            <span className="block h-2" style={{ width: `${Math.max(0, Math.min(100, row.value * 100))}%`, background: row.color }} />
          </span>
          <span className="w-12 text-right">{pctPoints(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
