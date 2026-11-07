import type { Metadata } from "next";
import AppNav from "@/components/AppNav/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Italy Trip Planner",
  description: "Browse places in Italy and plan a short trip.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
