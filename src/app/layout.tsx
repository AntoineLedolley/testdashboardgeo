import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeAI — AI-Powered Trading Terminal",
  description: "Real-time charts with AI financial analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
