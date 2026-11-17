import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { locale, t } from "../lib/i18n";

export const metadata: Metadata = {
  title: "OpenTerminal",
  description: t("meta.description"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale === "es" ? "es" : "en"}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
