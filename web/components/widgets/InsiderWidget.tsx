"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, fmt, fmtBig } from "../../lib/api";
import { t, type MessageKey } from "../../lib/i18n";
import { useWidgetSymbol, type WidgetInstance } from "../../store/terminal";

type InsiderTransaction = {
  filingDate: string;
  transactionDate: string;
  ownerName: string;
  ownerTitle: string | null;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  transactionCode: string;
  acquiredDisposed: "A" | "D" | null;
  shares: number | null;
  pricePerShare: number | null;
  value: number | null;
  sharesOwnedAfter: number | null;
};

// SEC's single-letter transaction codes, the ones that actually show up in practice.
const CODE_KEYS = ["P", "S", "A", "M", "G", "F", "C", "D"] as const;

function codeLabel(code: string): string {
  return (CODE_KEYS as readonly string[]).includes(code) ? t(`insider.code.${code}` as MessageKey) : code;
}

export default function InsiderWidget({ widget }: { widget: WidgetInstance }) {
  const symbol = useWidgetSymbol(widget);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["insider", symbol],
    queryFn: () => apiGet<InsiderTransaction[]>(`/api/insider/${encodeURIComponent(symbol)}`),
    staleTime: 3_600_000,
  });

  if (error) return <div className="p-2 down">{t("common.error", { message: (error as Error).message })}</div>;
  if (isLoading) return <div className="p-2 dim">{t("insider.loading", { symbol })}</div>;

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("insider.date")}</th>
            <th>{t("insider.insider")}</th>
            <th>{t("insider.title")}</th>
            <th>{t("insider.type")}</th>
            <th>{t("insider.shares")}</th>
            <th>{t("insider.price")}</th>
            <th>{t("insider.value")}</th>
            <th>{t("insider.ownedAfter")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={`${row.ownerName}-${row.transactionDate}-${i}`}>
              <td className="!text-left dim whitespace-nowrap">{row.transactionDate}</td>
              <td className="!text-left">{row.ownerName}</td>
              <td className="!text-left dim truncate max-w-[140px]" title={row.ownerTitle ?? ""}>
                {row.ownerTitle ?? (row.isDirector ? t("insider.director") : row.isTenPercentOwner ? t("insider.tenPercent") : "—")}
              </td>
              <td className={row.acquiredDisposed === "A" ? "up" : row.acquiredDisposed === "D" ? "down" : "dim"}>
                {codeLabel(row.transactionCode)}
              </td>
              <td>{fmtBig(row.shares)}</td>
              <td>{fmt(row.pricePerShare)}</td>
              <td>{fmtBig(row.value)}</td>
              <td className="dim">{fmtBig(row.sharesOwnedAfter)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} className="dim p-3">
                {t("insider.empty", { symbol })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
