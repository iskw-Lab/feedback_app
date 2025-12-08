// 1. 必要なインポート（型定義とJSONデータ）
import { 
  StaffProfile, 
  Category, 
  AnswerItem, 
  DescriptionItem,
  ResidentRecordInfo // 必要に応じて
} from "../types"; // ★前回のステップで作った型定義を利用

import checklistDataFile from "@/lib/checklist-data.json";

// チェックリストデータの型変換（元のコードにあった処理）
const checklistData: Category[] = checklistDataFile as Category[];

// --- 関数 1: Excel日付変換 ---
export const excelSerialDateToJSDate = (serial: number): Date => {
  const excelEpoch = new Date(1899, 11, 30);
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + serial * millisecondsInDay);
};

// --- 関数 2: 分析データ処理 ---
export const processAnalysisData = (
    allData: any[],
    selectedStaffName: string,
    selectedFloor: string,
) => {
    const floorData = allData.filter((row) =>
        row["フロア名"] === selectedFloor
    );
    const floorStaffNames = [
        ...new Set(
            floorData.map(
                (item) =>
                    ((item["登録者苗字"] || "") + (item["登録者名前"] || ""))
                        .trim(),
            ),
        ),
    ].filter(Boolean);
    if (floorStaffNames.length === 0) return null;

    const icfCategories = {
        BADL: ["d5", "d4", "b"],
        IADL: ["d6", "d2"],
        コミュニケーション: ["d3", "d7"],
        環境: ["e"],
    };

    const cleanIcfCode = (code: string | null): string | null => {
        if (!code || typeof code !== "string") return null;
        const match = code.toLowerCase().match(/([bde]\d*)/);
        if (!match) return null;
        const fullCode = match[1];
        if (fullCode.startsWith("d")) return fullCode.slice(0, 2);
        else return fullCode.slice(0, 1);
    };

    const floorStaffStats = floorStaffNames.map((name) => {
        const staffData = floorData.filter(
            (row) =>
                ((row["登録者苗字"] || "") + (row["登録者名前"] || ""))
                    .trim() ===
                    name,
        );
        const record_sum = staffData.length || 1;
        const speech_count = staffData.filter(
            (row) => row.speech && row.speech !== "該当なし",
        ).length;
        const person_count = staffData.filter(
            (row) => row.person1 && row.person1 !== "該当なし",
        ).length;
        const allIcfCodes = staffData
            .flatMap((row) =>
                Object.keys(row)
                    .filter((key) => key.startsWith("icf"))
                    .map((key) => cleanIcfCode(row[key]))
                    .filter((code): code is string => code !== null)
            );
        const icf_total = allIcfCodes.length || 1;
        const icfCategoryCounts = Object.keys(icfCategories).reduce(
            (acc, category) => {
                acc[category] = allIcfCodes.filter((code) =>
                    icfCategories[category as keyof typeof icfCategories].some(
                        (prefix) =>
                            code?.startsWith(prefix),
                    )
                ).length;
                return acc;
            },
            {} as Record<string, number>,
        );
        return {
            name,
            発話率: speech_count / record_sum,
            パーソナル: person_count / record_sum,
            BADL: icfCategoryCounts["BADL"] / icf_total,
            IADL: icfCategoryCounts["IADL"] / icf_total,
            コミュニケーション: icfCategoryCounts["コミュニケーション"] /
                icf_total,
            環境: icfCategoryCounts["環境"] / icf_total,
        };
    });

    const labels = [
        "発話率",
        "パーソナル",
        "BADL",
        "IADL",
        "コミュニケーション",
        "環境",
    ];
    const maxValues: Record<string, number> = {};
    const avgValues: Record<string, number> = {};
    labels.forEach((label) => {
        const values = floorStaffStats.map((s) => s[label as keyof typeof s]);
        maxValues[label] = Math.max(...values, 0);
        avgValues[label] = values.reduce((sum, v) => sum + v, 0) /
            floorStaffNames.length;
    });

    const selectedStaffStats = floorStaffStats.find((s) =>
        s.name === selectedStaffName
    );
    if (!selectedStaffStats) return null;

    const chartData1 = labels.map((label) => ({
        subject: label,
        individual: Math.round(
            ((selectedStaffStats[label as keyof typeof selectedStaffStats] /
                (maxValues[label] || 1)) *
                100) *
                10,
        ) / 10,
        average: Math.round(
            ((avgValues[label] / (maxValues[label] || 1)) * 100) * 10,
        ) / 10,
    }));

    const floorSpeechCount = floorData.filter(
        (row) => row.speech && row.speech !== "該当なし",
    ).length;
    const floorPersonCount = floorData.filter(
        (row) => row.person1 && row.person1 !== "該当なし",
    ).length;
    const floorAllIcfCodes = floorData
        .flatMap((row) =>
            Object.keys(row)
                .filter((key) => key.startsWith("icf"))
                .map((key) => cleanIcfCode(row[key]))
                .filter((code): code is string => code !== null)
        );
    const floorIcfCategoryCounts = Object.keys(icfCategories).reduce(
        (acc, category) => {
            acc[category] =
                floorAllIcfCodes.filter((code) =>
                    icfCategories[category as keyof typeof icfCategories].some(
                        (prefix) => code?.startsWith(prefix),
                    )
                ).length;
            return acc;
        },
        {} as Record<string, number>,
    );
    const floorCounts = {
        発話率: floorSpeechCount,
        パーソナル: floorPersonCount,
        BADL: floorIcfCategoryCounts["BADL"],
        IADL: floorIcfCategoryCounts["IADL"],
        コミュニケーション: floorIcfCategoryCounts["コミュニケーション"],
        環境: floorIcfCategoryCounts["環境"],
    };

    const totalFloorItems =
        Object.values(floorCounts).reduce((sum, count) => sum + count, 0) || 1;
    const chartData2 = Object.entries(floorCounts).map(([subject, count]) => ({
        subject,
        individual: Math.round(((count / totalFloorItems) * 100) * 10) / 10,
        fullMark: 100,
    }));

    return { chartData1, chartData2 };
};

// --- 関数 3: チェックリスト回答処理 ---
export const processChecklistAnswers = (answers: Record<string, string>) => {
    const categorized = {
        know: [] as AnswerItem[],
        can_do: [] as AnswerItem[],
        dont_know: [] as AnswerItem[],
        descriptions: [] as DescriptionItem[],
    };

    const questionMap = new Map<
        string,
        { text: string; category: string; type: string }
    >();
    checklistData.forEach((cat) => {
        cat.questions.forEach((q) => {
            questionMap.set(q.id, {
                text: q.text,
                category: cat.category_title,
                type: q.type,
            });
        });
    });

    for (const qId in answers) {
        const question = questionMap.get(qId);
        if (question) {
            const answer = answers[qId];
            const item = { text: question.text, category: question.category };
            if (question.type === "radio") {
                if (answer === "know") categorized.know.push(item);
                else if (answer === "can_do") categorized.can_do.push(item);
                else if (answer === "dont_know") {
                    categorized.dont_know.push(item);
                }
            } else if (question.type === "textarea" && answer) {
                categorized.descriptions.push({
                    q: question.text,
                    a: answer,
                    category: question.category,
                });
            }
        }
    }
    return categorized;
};