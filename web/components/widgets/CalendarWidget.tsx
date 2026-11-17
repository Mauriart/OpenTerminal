"use client";

import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { apiGet, fmt, pctClass } from "../../lib/api";
import { formatDate, formatDateTime, t, type MessageKey } from "../../lib/i18n";
import { symbolsParam } from "../../lib/symbol";
import { useTerminal } from "../../store/terminal";

type EconEvent = {
  title: string;
  country: string;
  date: string;
  impact: "Low" | "Medium" | "High" | "Holiday";
  forecast: string | null;
  previous: string | null;
  actual: string | null;
};

type EarningsEntry = {
  symbol: string;
  nextEarningsDate: number | null;
  lastEarningsDate: number | null;
  epsForecast: number | null;
};

const IMPACT_CLASS: Record<EconEvent["impact"], string> = {
  High: "down",
  Medium: "amber",
  Low: "dim",
  Holiday: "dim",
};

const TIMEZONES: Array<{ id: string; zone: string | undefined }> = [
  { id: "local", zone: undefined },
  { id: "utc", zone: "UTC" },
  { id: "newYork", zone: "America/New_York" },
  { id: "chicago", zone: "America/Chicago" },
  { id: "london", zone: "Europe/London" },
  { id: "frankfurt", zone: "Europe/Berlin" },
  { id: "tokyo", zone: "Asia/Tokyo" },
  { id: "sydney", zone: "Australia/Sydney" },
];

