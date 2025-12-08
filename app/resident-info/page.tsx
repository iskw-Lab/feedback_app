"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmotionPieChart } from "@/components/EmotionPieChart"; // 既存コンポーネント
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  Users,
} from "lucide-react";

// Custom Hooks & Utilities
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAnalysisData } from "./_hooks/useAnalysisData";

// Custom Components (分離したもの)
import { RecipientSidebar } from "./_components/RecipientSidebar";
import { ComparisonDialog } from "./_components/ComparisonDialog";

// Types
import { Recipient } from "./types";

export default function ResidentInfoPage() {
  const router = useRouter();
  const supabase = createClient();
  const isMobile = useMediaQuery("(max-width: 1024px)");

  // --- 1. UI State ---
  const [loading, setLoading] = useState(true);
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  
  // 選択状態・フィルタリング
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 表示対象月
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- 2. Custom Hooks (データ取得ロジックの呼び出し) ---
  // APIからのデータ取得・加工はすべてこのフックにお任せ
  const { 
    emotionData, 
    personalRecords, 
    isDetailsLoading 
  } = useAnalysisData(currentMonth, selectedRecipient);

  // --- 3. 副作用 (利用者一覧の取得) ---
  // ※ ここも useRecipients フックに分離可能ですが、今回はpage内に残しています
  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const response = await fetch("/api/recipients");
        if (!response.ok) throw new Error("利用者情報の取得に失敗しました");
        const data = await response.json();
        setAllRecipients(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipients();
  }, [router, supabase]);

  // --- 4. 派生データの計算 (フィルタリングなど) ---
  const availableFloors = useMemo(
    () => ["all", ...new Set(allRecipients.map((r) => r.floor))],
    [allRecipients]
  );

  const filteredRecipients = useMemo(() => {
    return allRecipients
      .filter((r) => selectedFloor === "all" || r.floor === selectedFloor)
      .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allRecipients, selectedFloor, searchQuery]);

  // --- 5. イベントハンドラ ---
  const handleBackToDashboard = () => router.push("/dashboard");

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((current) =>
      direction === "prev" ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  // --- 6. レンダリング ---
  if (loading) return <LoadingSpinner />;

  // サイドバーコンポーネント (PC/Mobile共通で使用)
  const SidebarElement = (
    <RecipientSidebar
      filteredRecipients={filteredRecipients}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectedFloor={selectedFloor}
      setSelectedFloor={setSelectedFloor}
      availableFloors={availableFloors}
      selectedRecipient={selectedRecipient}
      onRecipientSelect={setSelectedRecipient}
      isMobile={isMobile}
    />
  );

  return (
    <div className="lg:flex min-h-screen bg-gray-50 lg:overflow-hidden">
      {/* PC用サイドバー */}
      {!isMobile && (
        <aside className="w-80 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              利用者一覧
            </h2>
          </div>
          {SidebarElement}
        </aside>
      )}

      {/* メインコンテンツエリア */}
      <main className="flex-1 lg:overflow-y-auto p-4 lg:p-6">
        <div className="container mx-auto max-w-4xl">
          
          {/* モバイル用ヘッダー */}
          {isMobile && (
            <header className="flex items-center justify-between mb-4">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>利用者一覧</DrawerTitle>
                    <DrawerDescription>
                      表示したい利用者を選択してください。
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex flex-col h-[60vh]">
                    {SidebarElement}
                  </div>
                </DrawerContent>
              </Drawer>
              <h1 className="text-lg font-bold text-gray-800 truncate">
                {selectedRecipient
                  ? `${selectedRecipient.name}さんの情報`
                  : "利用者を選択"}
              </h1>
              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </header>
          )}

          {/* PC用ヘッダー & 比較ボタン */}
          {!isMobile && (
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                {selectedRecipient && (
                  <>
                    <span className="text-green-600">
                      {selectedRecipient.name}
                    </span>
                    さんの情報
                  </>
                )}
              </h1>

              {/* ★★★ 比較機能 (分離済みコンポーネント) ★★★ */}
              <ComparisonDialog selectedRecipient={selectedRecipient} />
            </div>
          )}

          {/* コンテンツ表示エリア */}
          <div className="space-y-6">
            {!selectedRecipient ? (
              <div className="flex flex-col items-center justify-center h-[80vh]">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-400" />
                  <h2 className="mt-4 text-2xl font-semibold text-gray-800">
                    利用者名を選択してください
                  </h2>
                  <p className="mt-2 text-gray-500">
                    {isMobile
                      ? "左上のメニューから利用者名を選択してください。"
                      : "左のリストから利用者名を選択してください。"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 月選択ナビゲーション */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMonthChange("prev")}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-2xl font-bold">
                    {format(currentMonth, "yyyy年 M月", { locale: ja })}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMonthChange("next")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* データ表示部分 */}
                {isDetailsLoading ? (
                  <div className="flex justify-center p-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {/* 感情分析円グラフ */}
                    <Card>
                      <CardHeader>
                        <CardTitle>感情の割合</CardTitle>
                        <CardDescription>
                          {selectedRecipient.name}さんの
                          {format(currentMonth, "M月", { locale: ja })}
                          の記録における感情の分布です。
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* EmotionPieChart は既存のまま利用 */}
                        <EmotionPieChart data={emotionData} />
                      </CardContent>
                    </Card>

                    {/* パーソナル記録リスト */}
                    {/* ここも本来は <PersonalRecordList /> に分離できますが、今回はインラインで記述 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>パーソナル記録</CardTitle>
                        <CardDescription>
                          {selectedRecipient.name}さんの
                          {format(currentMonth, "M月", { locale: ja })}
                          のパーソナル情報に関連する記録です。
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {personalRecords.length > 0 ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {personalRecords.map((rec, i) => (
                              <div
                                key={i}
                                className="p-3 bg-gray-50/80 rounded-md border text-sm"
                              >
                                <p className="font-semibold text-gray-500">
                                  {rec.time}
                                </p>
                                <p className="mt-1 text-gray-800">
                                  {rec.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            この期間のパーソナル記録はありません。
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}