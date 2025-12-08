import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { createClient } from "@/lib/supabase/client";
import {
  excelSerialDateToJSDate,
  processAnalysisData,
} from "../_utils/analysisHelpers";
import { EmotionData, PersonalRecord, ResidentRecordInfo } from "../types";

type UseAnalysisDataResult = {
  analysisData: any[];
  chartData: { chartData1: any[]; chartData2: any[] } | null;
  isProcessing: boolean;
  processError: string;
  noDataMessage: string;
  lackingCategory: string;
  weakestCategory: string;
  totalRecordsForStaff: number;
  planSuggestions: Record<string, string[]>;
  residentRecordInfo: ResidentRecordInfo[];
  characterMessage: string;
};

export const useAnalysisData = (
  date: DateRange | undefined,
  selectedFloor: string,
  selectedStaffName: string,
): UseAnalysisDataResult => {
  // --- State定義 ---
  // ★ SupabaseからDLした生データを保持するキャッシュ
  const [allFloorData, setAllFloorData] = useState<any[]>([]);

  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState("");
  const [noDataMessage, setNoDataMessage] = useState("");
  const [lackingCategory, setLackingCategory] = useState("");
  const [weakestCategory, setWeakestCategory] = useState("");
  const [planSuggestions, setPlanSuggestions] = useState<
    Record<string, string[]>
  >({});
  const [residentRecordInfo, setResidentRecordInfo] = useState<
    ResidentRecordInfo[]
  >([]);
  const [characterMessage, setCharacterMessage] = useState(
    "今日も頑張りましょう！",
  );

  const supabase = createClient();

  // ---------------------------------------------------------
  // 1. ダウンロード担当 (Supabase Storage版)
  //    日付(月)またはフロアが変わった時だけ実行
  // ---------------------------------------------------------
  // ---------------------------------------------------------
  // 1. ダウンロード担当 (Supabase Storage版)
  //    日付(月)またはフロアが変わった時だけ実行
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchFloorData = async () => {
      // 実行条件
      if (!date?.from || !date?.to || !selectedFloor) {
        setAllFloorData([]);
        return;
      }

      setIsProcessing(true);
      setProcessError("");
      
      // デバッグ: 選択されているフロアと日付を確認
      console.log(`[Fetch Start] Floor: ${selectedFloor}, Date: ${date.from.toLocaleDateString()} - ${date.to?.toLocaleDateString()}`);

      try {
        const startDate = date.from;
        const endDate = date.to || startDate;
        const yearMonthsToFetch = new Set<string>();

        // ★★★ 修正箇所 1: 日付計算のバグ修正 (whileループ化) ★★★
        // これにより、31日始まりの月などでも正しく翌月を取得できます
        const current = new Date(startDate);
        current.setDate(1); // 比較用に1日に固定

        const end = new Date(endDate);
        end.setDate(1); // 終了日も1日で比較

        while (current <= end) {
          const ym = `${current.getFullYear()}${(current.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;
          yearMonthsToFetch.add(ym);
          
          // 翌月の1日へ進める
          current.setMonth(current.getMonth() + 1);
        }

        // フロア名の変換処理
        const floorPart = selectedFloor === "小規模多機能"
          ? "shokibo"
          : selectedFloor;

        const fileFetchPromises = Array.from(yearMonthsToFetch).map(
          async (ym) => {
            const fileName = `${ym}_${floorPart}_analysis.json`;
            console.log(`[Downloading] ${fileName}...`);

            // ★★★ 修正箇所 2: Supabase SDKでのダウンロード ★★★
            // バケット名 'analysis-data' が正しいか確認してください
            const { data, error } = await supabase.storage
              .from("analysis-data") 
              .download(fileName);

            if (error) {
              // 400エラーや404エラーが出ても、その月だけスキップして続行する
              console.warn(`Skipping file ${fileName}: ${error.message}`);
              return { data: [] };
            }

            try {
              const text = await data.text();
              const parsed = JSON.parse(text);

              if (Array.isArray(parsed)) {
                return { data: parsed }; 
              } else if (parsed && Array.isArray(parsed.data)) {
                return parsed; 
              } else {
                return { data: [] };
              }
            } catch (e) {
              console.error(`JSON Parse Error for ${fileName}:`, e);
              return { data: [] };
            }
          },
        );

        const results = await Promise.all(fileFetchPromises);
        const combinedData = results.flatMap((result) => result.data || []);

        console.log(`[Fetch Complete] Total records: ${combinedData.length}`);
        setAllFloorData(combinedData);

      } catch (e: any) {
        console.error("Storage Download Error:", e);
        // 全体の取得失敗としてもよいが、一部取得できている可能性もあるためエラー表示は控えめに
        setProcessError(`データの読み込み中にエラーが発生しました`);
        setAllFloorData([]);
      } finally {
        setIsProcessing(false);
      }
    };

    fetchFloorData();
  }, [date?.from, date?.to, selectedFloor, supabase]);

  // ---------------------------------------------------------
  // 2. 計算・抽出担当 (ここは前回と同じ)
  //    生データ or スタッフ名が変わった時に実行
  // ---------------------------------------------------------
  useEffect(() => {
    const processData = () => {
      console.log("All Floor Data Size:", allFloorData.length);
      if (allFloorData.length === 0 || !selectedStaffName || !date?.from) {
        setAnalysisData([]);
        setChartData(null);
        setNoDataMessage(
          allFloorData.length === 0 ? "" : "スタッフを選択してください。",
        );
        return;
      }

      setNoDataMessage("");

      // A. 日付範囲での詳細フィルタリング
      const filteredByDate = allFloorData.filter((row) => {
        const recordTimeValue = row["記録時間"];
        if (!recordTimeValue) return false;

        try {
          let recordDate: Date | null = null;
          if (typeof recordTimeValue === "number") {
            recordDate = excelSerialDateToJSDate(recordTimeValue);
          } else if (typeof recordTimeValue === "string") {
            recordDate = new Date(recordTimeValue);
          }

          if (!recordDate || isNaN(recordDate.getTime())) return false;

          const startDate = date.from!;
          const endDate = date.to || startDate;

          const target = recordDate.getTime();
          const start = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
          ).getTime();
          const end = new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            23,
            59,
            59,
          ).getTime();

          return target >= start && target <= end;
        } catch {
          return false;
        }
      });

      // B. スタッフ名でのフィルタリング
      const cleanStaffName = selectedStaffName.replace(/\s+/g, "");
      const hasStaffData = filteredByDate.some((record) => {
        const recordAuthor =
          ((record["登録者苗字"] || "") + (record["登録者名前"] || "")).trim()
            .replace(/\s+/g, "");
        return recordAuthor === cleanStaffName;
      });

      if (!hasStaffData) {
        setAnalysisData([]);
        setChartData(null);
        setNoDataMessage(
          "選択された期間に、このスタッフの記録データはありません。",
        );
        return;
      }

      setAnalysisData(filteredByDate);
      const processed = processAnalysisData(
        filteredByDate,
        selectedStaffName,
        selectedFloor,
      );
      setChartData(processed);
    };

    processData();
  }, [allFloorData, selectedStaffName, date, selectedFloor]);

  // ---------------------------------------------------------
  // 3. 派生データの計算 (チャートデータ変更時)
  // ---------------------------------------------------------

  useEffect(() => {
    if (chartData?.chartData1 && chartData.chartData1.length > 0) {
      const lowest = chartData.chartData1.reduce((min: any, current: any) =>
        min.individual < current.individual ? min : current
      );
      setWeakestCategory(lowest.subject);
      setLackingCategory(lowest.subject);

      const messages: { [key: string]: string } = {
        "発話率":
          "今日は入居者様ともっとお話してみませんか？小さな会話が信頼に繋がります。",
        "パーソナル":
          "Aさんの好きな食べ物、知っていますか？パーソナルな情報に注目してみましょう。",
        "BADL":
          "食事や着替えの介助で、新しい工夫ができないか考えてみるのはどうでしょう？",
        "IADL":
          "買い物や掃除など、入居者様ができることを増やす支援を意識してみましょう。",
        "コミュニケーション":
          "ご家族との連携や、他のスタッフへの情報共有を工夫すると良いかもしれません。",
        "環境":
          "居室の環境整備や、共有スペースの安全確認など、周りを見渡してみましょう。",
      };
      setCharacterMessage(
        messages[lowest.subject] ||
          "あなたの強みをさらに伸ばしていきましょう！",
      );
    } else {
      setWeakestCategory("");
      setLackingCategory("");
      setCharacterMessage(
        selectedStaffName ? "今日も一日頑張りましょう！" : "",
      );
    }
  }, [chartData, selectedStaffName]);

  // 4. Plan Suggestions
  useEffect(() => {
    if (weakestCategory && selectedFloor) {
      const fetchSuggestions = async () => {
        try {
          const response = await fetch(
            `/api/care-plan-suggestions?floor=${selectedFloor}&category=${weakestCategory}`,
          );
          if (response.ok) {
            setPlanSuggestions(await response.json());
          }
        } catch (error) {
          console.error(error);
          setPlanSuggestions({});
        }
      };
      fetchSuggestions();
    } else {
      setPlanSuggestions({});
    }
  }, [weakestCategory, selectedFloor]);

  // 5. Resident Record Info
  useEffect(() => {
    const calculateInfo = async () => {
      if (analysisData.length === 0 || !selectedFloor || !selectedStaffName) {
        setResidentRecordInfo([]);
        return;
      }
      try {
        const response = await fetch(`/api/residents?floor=${selectedFloor}`);
        if (!response.ok) throw new Error("Failed to fetch residents");
        const residents: { name: string; careplan_icf: any[] | null }[] =
          await response.json();

        const info = residents.map((resident) => {
          const recordsForResident = analysisData.filter((record) => {
            const residentNameInRecord =
              ((record["利用者苗字"] || "") + (record["利用者名前"] || ""))
                .trim().replace(/\s+/g, "");
            const isResidentMatch =
              residentNameInRecord === resident.name.replace(/\s+/g, "");
            const recordAuthor =
              ((record["登録者苗字"] || "") + (record["登録者名前"] || ""))
                .trim().replace(/\s+/g, "");
            const isAuthorMatch =
              recordAuthor === selectedStaffName.replace(/\s+/g, "");
            return isResidentMatch && isAuthorMatch;
          });

          const totalRecords = recordsForResident.length;
          let careplanMatchRate = 0;

          if (totalRecords > 0 && Array.isArray(resident.careplan_icf)) {
            const careplanIcfSet = new Set<string>(
              resident.careplan_icf.flatMap((plan) => plan.icf_codes || []),
            );
            if (careplanIcfSet.size > 0) {
              let matchingRecordsCount = 0;
              recordsForResident.forEach((record) => {
                const recordIcfCodes = Object.keys(record)
                  .filter((key) => key.startsWith("icf") && record[key])
                  .map((key) => record[key]);
                if (recordIcfCodes.some((code) => careplanIcfSet.has(code))) {
                  matchingRecordsCount++;
                }
              });
              careplanMatchRate = Math.floor(
                (matchingRecordsCount / totalRecords) * 100,
              );
            }
          }

          const emotionCounts: Record<string, number> = {};
          recordsForResident.forEach((record) => {
            Object.keys(record).forEach((key) => {
              if (key.startsWith("emotion") && record[key]) {
                emotionCounts[record[key]] = (emotionCounts[record[key]] || 0) +
                  1;
              }
            });
          });

          const personalRecords: PersonalRecord[] = recordsForResident
            .map((record) => {
              let personalInfo = "";
              Object.keys(record).forEach((key) => {
                if (
                  key.startsWith("person") && record[key] &&
                  record[key] !== "該当なし"
                ) {
                  personalInfo += `${record[key]} `;
                }
              });

              let displayTime = "日付不明";
              try {
                displayTime = new Date(
                  excelSerialDateToJSDate(record["記録時間"]),
                ).toLocaleString("ja-JP");
              } catch {}

              return { time: displayTime, content: personalInfo.trim() };
            })
            .filter((rec) => rec.content);

          return {
            name: resident.name,
            count: totalRecords,
            emotionDistribution: Object.entries(emotionCounts).map((
              [name, value],
            ) => ({ name, value })),
            careplanMatchRate,
            personalRecords,
          };
        });

        info.sort((a, b) => b.count - a.count);
        setResidentRecordInfo(info);
      } catch (error) {
        console.error(error);
        setResidentRecordInfo([]);
      }
    };
    calculateInfo();
  }, [analysisData, selectedFloor, selectedStaffName]);

  // 6. Total Records
  const totalRecordsForStaff = useMemo(() => {
    if (!analysisData || !selectedStaffName) return 0;
    const cleanName = selectedStaffName.replace(/\s+/g, "");
    return analysisData.filter((r) => {
      const author = ((r["登録者苗字"] || "") + (r["登録者名前"] || "")).trim()
        .replace(/\s+/g, "");
      return author === cleanName;
    }).length;
  }, [analysisData, selectedStaffName]);

  return {
    analysisData,
    chartData,
    isProcessing,
    processError,
    noDataMessage,
    lackingCategory,
    weakestCategory,
    totalRecordsForStaff,
    planSuggestions,
    residentRecordInfo,
    characterMessage,
  };
};
