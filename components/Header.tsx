"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ★★★ ここからが修正箇所 ★★★
  useEffect(() => {
    // 最初に現在のユーザー情報を取得しようと試みる
    const fetchInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
      }
    };

    fetchInitialUser();

    // ログイン状態の変化を監視するリスナーを設定
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user;
        setEmail(user ? user.email ?? null : null);
      },
    );

    // コンポーネントが不要になったらリスナーを解除する
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);
  // ★★★ ここまでが修正箇所 ★★★

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-green-700 px-4 text-white shadow-md">
      <div className="flex items-center gap-4">
        {!isMounted ? (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-green-600 hover:text-white"
            disabled 
          >
            <Menu className="h-6 w-6" />
          </Button>
        ) : (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-green-600 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              {/* ★ 修正2: アクセシビリティ対応 (見た目は非表示) ★ */}
              <SheetTitle className="sr-only">ナビゲーションメニュー</SheetTitle>
              <SheetDescription className="sr-only">
                サイト内のリンク一覧です
              </SheetDescription>
              
              <Sidebar onClose={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold cursor-pointer"
        >
          <Home className="h-6 w-6" />
          介護スタッフフィードバック
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {email && (
          <span className="hidden sm:inline text-sm font-medium">
            {email}
          </span>
        )}
        <UserCircle className="h-8 w-8" />
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="hover:bg-green-600 hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
