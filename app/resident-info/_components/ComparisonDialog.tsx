import { useState } from "react";
import { format, differenceInCalendarMonths, eachMonthOfInterval } from "date-fns";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // ★追加

// UI Components
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import { EmotionLineChart } from "./EmotionLineChart";
import { Recipient, MonthlyEmotionData } from "../types";

type Props = {
  selectedRecipient: Recipient | null;
};

export const ComparisonDialog = ({ selectedRecipient }: Props) => {
  const supabase = createClient(); // ★追加

  const [isOpen, setIsOpen] = useState(false);
  const [startYear, setStartYear] = useState<string | undefined>();
  const [startMonth, setStartMonth] = useState<string | undefined>();
  const [endYear, setEndYear] = useState<string | undefined>();
  const [endMonth, setEndMonth] = useState<string | undefined>();
  const [lineChartData, setLineChartData] = useState<MonthlyEmotionData[]>([]);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  const handleFetchComparisonData = async () => {
    if (!startYear || !startMonth || !endYear || !endMonth || !selectedRecipient) {
      setDateRangeError("開始年月と終了年月の両方を選択してください。");
      return;
    }

    const comparisonStartMonth = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
    const comparisonEndMonth = new Date(parseInt(endYear), parseInt(endMonth) - 1, 1);

    if (comparisonEndMonth < comparisonStartMonth) {
      setDateRangeError("終了年月は開始年月より後にしてください。");
      return;
    }

    const diffInMonths = differenceInCalendarMonths(comparisonEndMonth, comparisonStartMonth);
    if (diffInMonths >= 12) {
      setDateRangeError("比較範囲は1年（12ヶ月）以内にしてください。");
      return;
    }

    setIsCompareLoading(true);
    setLineChartData([]);
    setDateRangeError(null);

    const monthsToFetch = eachMonthOfInterval({ start: comparisonStartMonth, end: comparisonEndMonth });
    const floorPart = selectedRecipient.floor === "小規模多機能" ? "shokibo" : selectedRecipient.floor;
    const collectedData: MonthlyEmotionData[] = [];

    // ★★★ 修正箇所: API呼び出しをやめてSupabase Storageから取得 ★★★
    for (const month of monthsToFetch) {
      const yearMonth = format(month, "yyyyMM");
      const fileName = `${yearMonth}_${floorPart}_analysis.json`;

      // デフォルト値
      let monthEmotions = { positive: 0, negative: 0, neutral: 0 };

      try {
        const { data, error } = await supabase.storage
          .from("analysis-data")
          .download(fileName);

        if (!error) {
          const text = await data.text();
          let rawData: any[] = [];
          
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) rawData = parsed;
            else if (parsed && Array.isArray(parsed.data)) rawData = parsed.data;
          } catch (e) {
            console.error("JSON Parse Error:", e);
          }

          // 該当利用者のデータを抽出
          const targetName = selectedRecipient.name.trim().replace(/\s+/g, "");
          
          const residentRecords = rawData.filter((record: any) => {
             const recordName = ((record["利用者苗字"]||"") + (record["利用者名前"]||"")).trim().replace(/\s+/g, "");
             return recordName === targetName;
          });

          // 集計
          residentRecords.forEach((record: any) => {
            Object.keys(record).forEach((key) => {
              if (key.startsWith("emotion") && record[key]) {
                const val = record[key] as keyof typeof monthEmotions;
                if (monthEmotions[val] !== undefined) monthEmotions[val]++;
              }
            });
          });
        }
      } catch (error) {
        console.error(`Fetch error for ${fileName}:`, error);
      }

      collectedData.push({
        month: format(month, "yyyy-MM"),
        ...monthEmotions
      });
    }

    setLineChartData(collectedData);
    setIsCompareLoading(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setDateRangeError(null);
          setLineChartData([]);
          setIsCompareLoading(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!selectedRecipient}>
          <History className="w-4 h-4 mr-2" />
          過去データと比較
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>感情データの時系列比較</DialogTitle>
          <DialogDescription>
            {selectedRecipient?.name}さんの感情記録の推移を表示します。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 日付選択エリア */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
             <Select value={startYear} onValueChange={setStartYear}>
               <SelectTrigger className="w-[90px]"><SelectValue placeholder="年" /></SelectTrigger>
               <SelectContent>{years.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
             </Select>
             <Select value={startMonth} onValueChange={setStartMonth}>
               <SelectTrigger className="w-[70px]"><SelectValue placeholder="月" /></SelectTrigger>
               <SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
             </Select>
             <span>〜</span>
             <Select value={endYear} onValueChange={setEndYear}>
               <SelectTrigger className="w-[90px]"><SelectValue placeholder="年" /></SelectTrigger>
               <SelectContent>{years.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
             </Select>
             <Select value={endMonth} onValueChange={setEndMonth}>
               <SelectTrigger className="w-[70px]"><SelectValue placeholder="月" /></SelectTrigger>
               <SelectContent>{months.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
             </Select>
             
             <Button onClick={handleFetchComparisonData} disabled={isCompareLoading} size="sm">
               {isCompareLoading ? "取得中..." : "データ取得"}
             </Button>
          </div>

          {dateRangeError && <p className="text-sm text-red-500">{dateRangeError}</p>}

          <div className="w-full h-[320px] pt-4">
            {isCompareLoading ? (
              <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
            ) : (
              <EmotionLineChart data={lineChartData} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};