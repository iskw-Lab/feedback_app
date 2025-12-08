"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ここを forcedTheme="light" に変更します
    <ThemeProvider attribute="class" forcedTheme="light">
      {children}
    </ThemeProvider>
  );
}