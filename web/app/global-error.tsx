"use client";

import "./globals.css";
import { locale, t } from "../lib/i18n";

// Last-resort fallback when the root layout itself throws; replaces <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang={locale === "es" ? "es" : "en"}>
      <body>
        <div className="p-4 flex flex-col gap-2 items-start">
          <span className="down">{t("error.terminal", { message: error.message })}</span>
          <button onClick={reset} className="dim hover:text-[var(--amber)]">
            {t("common.retry")}
          </button>
        </div>
      </body>
    </html>
  );
}
