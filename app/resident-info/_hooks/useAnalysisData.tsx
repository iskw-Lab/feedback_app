import { useState, useEffect } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Recipient, EmotionData, PersonalRecord } from "../types";

// ヘルパー関数: Excelシリアル値の日付変換
const excelSerialDateToJSDate = (serial: number): Date => {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

export const useAnalysisData = (
  currentMonth: Date,
  selectedRecipient: Recipient | null
) => {
  // --- State定義 ---
  
  // 1. ダウンロードしたフロア全体の生データ (キャッシュ用)
  const [allFloorData, setAllFloorData] = useState<any[]>([]);
  
  // 2. ページに返すための加工済みデータ
  const [emotionData, setEmotionData] = useState<EmotionData[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const supabase = createClient();

  // ---------------------------------------------------------
  // Effect 1: データのダウンロード担当
  // 実行条件: 「表示月」または「選択されたフロア」が変わった時
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchFloorData = async () => {
      // 利用者が未選択の場合は、データ取得を行わない
      if (!selectedRecipient) {
        setAllFloorData([]);
        return;
      }

      setIsDetailsLoading(true);

      // ファイル名の構築 (例: 202508_shokibo_analysis.json)
      const yearMonth = format(currentMonth, "yyyyMM");
      const floorPart =
        selectedRecipient.floor === "小規模多機能"
          ? "shokibo"
          : selectedRecipient.floor;

      const fileName = `${yearMonth}_${floorPart}_analysis.json`;
      console.log(`[Debug] Checking file existence: ${fileName}`);

      try {
        // ★★★ 修正ポイント: いきなりダウンロードせず、まずリストを取得する ★★★
        // これにより、ファイルがない場合に 400/404 エラーが出るのを防ぎます
        const { data: fileList, error: listError } = await supabase.storage
          .from("analysis-data")
          .list("", { limit: 100, sortBy: { column: 'name', order: 'asc' } });

        if (listError) {
          console.warn("Storage list error:", listError.message);
          setAllFloorData([]);
          return;
        }

        // リストの中に目的のファイルがあるか確認
        const fileExists = fileList.some((f) => f.name === fileName);

        if (!fileExists) {
          console.log(`[Debug] File not found in bucket (Skip download): ${fileName}`);
          setAllFloorData([]); // データなしとして処理完了
          return;
        }

        // ファイルが存在することを確認してからダウンロード
        const { data, error } = await supabase.storage
          .from("analysis-data")
          .download(fileName);

        if (error) {
          console.warn(`[Debug] Download error despite existence: ${fileName}`, error.message);
          setAllFloorData([]);
          return;
        }

        const text = await data.text();
        
        // JSONパース (形式の揺らぎを吸収)
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            // [...] の形式
            setAllFloorData(parsed);
          } else if (parsed && Array.isArray(parsed.data)) {
            // { data: [...] } の形式
            setAllFloorData(parsed.data);
          } else {
            console.warn(`[Debug] Unexpected JSON structure in ${fileName}`);
            setAllFloorData([]);
          }
        } catch (parseError) {
          console.error(`[Debug] JSON Parse Error for ${fileName}:`, parseError);
          setAllFloorData([]);
        }

      } catch (e) {
        console.error("データ取得プロセスエラー:", e);
        setAllFloorData([]);
      } finally {
        setIsDetailsLoading(false);
      }
    };

    fetchFloorData();
    // 依存配列: 月(yyyyMM)とフロアが変わった時のみ再ダウンロード
  }, [format(currentMonth, "yyyyMM"), selectedRecipient?.floor, supabase]);


  // ---------------------------------------------------------
  // Effect 2: データの抽出・計算担当
  // 実行条件: 「生データ」または「選択された利用者」が変わった時
  // ---------------------------------------------------------
  useEffect(() => {
    const processData = () => {
      // データがない、または利用者が未選択の場合はリセット
      if (allFloorData.length === 0 || !selectedRecipient) {
        setEmotionData([]);
        setPersonalRecords([]);
        return;
      }

      // --- 1. 対象利用者のレコードを抽出 ---
      // 名前から空白を除去して比較する
      const targetName = selectedRecipient.name.trim().replace(/\s+/g, "");
      
      const residentRecords = allFloorData.filter((record) => {
        const recordName = (
          (record["利用者苗字"] || "") + (record["利用者名前"] || "")
        ).trim().replace(/\s+/g, "");
        
        return recordName === targetName;
      });

      // --- 2. 感情データの集計 (円グラフ用) ---
      const emotionCounts: Record<string, number> = {};
      residentRecords.forEach((record) => {
        Object.keys(record).forEach((key) => {
          if (key.startsWith("emotion") && record[key]) {
            // 値があればカウントアップ
            emotionCounts[record[key]] = (emotionCounts[record[key]] || 0) + 1;
          }
        });
      });
      
      const newEmotionData = Object.entries(emotionCounts).map(
        ([name, value]) => ({ name, value })
      );

      // --- 3. パーソナル記録の抽出 (リスト用) ---
      const records: PersonalRecord[] = [];
      residentRecords.forEach((record) => {
        // "person" で始まるカラムの内容を結合
        let personalInfo = "";
        Object.keys(record).forEach((key) => {
          if (
            key.startsWith("person") &&
            record[key] &&
            record[key] !== "該当なし"
          ) {
            personalInfo += `${record[key]} `;
          }
        });

        if (personalInfo) {
          // 日付のパース処理
          const recordTimeValue = record["記録時間"];
          let displayTime = "日付不明";

          try {
            let recordDate: Date | null = null;
            if (typeof recordTimeValue === "number") {
              // Excelシリアル値の場合
              recordDate = excelSerialDateToJSDate(recordTimeValue);
            } else if (typeof recordTimeValue === "string") {
              // 文字列の場合
              recordDate = new Date(recordTimeValue);
            }

            if (recordDate && !isNaN(recordDate.getTime())) {
              displayTime = recordDate.toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
            }
          } catch (e) {
            console.error("Date parse error", e);
          }

          records.push({
            time: displayTime,
            content: personalInfo.trim(),
          });
        }
      });

      // 加工結果をStateにセット
      setEmotionData(newEmotionData);
      setPersonalRecords(records);
    };

    processData();
    // 依存配列: 生データ または 選択利用者が変わった時に再計算
  }, [allFloorData, selectedRecipient]);

  // --- 戻り値 ---
  return {
    emotionData,
    personalRecords,
    isDetailsLoading,
  };
};