function EconomicTab() {
  const [minImpact, setMinImpact] = useState<"all" | "medium">("medium");
  const [tz, setTz] = useState<string>("local");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["econ-calendar"],
    queryFn: () => apiGet<EconEvent[]>("/api/econ-calendar"),
    refetchInterval: 300_000,
  });

  const events = useMemo(
    () => (minImpact === "all" ? data : data.filter((e) => e.impact === "High" || e.impact === "Medium")),
    [data, minImpact]
  );

  if (error) return <div className="p-2 down">{t("common.error", { message: (error as Error).message })}</div>;
  if (isLoading) return <div className="p-2 dim">{t("calendar.loading")}</div>;

  const zone = TIMEZONES.find((item) => item.id === tz)?.zone;

  return (
    <div>
      <div className="flex gap-1 p-1 items-center flex-wrap">
        <button className={`term-btn ${minImpact === "medium" ? "active" : ""}`} onClick={() => setMinImpact("medium")}>
          {t("calendar.highMed")}
        </button>
        <button className={`term-btn ${minImpact === "all" ? "active" : ""}`} onClick={() => setMinImpact("all")}>
          {t("calendar.all")}
        </button>
        <span className="w-2" />
        <select
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="term-btn !py-0.5 bg-[var(--panel)] cursor-pointer"
        >
          {TIMEZONES.map((item) => (
            <option key={item.id} value={item.id}>
              {t(`calendar.tz.${item.id}` as MessageKey)}
            </option>
          ))}
        </select>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("calendar.date")}</th>
            <th>{t("calendar.currency")}</th>
            <th>{t("calendar.event")}</th>
            <th>{t("calendar.forecast")}</th>
            <th>{t("calendar.previous")}</th>
            <th>{t("calendar.actual")}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={`${e.title}-${e.date}-${i}`}>
              <td className="!text-left dim whitespace-nowrap">
                {formatDateTime(e.date, {
                  timeZone: zone,
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </td>
              <td>{e.country}</td>
              <td className={`!text-left ${IMPACT_CLASS[e.impact]}`}>{e.title}</td>
              <td>{e.forecast ?? "—"}</td>
              <td className="dim">{e.previous ?? "—"}</td>
              <td className={e.actual ? "text-[var(--text)]" : "dim"}>{e.actual ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 && <div className="p-3 dim">{t("calendar.emptyEvents")}</div>}
    </div>
  );
}

const fmtDate = (ts: number | null) => (ts ? formatDate(ts * 1000) : "—");

type EarningsHistoryRow = {
  fiscalQtrEnd: string;
  dateReported: number;
  eps: number | null;
  consensusForecast: number | null;
  surprisePercent: number | null;
  dayAfterChangePercent: number | null;
};

/** Actual vs forecast: beat = green, miss = red, in-line = white. */
function surpriseClass(row: EarningsHistoryRow): string {
  if (row.eps === null || row.consensusForecast === null) return "dim";
  if (row.eps > row.consensusForecast) return "up";
  if (row.eps < row.consensusForecast) return "down";
  return "text-[var(--text)]";
}

function EarningsHistoryRows({ symbol }: { symbol: string }) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["earnings-history", symbol],
    queryFn: () => apiGet<EarningsHistoryRow[]>(`/api/earnings-history/${encodeURIComponent(symbol)}`),
    staleTime: 3_600_000,
  });

  if (error) return <div className="p-2 down">{t("common.error", { message: (error as Error).message })}</div>;
  if (isLoading) return <div className="p-2 dim">{t("calendar.loadingHistory", { symbol })}</div>;
  if (data.length === 0) return <div className="p-2 dim">{t("calendar.emptyHistory", { symbol })}</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{t("calendar.quarter")}</th>
          <th>{t("calendar.reported")}</th>
          <th>{t("calendar.forecast")}</th>
          <th>{t("calendar.actual")}</th>
          <th>{t("calendar.surprise")}</th>
          <th>{t("calendar.dayAfter")}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.dateReported}>
            <td className="!text-left dim">{row.fiscalQtrEnd}</td>
            <td className="!text-left dim">{fmtDate(row.dateReported)}</td>
            <td className="dim">{row.consensusForecast != null ? `$${row.consensusForecast.toFixed(2)}` : "—"}</td>
            <td className={surpriseClass(row)}>{row.eps != null ? `$${row.eps.toFixed(2)}` : "—"}</td>
            <td className={surpriseClass(row)}>{row.surprisePercent != null ? `${fmt(row.surprisePercent, 1)}%` : "—"}</td>
            <td className={pctClass(row.dayAfterChangePercent)}>
              {row.dayAfterChangePercent != null ? `${fmt(row.dayAfterChangePercent, 1)}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EarningsTab() {
  const watchlist = useTerminal((s) => s.watchlist);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["calendar", watchlist],
    queryFn: () => apiGet<EarningsEntry[]>(`/api/calendar?symbols=${symbolsParam(watchlist)}`),
    enabled: watchlist.length > 0,
    staleTime: 3_600_000,
  });

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        if (a.nextEarningsDate === null && b.nextEarningsDate === null) return 0;
        if (a.nextEarningsDate === null) return 1;
        if (b.nextEarningsDate === null) return -1;
        return a.nextEarningsDate - b.nextEarningsDate;
      }),
    [data]
  );

  if (error) return <div className="p-2 down">{t("common.error", { message: (error as Error).message })}</div>;
  if (isLoading) return <div className="p-2 dim">{t("calendar.loadingEarnings")}</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{t("calendar.sym")}</th>
          <th>{t("calendar.lastEarnings")}</th>
          <th>{t("calendar.nextEarnings")}</th>
          <th title={t("calendar.epsEstHint")}>{t("calendar.epsEst")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((e) => (
          <Fragment key={e.symbol}>
            <tr
              onClick={() => setExpanded(expanded === e.symbol ? null : e.symbol)}
              className="cursor-pointer"
              title={t("calendar.historyHint")}
            >
              <td className="!text-left text-[var(--text)] font-bold underline decoration-1">{e.symbol}</td>
              <td className="dim">{fmtDate(e.lastEarningsDate)}</td>
              <td className="amber">{fmtDate(e.nextEarningsDate)}</td>
              <td>{e.epsForecast != null ? `$${e.epsForecast.toFixed(2)}` : "—"}</td>
            </tr>
            {expanded === e.symbol && (
              <tr>
                <td colSpan={4} className="!text-left p-0">
                  <EarningsHistoryRows symbol={e.symbol} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={4} className="dim p-3">
              {t("calendar.emptyEarnings")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function CalendarWidget() {
  const [tab, setTab] = useState<"econ" | "earnings">("econ");

  return (
    <div>
      <div className="flex gap-1 p-1">
        <button className={`term-btn ${tab === "econ" ? "active" : ""}`} onClick={() => setTab("econ")}>
          {t("calendar.economic")}
        </button>
        <button className={`term-btn ${tab === "earnings" ? "active" : ""}`} onClick={() => setTab("earnings")}>
          {t("calendar.earnings")}
        </button>
      </div>
      {tab === "econ" ? <EconomicTab /> : <EarningsTab />}
    </div>
  );
}
