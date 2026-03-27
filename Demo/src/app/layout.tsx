import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "旅行小算盘 | 智能旅行预算",
  description: "输入目的地、人数与天数，生成行程与预算草案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col items-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
