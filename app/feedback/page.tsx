"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { DateRange } from "react-day-picker";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

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
import { RadarChartComponent } from "@/components/RadarChartComponent";
import { GoalManager } from "@/components/GoalManager";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PrintableReport } from "@/components/PrintableReport";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Menu, Printer, Users } from "lucide-react";

// Custom Hooks (分離したもの)
import { useMediaQuery } from "@/hooks/use-media-query";
import { useStaffData } from "./_hooks/useStaffData";
import { useAnalysisData } from "./_hooks/useAnalysisData";
import { useChecklistData } from "./_hooks/useChecklistData";
import { useResidentAnalysis } from "./_hooks/useResidentAnalysis";

// Custom Components (分離したもの)
import { StaffSidebar } from "./_components/StaffSidebar";
import { ChecklistViewer } from "./_components/ChecklistViewer";
import { ResidentRecordList } from "./_components/ResidentRecordList";

// Types
import { StaffMember } from "./types";

function FeedbackInner() {
  // --- 1. UI State (画面の状態管理) ---
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFloor, setFilterFloor] = useState("all");

  // 選択中のスタッフ情報
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // その他UI用
  const [characterMessage, setCharacterMessage] = useState<string>(
    "スタッフを選択してください。"
  );
  const [staffProfile, setStaffProfile] = useState<any>(null); // GoalManager用
  
  // 印刷用画像のState
  const [chart1Image, setChart1Image] = useState<string | null>(null);
  const [chart2Image, setChart2Image] = useState<string | null>(null);

  // --- 2. Custom Hooks & Libs (ロジックの呼び出し) ---
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // A. スタッフデータ取得 & 認証チェック
  const { allStaff, loading: staffLoading } = useStaffData();

  // B. 分析データ取得 & チャート計算
  const {
    analysisData,
    chartData,
    isProcessing,
    noDataMessage,
    lackingCategory,
    weakestCategory,
    totalRecordsForStaff
  } = useAnalysisData(date, selectedFloor, selectedStaffName);

  // C. チェックリストデータ取得
  const { 
    checklistSubmission, 
    categorizedAnswers, 
    isLoading: checklistLoading 
  } = useChecklistData(selectedProfileId);

  // D. 利用者ごとの記録集計 & ケアプラン提案
  const { residentRecordInfo, planSuggestions } = useResidentAnalysis(
    analysisData,
    selectedFloor,
    selectedStaffName,
    weakestCategory
  );

  // --- 3. 副作用 & イベントハンドラ ---

  // スタッフ選択処理
  const handleStaffSelection = (staff: StaffMember) => {
    setSelectedStaffId(staff.id);
    setSelectedStaffName(staff.name);
    setSelectedFloor(staff.floor);
    setSelectedProfileId(staff.profile_id || "");
    setDate(undefined); // 日付リセット
  };

  // URLパラメータからのスタッフ初期選択
  useEffect(() => {
    if (allStaff.length > 0) {
      const staffIdFromUrl = searchParams.get("staffId");
      if (staffIdFromUrl) {
        const target = allStaff.find((s) => s.id === staffIdFromUrl);
        if (target) handleStaffSelection(target);
      }
    }
  }, [searchParams, allStaff]);

  // スタッフプロフィールの取得 (GoalManager用)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!selectedProfileId) {
        setStaffProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("staff_profiles")
          .select("id, experience_points, character_level")
          .eq("id", selectedProfileId)
          .single();
        if (error) throw error;
        setStaffProfile(data);
      } catch (error) {
        console.error("スタッフプロフィールの取得に失敗しました:", error);
        setStaffProfile(null);
      }
    };
    fetchProfile();
  }, [selectedProfileId, supabase]);

  // キャラクターメッセージの更新
  useEffect(() => {
    if (lackingCategory) {
      const messages: { [key: string]: string } = {
        "発話率": "今日は入居者様ともっとお話してみませんか？小さな会話が信頼に繋がります。",
        "パーソナル": "Aさんの好きな食べ物、知っていますか？パーソナルな情報に注目してみましょう。",
        "BADL": "食事や着替えの介助で、新しい工夫ができないか考えてみるのはどうでしょう？",
        "IADL": "買い物や掃除など、入居者様ができることを増やす支援を意識してみましょう。",
        "コミュニケーション": "ご家族との連携や、他のスタッフへの情報共有を工夫すると良いかもしれません。",
        "環境": "居室の環境整備や、共有スペースの安全確認など、周りを見渡してみましょう。",
      };
      setCharacterMessage(
        messages[lackingCategory] || "あなたの強みをさらに伸ばしていきましょう！"
      );
    } else if (selectedStaffName) {
      setCharacterMessage("今日も一日頑張りましょう！");
    } else {
      setCharacterMessage("スタッフを選択するとメッセージが表示されます。");
    }
  }, [lackingCategory, selectedStaffName]);

  // スタッフリストのフィルタリング
  const availableFloors = useMemo(
    () => [...new Set(allStaff.map((s) => s.floor))].filter(Boolean),
    [allStaff]
  );

  const filteredStaffList = useMemo(() => {
    return allStaff
      .filter((s) => filterFloor === "all" || s.floor === filterFloor)
      .filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allStaff, filterFloor, searchQuery]);

  // 目標達成時の処理
  const handleGoalComplete = async (rewardXp: number) => {
    if (!staffProfile) return;
    const LEVEL_THRESHOLDS: { [key: number]: number } = {
      1: 100, 2: 200, 3: 300, 4: 400, 5: 500,
    };
    
    const newXp = (staffProfile.experience_points || 0) + rewardXp;
    let newLevel = staffProfile.character_level || 1;
    const currentLevelThreshold = LEVEL_THRESHOLDS[newLevel];
    
    if (currentLevelThreshold && newXp >= currentLevelThreshold) {
      newLevel += 1;
      alert(`${selectedStaffName}さんのキャラクターが Lv.${newLevel} にレベルアップしました！`);
    }

    setStaffProfile((prev: any) =>
      prev ? { ...prev, experience_points: newXp, character_level: newLevel } : null
    );

    const { error } = await supabase
      .from("staff_profiles")
      .update({ experience_points: newXp, character_level: newLevel })
      .eq("id", staffProfile.id);

    if (error) {
      console.error("経験値の更新に失敗しました:", error);
      alert("経験値の更新に失敗しました。");
    }
  };


  // --- 4. 印刷機能 ---
  const chart1Ref = useRef<HTMLDivElement>(null);
  const chart2Ref = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const reactToPrintHandle = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "フィードバックレポート",
    onBeforeGetContent: async () => {
      return new Promise<void>((resolve) => {
        if (printContainerRef.current) {
          Object.assign(printContainerRef.current.style, {
            display: "block",
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            zIndex: "-1",
          });
        }
        setTimeout(resolve, 100);
      });
    },
    onAfterPrint: () => {
      if (printContainerRef.current) {
        Object.assign(printContainerRef.current.style, {
          display: "none",
          position: "",
          left: "",
          top: "",
          zIndex: "",
        });
      }
    },
  });

  const handlePrint = async () => {
    if (!chartData || !staffProfile) {
      alert("印刷するデータがありません。");
      return;
    }
    if (!chart1Ref.current || !chart2Ref.current) return;

    // チャート描画待ち
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const canvas1 = await html2canvas(chart1Ref.current, { scale: 2, backgroundColor: "#ffffff" });
      setChart1Image(canvas1.toDataURL("image/png"));
      
      const canvas2 = await html2canvas(chart2Ref.current, { scale: 2, backgroundColor: "#ffffff" });
      setChart2Image(canvas2.toDataURL("image/png"));

      // 画像State反映待ち後に印刷実行
      setTimeout(() => {
        if (reactToPrintHandle) reactToPrintHandle();
      }, 200);
    } catch (error) {
      console.error("Error generating chart images:", error);
      alert("チャート画像の生成に失敗しました。");
    }
  };


  // --- 5. レンダリング ---
  if (staffLoading) return <LoadingSpinner />;

  // サイドバー要素（PC/SP共通）
  const SidebarElement = (
    <StaffSidebar
      filteredStaffList={filteredStaffList}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filterFloor={filterFloor}
      setFilterFloor={setFilterFloor}
      availableFloors={availableFloors}
      selectedStaffId={selectedStaffId}
      onStaffSelect={handleStaffSelection}
      isMobile={isMobile}
    />
  );

  return (
    <div className="md:flex h-screen bg-gray-50 overflow-hidden">
      {/* PC用サイドバー */}
      {!isMobile && (
        <aside className="w-80 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              スタッフ一覧
            </h2>
          </div>
          {SidebarElement}
        </aside>
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          
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
                    <DrawerTitle>スタッフ一覧</DrawerTitle>
                    <DrawerDescription>表示したいスタッフを選択してください。</DrawerDescription>
                  </DrawerHeader>
                  <div className="flex flex-col h-[60vh]">
                    {SidebarElement}
                  </div>
                </DrawerContent>
              </Drawer>
              <h1 className="text-xl font-bold text-gray-800 truncate">
                {selectedStaffName ? `${selectedStaffName}さんのFB` : "スタッフ未選択"}
              </h1>
              <div />
            </header>
          )}

          {/* コンテンツエリア */}
          {!selectedStaffId ? (
            <div className="flex flex-col items-center justify-center h-[80vh]">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto text-gray-400" />
                <h2 className="mt-4 text-2xl font-semibold text-gray-800">
                  スタッフを選択してください
                </h2>
                <p className="mt-2 text-gray-500">
                  {isMobile
                    ? "左上のメニューからスタッフを選択してください。"
                    : "左のリストからフィードバックを確認したいスタッフを選択してください。"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {!isMobile && (
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-800">
                    <span className="text-green-600">{selectedStaffName}</span>
                    さんのフィードバック
                  </h1>
                </div>
              )}

              {/* 期間選択カード */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle>データ期間選択</CardTitle>
                  <CardDescription>
                    フィードバックの対象となる期間を選択してください。
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <DateRangePicker date={date} onDateChange={setDate} />
                </CardContent>
              </Card>

              {/* 読み込み中・エラー・データ無し表示 */}
              {isProcessing && (
                <div className="mt-4 flex justify-center items-center p-8">
                  <LoadingSpinner />
                  <span className="ml-2">データを読み込み中...</span>
                </div>
              )}
              
              {noDataMessage && !isProcessing && (
                <Card className="mt-6 border-amber-300 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="text-center text-amber-800 font-medium">
                      <p>{noDataMessage}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* データ表示メインエリア */}
              {chartData && !isProcessing && selectedStaffName && (
                <div className="space-y-6">
                  {/* チャート表示カード */}
                  <Card className="border-2 border-green-200">
                    <CardHeader className="bg-green-50 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>評価結果</CardTitle>
                        <CardDescription>
                          ({date?.from ? format(date.from, "yyyy/MM/dd") : ""}
                          {date?.to ? ` - ${format(date.to, "yyyy/MM/dd")}` : ""})
                        </CardDescription>
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <span className="font-semibold text-gray-700">期間中の総記録数:</span>
                          <span className="ml-2 font-bold text-lg text-green-700">
                            {totalRecordsForStaff || 0}
                          </span>
                          <span className="ml-1 text-gray-600">件</span>
                        </div>
                      </div>
                      {/*<Button onClick={handlePrint} variant="outline" size="sm" className="bg-white">
                        <Printer className="w-4 h-4 mr-2" />印刷
                      </Button>*/}
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="text-center">
                        <h3 className="text-xl font-semibold mb-4">記録傾向チャート</h3>
                        <div ref={chart1Ref} className="h-80 w-full">
                          <RadarChartComponent
                            data={chartData.chartData1}
                            individualName={selectedStaffName}
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-semibold mb-4">フロア全体の傾向</h3>
                        <div ref={chart2Ref} className="h-80 w-full">
                          <RadarChartComponent
                            data={chartData.chartData2}
                            individualName={`${selectedFloor}の傾向`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ケアプラン提案 (存在する場合のみ) */}
                  {Object.keys(planSuggestions).length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="text-xl font-semibold mb-4 text-center">
                        <span className="text-red-500 font-bold">{`「${weakestCategory}」`}</span>
                        に関連するケアプランの視点
                      </h3>
                      <div className="space-y-4 max-h-60 overflow-y-auto p-2 bg-gray-50/50 rounded">
                        {Object.entries(planSuggestions).map(([residentName, plans]) => (
                          <div key={residentName} className="p-3 border rounded-md bg-white shadow-sm">
                            <h4 className="font-bold text-lg text-gray-800">{residentName}さん</h4>
                            <ul className="mt-2 list-disc pl-5 space-y-1 text-gray-700">
                              {Array.isArray(plans) && plans.map((plan, index) => (
                                <li key={index}>{String(plan)}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 目標管理 */}
                    <Card className="border-2 border-green-200">
                      <CardHeader className="bg-green-50">
                        <CardTitle>個人目標の管理</CardTitle>
                        <CardDescription>
                          {selectedStaffName}さんが設定した目標を確認・達成登録できます。
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {selectedProfileId ? (
                          <GoalManager
                            profileId={selectedProfileId}
                            onGoalComplete={handleGoalComplete}
                          />
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            プロフィールIDが設定されていません。
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 自己チェック表（分離済みコンポーネント） */}
                    <ChecklistViewer
                      isLoading={checklistLoading}
                      submissionDate={checklistSubmission?.submitted_at}
                      answers={categorizedAnswers}
                    />
                  </div>

                  {/* 利用者ごとの記録詳細（分離済みコンポーネント） */}
                  <ResidentRecordList
                    staffName={selectedStaffName}
                    records={residentRecordInfo}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 印刷用隠しコンポーネント */}
      <div ref={printContainerRef} style={{ display: "none" }}>
        {chart1Image && chart2Image && staffProfile && (
          <PrintableReport
            ref={printRef}
            staffName={selectedStaffName}
            floor={selectedFloor}
            dateRange={date}
            chart1Image={chart1Image}
            chart2Image={chart2Image}
            suggestions={planSuggestions}
            characterScore={staffProfile.experience_points}
            characterLevel={staffProfile.character_level}
            characterMessage={characterMessage}
          />
        )}
      </div>
    </div>
  );
}

// Default Export
export default function FeedbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FeedbackInner />
    </Suspense>
  );
}