import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "خرید V2Ray",
  description: "خرید کانفیگ V2Ray — پرداخت امن TetraPay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
