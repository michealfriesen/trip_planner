import type { Metadata } from "next";
import AppNav from "@/components/AppNav/AppNav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Italy Trip Planner",
  description: "Browse places in Italy and plan a short trip.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The init script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
