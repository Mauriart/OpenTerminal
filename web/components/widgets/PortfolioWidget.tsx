"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiPost, apiDelete, fmt, pctClass, type Quote } from "../../lib/api";
import { formatDate, portfolioName, t, tradeSide } from "../../lib/i18n";
import { symbolsParam } from "../../lib/symbol";

type Portfolio = { id: number; name: string };
type Position = { symbol: string; quantity: number; avgCost: number; realizedPnl: number };
type Tx = { id: number; symbol: string; side: string; quantity: number; price: number; executed_at: string };

export default function PortfolioWidget() {
  const qc = useQueryClient();
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [showTx, setShowTx] = useState(false);
  const [form, setForm] = useState({ symbol: "", side: "BUY", quantity: "", price: "" });

  const { data: portfolios = [] } = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiGet<Portfolio[]>("/api/portfolios"),
  });
  const pid = portfolioId ?? portfolios[0]?.id;

  const { data: positions = [] } = useQuery({
    queryKey: ["positions", pid],
    queryFn: () => apiGet<Position[]>(`/api/portfolios/${pid}/positions`),
    enabled: !!pid,
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", pid],
    queryFn: () => apiGet<Tx[]>(`/api/portfolios/${pid}/transactions`),
    enabled: !!pid && showTx,
  });

  const symbols = positions.map((p) => p.symbol);
  const { data: quotes = [] } = useQuery({
    queryKey: ["pf-quotes", symbols.join(",")],
    queryFn: () => apiGet<Quote[]>(`/api/quotes?symbols=${symbolsParam(symbols)}`),
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
  });

  const addTx = useMutation({
    mutationFn: () =>
      apiPost(`/api/portfolios/${pid}/transactions`, {
        symbol: form.symbol,
        side: form.side,
        quantity: Number(form.quantity),
        price: Number(form.price),
        executed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions", pid] });
      qc.invalidateQueries({ queryKey: ["transactions", pid] });
      setForm({ symbol: "", side: "BUY", quantity: "", price: "" });
    },
  });

  const totals = positions.reduce(
    (acc, p) => {
      const q = quotes.find((x) => x.symbol === p.symbol);
      const mv = (q?.price ?? p.avgCost) * p.quantity;
      acc.marketValue += mv;
      acc.cost += p.avgCost * p.quantity;
      acc.realized += p.realizedPnl;
      return acc;
    },
    { marketValue: 0, cost: 0, realized: 0 }
  );
  const unrealized = totals.marketValue - totals.cost;

  return (
    <div>
      <div className="flex gap-2 p-1 items-center flex-wrap">
        <select value={pid ?? ""} onChange={(e) => setPortfolioId(Number(e.target.value))}>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>{portfolioName(p.name)}</option>
          ))}
        </select>
        <button className={`term-btn ${showTx ? "active" : ""}`} onClick={() => setShowTx(!showTx)}>
          {t("portfolio.transactions")}
        </button>
        <span className="ml-auto">
          {t("portfolio.marketValue")} <span className="amber">{fmt(totals.marketValue)}</span>{" "}
          <span className="dim">{t("portfolio.unrealized")}</span> <span className={pctClass(unrealized)}>{fmt(unrealized)}</span>{" "}
          <span className="dim">{t("portfolio.realized")}</span> <span className={pctClass(totals.realized)}>{fmt(totals.realized)}</span>
        </span>
      </div>

      <form
        className="flex gap-1 p-1 border-b border-[var(--border)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.symbol && form.quantity && form.price) addTx.mutate();
        }}
      >
        <input className="w-20" placeholder={t("portfolio.ticker")} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
        <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
          <option value="BUY">{t("portfolio.buy")}</option>
          <option value="SELL">{t("portfolio.sell")}</option>
        </select>
        <input className="w-20" placeholder={t("portfolio.qty")} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input className="w-24" placeholder={t("portfolio.price")} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <button className="term-btn" type="submit">{t("portfolio.add")}</button>
        {addTx.error && <span className="down">{(addTx.error as Error).message}</span>}
      </form>

      {!showTx ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("portfolio.sym")}</th>
              <th>{t("portfolio.qty")}</th>
              <th>{t("portfolio.avgCost")}</th>
              <th>{t("portfolio.last")}</th>
              <th>{t("portfolio.mktVal")}</th>
              <th>{t("portfolio.unrealizedPnl")}</th>
              <th>{t("portfolio.realizedPnl")}</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const q = quotes.find((x) => x.symbol === p.symbol);
              const last = q?.price ?? null;
              const mv = last !== null ? last * p.quantity : null;
              const upnl = last !== null ? (last - p.avgCost) * p.quantity : null;
              return (
                <tr key={p.symbol}>
                  <td className="font-bold">{p.symbol}</td>
                  <td>{fmt(p.quantity, 4)}</td>
                  <td>{fmt(p.avgCost)}</td>
                  <td>{fmt(last)}</td>
                  <td>{fmt(mv)}</td>
                  <td className={pctClass(upnl)}>{fmt(upnl)}</td>
                  <td className={pctClass(p.realizedPnl)}>{fmt(p.realizedPnl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("portfolio.date")}</th>
              <th>{t("portfolio.sym")}</th>
              <th>{t("portfolio.side")}</th>
              <th>{t("portfolio.qty")}</th>
              <th>{t("portfolio.price")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id}>
                <td className="!text-left dim">{formatDate(tx.executed_at)}</td>
                <td className="font-bold">{tx.symbol}</td>
                <td className={tx.side === "BUY" ? "up" : "down"}>{tradeSide(tx.side)}</td>
                <td>{fmt(tx.quantity, 4)}</td>
                <td>{fmt(tx.price)}</td>
                <td>
                  <button
                    title={t("portfolio.delete")}
                    className="dim hover:text-[var(--down)]"
                    onClick={async () => {
                      await apiDelete(`/api/portfolios/${pid}/transactions/${tx.id}`);
                      qc.invalidateQueries({ queryKey: ["positions", pid] });
                      qc.invalidateQueries({ queryKey: ["transactions", pid] });
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
