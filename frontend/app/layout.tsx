import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "x402 Demo — HTTP-Native Payments Protocol",
  description:
    "Interactive demo showcasing x402, the open payment standard for internet-native payments. Built on HTTP 402.",
  keywords: ["x402", "payments", "HTTP 402", "crypto", "USDC", "Base", "Coinbase", "stablecoin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="bg-glow bg-glow-3" />
        <div className="page-wrapper">{children}</div>
      </body>
    </html>
  );
}
