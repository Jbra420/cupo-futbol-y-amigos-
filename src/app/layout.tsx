import { APP_NAME } from "@/lib/brand";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: `${APP_NAME} · Organiza tu próximo partido`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Organiza el partido, comparte el enlace y completa los cupos. Más fútbol con tus amigos, menos mensajes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
