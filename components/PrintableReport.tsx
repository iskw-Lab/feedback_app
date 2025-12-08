// components/PrintableReport.tsx
"use client";

import React from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { GamificationCharacter } from "@/components/GamificationCharacter";
import Image from "next/image";

interface PrintableReportProps {
  staffName: string;
  floor: string;
  dateRange?: DateRange;
  chart1Image: string | null; // ★ 画像データURL
  chart2Image: string | null; // ★ 画像データURL
  suggestions: Record<string, string[]>;
  characterScore: number;
  characterLevel: number;
  characterMessage: string;
}

export const PrintableReport = React.forwardRef<
  HTMLDivElement,
  PrintableReportProps
>(
  (
    {
      staffName,
      floor,
      dateRange,
      chart1Image, // ★ propsで受け取る
      chart2Image, // ★ propsで受け取る
      suggestions,
      characterScore,
      characterLevel,
      characterMessage,
    },
    ref,
  ) => {
    const formattedDateRange = dateRange?.from
      ? `${format(dateRange.from, "yyyy/MM/dd")}${
        dateRange.to ? ` - ${format(dateRange.to, "yyyy/MM/dd")}` : ""
      }`
      : "期間未指定";

    const hasSuggestions = Object.keys(suggestions).length > 0;

    return (
      <div ref={ref} className="print-a4-container bg-white p-6">
        {/* --- ヘッダー --- */}
        <div className="text-center mb-4 border-b pb-3">
          <h1 className="text-xl font-bold mb-0.5 print:text-lg">
            フィードバックレポート
          </h1>
          <div className="text-lg font-semibold text-gray-700 print:text-base">
            {staffName} さん ({floor})
          </div>
          <div className="text-xs text-gray-500 print:text-xs">
            対象期間: {formattedDateRange}
          </div>
          <div className="absolute top-0 left-0 flex items-center print:static print:flex print:items-center print:justify-start print:w-full print:mb-2">
            <div className="w-16 h-16 mr-2 print:w-12 print:h-12 print:mr-1">
              <GamificationCharacter
                score={characterScore}
                level={characterLevel}
                hideScore={true}
                hideLevel={true}
                imageOnly={true}
                message={characterMessage} // ★ この行を追加 ★
              />
            </div>
            <div className="text-sm font-semibold text-gray-700 print:text-xs">
              レベル: {characterLevel}
            </div>
          </div>
        </div>

        {/* --- Chart Image Section --- */}
        <div className="mb-4 page-break-avoid">
          <h2 className="text-lg font-semibold mb-2 text-center border-b pb-1 print:text-base">
            記録傾向
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* ▼ チャート1を画像で表示 ▼ */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-1 print:text-xs">
                個人 vs フロア平均
              </h3>
              {chart1Image
                ? (
                  // 通常の img タグ
                  <img
                    src={chart1Image}
                    alt="記録傾向チャート"
                    className="w-full h-auto max-w-full print:max-w-[320px] print:mx-auto" // サイズ調整
                  />
                  // next/image を使う場合 (width/height は canvas の scale を考慮して調整)
                  // <Image src={chart1Image} alt="記録傾向チャート" width={640} height={360} style={{ width: '100%', height: 'auto', maxWidth: '320px', margin: 'auto' }} />
                )
                : (
                  <div className="h-[180px] flex items-center justify-center border bg-gray-100 text-gray-500 text-xs">
                    画像生成エラー
                  </div>
                )}
            </div>
            {/* ▼ チャート2を画像で表示 ▼ */}
            <div className="text-center">
              <h3 className="text-sm font-medium mb-1 print:text-xs">
                フロア全体の傾向
              </h3>
              {chart2Image
                ? (
                  <img
                    src={chart2Image}
                    alt="フロア全体の傾向チャート"
                    className="w-full h-auto max-w-full print:max-w-[320px] print:mx-auto" // サイズ調整
                  />
                  // next/image を使う場合
                  // <Image src={chart2Image} alt="フロア全体の傾向チャート" width={640} height={360} style={{ width: '100%', height: 'auto', maxWidth: '320px', margin: 'auto' }} />
                )
                : (
                  <div className="h-[180px] flex items-center justify-center border bg-gray-100 text-gray-500 text-xs">
                    画像生成エラー
                  </div>
                )}
            </div>
            {/* ▲ 画像表示に変更 ▲ */}
          </div>
        </div>

        {/* --- 関連ケアプランセクション --- */}
        {hasSuggestions && (
          <div className="mb-4 page-break-avoid">
            <h2 className="text-lg font-semibold mb-2 text-center border-b pb-1 print:text-base">
              関連するケアプランの視点
            </h2>
            <div className="space-y-2">
              {Object.entries(suggestions).map(([residentName, plans]) => (
                <div
                  key={residentName}
                  className="p-1.5 border rounded-md bg-gray-50/50 print:p-1"
                >
                  <h4 className="font-bold text-sm text-gray-800 print:text-xs">
                    {residentName}さん
                  </h4>
                  <ul className="mt-0.5 list-disc pl-4 space-y-0 text-gray-700 text-xs print:text-xxs print:pl-3">
                    {Array.isArray(plans) &&
                      plans.map((plan, index) => <li key={index}>{plan}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 印刷用スタイル --- */}
        <style jsx global>
          {`
          /* 基本のA4コンテナスタイル */
         /* 画像のスタイル調整 */
            .print-a4-container img {
                display: block;
                max-width: 100%;
                height: auto;
                object-fit: contain;
            }
             .print\\:max-w-\\[320px\\] { max-width: 320px !important; }
             .print\\:mx-auto { margin-left: auto !important; margin-right: auto !important; }
             
             /* ▼▼▼ 新しいキャラクター表示のスタイル調整 ▼▼▼ */
             .print-a4-container .absolute.top-0.left-0 {
                position: static !important; /* 印刷時には通常フローに戻す */
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important; /* 左寄せ */
                width: 100% !important; /* 幅を確保 */
                margin-bottom: 8px !important; /* 他の要素との間に少しスペース */
                padding-top: 0 !important; /* パディングをリセット */
                padding-left: 0 !important;
                z-index: auto !important; /* Z-indexもリセット */
             }
             .print-a4-container .absolute.top-0.left-0 > div:first-child { /* 画像コンテナ */
                 width: 48px !important; /* 印刷時の画像幅 */
                 height: 48px !important; /* 印刷時の画像高さ */
                 margin-right: 4px !important; /* 画像とテキストの間隔 */
             }
             .print-a4-container .absolute.top-0.left-0 > div:last-child { /* レベルテキスト */
                 font-size: 0.75rem !important; /* 印刷時のフォントサイズ */
                 line-height: 1rem !important;
             }
             /* ▲▲▲ 新しいキャラクター表示のスタイル調整 ▲▲▲ */
          }
        `}
        </style>
      </div>
    );
  },
);

PrintableReport.displayName = "PrintableReport";
