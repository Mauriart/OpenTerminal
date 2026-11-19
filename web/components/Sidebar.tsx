"use client";

import { navLabel, t } from "../lib/i18n";
import { useTerminal, type WidgetType } from "../store/terminal";

const ITEMS: Array<{ type: WidgetType; key: string }> = [
  { type: "chart", key: "⌥1" },
  { type: "quote", key: "⌥2" },
  { type: "news", key: "⌥3" },
  { type: "screener", key: "⌥4" },
  { type: "heatmap", key: "⌥5" },
  { type: "crypto", key: "⌥6" },
  { type: "options", key: "⌥7" },
  { type: "portfolio", key: "⌥8" },
  { type: "ai", key: "⌥9" },
  { type: "watchlist", key: "" },
  { type: "macro", key: "" },
  { type: "calendar", key: "" },
  { type: "insider", key: "" },
  { type: "tv", key: "" },
  { type: "recap", key: "" },
];

const DAYTRADE: Array<{ type: WidgetType; key: string }> = [
  { type: "dtscan", key: "" },
  { type: "dtplan", key: "" },
  { type: "dttime", key: "" },
  { type: "dtrisk", key: "" },
  { type: "dtalerts", key: "" },
  { type: "dtanalyst", key: "" },
  { type: "dtcongress", key: "" },
];

export default function Sidebar() {
  const addWidget = useTerminal((s) => s.addWidget);
  const resetWorkspace = useTerminal((s) => s.resetWorkspace);

  return (
    <nav className="w-32 bg-[var(--panel)] border-r border-[var(--border)] flex flex-col shrink-0 overflow-hidden">
      <div className="dim px-2 py-1 text-[10px] uppercase tracking-wider border-b border-[var(--border)]">
        {t("nav.add")}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {ITEMS.map((item) => (
          <button
            key={item.type}
            onClick={() => addWidget(item.type)}
            className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-[#1a1a1a] hover:text-[var(--amber)] flex justify-between"
          >
            <span>{navLabel(item.type)}</span>
            <span className="dim text-[9px]">{item.key}</span>
          </button>
        ))}
        <div className="dim px-2 py-1 text-[9px] uppercase tracking-wider border-t border-[var(--border)]">{t("dt.group")}</div>
        {DAYTRADE.map((item) => (
          <button
            key={item.type}
            onClick={() => addWidget(item.type)}
            className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-[#1a1a1a] hover:text-[var(--amber)]"
          >
            {navLabel(item.type)}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-[var(--border)]">
        <button
          onClick={resetWorkspace}
          className="w-full text-left px-2 py-1.5 text-[11px] dim hover:text-[var(--down)]"
        >
          {t("nav.reset")}
        </button>
      </div>
    </nav>
  );
}
