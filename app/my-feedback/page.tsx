"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { DateRange } from "react-day-picker";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { RadarChartComponent } from "@/components/RadarChartComponent";
import { GoalManager } from "@/components/GoalManager";

// Custom Components (分離したもの)
import { ChecklistViewer } from "./_components/ChecklistViewer";
import { ResidentRecordList } from "./_components/ResidentRecordList";

// Custom Hooks (分離したもの)
import { useMyProfile } from "./_hooks/useMyProfile";
import { useAnalysisData } from "./_hooks/useAnalysisData";
import { useChecklistData } from "./_hooks/useChecklistData";

export default function MyFeedbackPage() {
  const router = useRouter();
  
  // --- 1. UI State ---
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const printRef = useRef<HTMLDivElement>(null);

  // --- 2. Custom Hooks (ロジックの呼び出し) ---
  
  // プロフィール情報の取得
  const { staffProfile, setStaffProfile, loading: profileLoading } = useMyProfile();

  // 分析データの取得・計算
  const {
    chartData,
    isProcessing,
    processError,
    noDataMessage,
    weakestCategory,
    planSuggestions,
    residentRecordInfo,
  } = useAnalysisData(date, staffProfile?.floor || "", staffProfile?.name || "");

  // チェックリストデータの取得
  const {
    checklistSubmission,
    categorizedAnswers,
    isLoading: checklistLoading
  } = useChecklistData(staffProfile?.id || "");

  // --- 3. イベントハンドラ ---

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${staffProfile?.name || "スタッフ"}_フィードバックレポート`,
  });

  const handleNavigateToChecklist = () => {
    if (staffProfile?.id) {
      router.push(`/checklist/${staffProfile.id}`);
    }
  };

  const handleGoalComplete = async (rewardXp: number) => {
    // プロフィールの経験値を更新するロジックは useMyProfile 側に持たせることも可能ですが、
    // 汎用性を保つため、ここではState更新関数を利用します。
    // (実際のDB更新ロジックは GoalManager 内部または useMyProfile に実装を推奨)
    if (!staffProfile) return;
    
    // 簡易的なローカルState更新
    setStaffProfile((prev) => {
        if (!prev) return null;
        return {
            ...prev,
            experience_points: (prev.experience_points || 0) + rewardXp
        };
    });
  };

  // --- 4. レンダリング ---
  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {staffProfile?.name}さんのフィードバック
        </h1>
        <div style={{ width: "150px" }}></div>
      </div>

      {/* 期間選択 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>期間選択</CardTitle>
          <CardDescription>
            フィードバックを表示したい期間を選択してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker date={date} onDateChange={setDate} />
        </CardContent>
      </Card>

      {/* 読み込み中・エラー表示 */}
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

      {processError && (
        <Card className="border-destructive bg-red-50">
          <CardHeader>
            <CardTitle className="text-destructive">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{processError}</p>
          </CardContent>
        </Card>
      )}

      {/* メインコンテンツ */}
      {chartData && !isProcessing && (
        <div className="space-y-6">
          {/* 印刷対象エリア */}
          <div ref={printRef} className="printable-content">
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-green-50 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>{staffProfile?.name}さんの評価結果</CardTitle>
                  <CardDescription>
                    {date?.from ? format(date.from, "yyyy/MM/dd", { locale: ja }) : ""}
                    {date?.to ? ` - ${format(date.to, "yyyy/MM/dd", { locale: ja })}` : ""}
                  </CardDescription>
                </div>
                {/* 印刷ボタン等をここに配置しても良い */}
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4">
                    あなたの記録傾向（フロア平均との比較）
                  </h3>
                  <div className="h-80 w-full">
                    <RadarChartComponent
                      data={chartData.chartData1}
                      individualName={staffProfile?.name || "あなた"}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-4">
                    {staffProfile?.floor}全体の記録傾向
                  </h3>
                  <div className="h-80 w-full">
                    <RadarChartComponent
                      data={chartData.chartData2}
                      individualName={`${staffProfile?.floor}の傾向`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ケアプラン提案 */}
          {Object.keys(planSuggestions).length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-xl font-semibold mb-4 text-center">
                <span className="text-red-500 font-bold">
                  {`「${weakestCategory}」`}
                </span>{" "}
                に関連するケアプランの視点
              </h3>
              <div className="space-y-4 max-h-60 overflow-y-auto p-2 bg-gray-50/50 rounded">
                {Object.entries(planSuggestions).map(([residentName, plans]) => (
                  <div key={residentName} className="p-3 border rounded-md bg-white shadow-sm">
                    <h4 className="font-bold text-lg text-gray-800">{residentName}さん</h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-gray-700">
                      {plans.map((plan, index) => (
                        <li key={index}>{plan}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2カラムレイアウト: 目標管理 & チェックリスト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>あなたの目標管理</CardTitle>
                <CardDescription>
                  個人目標の達成状況を確認・管理できます。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {staffProfile?.id ? (
                  <GoalManager
                    profileId={staffProfile.id}
                    onGoalComplete={handleGoalComplete}
                  />
                ) : (
                  <div className="flex justify-center p-4">
                    <LoadingSpinner />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* チェックリストコンポーネント (HooksとComponentsの分離効果) */}
            <ChecklistViewer
              isLoading={checklistLoading}
              submissionDate={checklistSubmission?.submitted_at}
              answers={categorizedAnswers}
              onNavigate={handleNavigateToChecklist}
            />
          </div>

          {/* 利用者ごとの記録詳細コンポーネント */}
          <ResidentRecordList records={residentRecordInfo} />
        </div>
      )}
    </div>
  );
}