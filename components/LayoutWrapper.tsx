"use client";

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ログインページでは共通レイアウトを表示しない
  if (pathname === '/') {
    return <>{children}</>;
  }

  // それ以外のページで共通レイアウトを適用
  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
        {children}
      </main>
    </div>
  );
}