import { useEffect, useState } from "react";
import { ResidentRecordInfo, PersonalRecord, EmotionData } from "../types";
import { excelSerialDateToJSDate } from "../_utils/analysisHelpers";

export const useResidentAnalysis = (
    analysisData: any[],
    selectedFloor: string,
    selectedStaffName: string,
    weakestCategory: string,
) => {
    const [residentRecordInfo, setResidentRecordInfo] = useState<any[]>([]);
    const [planSuggestions, setPlanSuggestions] = useState<any>({});

    // 1. ケアプラン提案の取得
    useEffect(() => {
        if (weakestCategory && selectedFloor) {
            fetch(
                `/api/care-plan-suggestions?floor=${selectedFloor}&category=${weakestCategory}`,
            )
                .then((res) => res.json())
                .then((data) => setPlanSuggestions(data))
                .catch(() => setPlanSuggestions({}));
        } else {
            setPlanSuggestions({});
        }
    }, [weakestCategory, selectedFloor]);

    // 2. 利用者ごとの記録集計 (重い処理)
    useEffect(() => {
        const calculateInfo = async () => {
            if (
                analysisData.length === 0 || !selectedFloor ||
                !selectedStaffName
            ) {
                setResidentRecordInfo([]);
                return;
            }
            try {
                const response = await fetch(
                    `/api/residents?floor=${selectedFloor}`,
                );
                if (!response.ok) throw new Error("Failed to fetch residents");
                const residents: {
                    name: string;
                    careplan_icf: any[] | null;
                }[] = await response.json();
                const info = residents.map((resident) => {
                    const recordsForResident = analysisData.filter((record) => {
                        const recordAuthor =
                            ((record["登録者苗字"] || "") +
                                (record["登録者名前"] || ""))
                                .trim();
                        const residentNameInRecord =
                            ((record["利用者苗字"] || "") +
                                (record["利用者名前"] || ""))
                                .trim();
                        const isAuthorMatch =
                            recordAuthor.replace(/\s+/g, "") ===
                                selectedStaffName.replace(/\s+/g, "");
                        const isResidentMatch = residentNameInRecord &&
                            resident.name &&
                            (residentNameInRecord.replace(/\s+/g, "") ===
                                resident.name.replace(/\s+/g, ""));
                        return isAuthorMatch && isResidentMatch;
                    });
                    const totalRecords = recordsForResident.length;
                    let careplanMatchRate = 0;
                    if (
                        totalRecords > 0 && Array.isArray(resident.careplan_icf)
                    ) {
                        const careplanIcfSet = new Set<string>(
                            resident.careplan_icf.flatMap((plan) =>
                                plan.icf_codes || []
                            ),
                        );
                        if (careplanIcfSet.size > 0) {
                            let matchingRecordsCount = 0;
                            recordsForResident.forEach((record) => {
                                const recordIcfCodes = Object.keys(record)
                                    .filter((key) =>
                                        key.startsWith("icf") && record[key]
                                    )
                                    .map((key) => record[key]);
                                const hasMatch = recordIcfCodes.some((code) =>
                                    careplanIcfSet.has(code)
                                );
                                if (hasMatch) matchingRecordsCount++;
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
                                emotionCounts[record[key]] =
                                    (emotionCounts[record[key]] || 0) +
                                    1;
                            }
                        });
                    });
                    const emotionDistribution = Object.entries(emotionCounts)
                        .map((
                            [name, value],
                        ) => ({ name, value }));
                    const personalRecords: PersonalRecord[] = [];
                    recordsForResident.forEach((record) => {
                        let personalInfo = "";
                        Object.keys(record).forEach((key) => {
                            if (
                                key.startsWith("person") && record[key] &&
                                record[key] !== "該当なし"
                            ) {
                                personalInfo += `${record[key]} `;
                            }
                        });
                        if (personalInfo) {
                            // --- ▼ 修正ここから ▼ ---
                            const timeValue = record["記録時間"];
                            let displayTime = "日付不明"; // 不明時のデフォルト値

                            if (typeof timeValue === "number") {
                                // 1. Excelシリアル値 (数値) の場合
                                try {
                                    displayTime = new Date(
                                        excelSerialDateToJSDate(timeValue),
                                    )
                                        .toLocaleString("ja-JP");
                                } catch (e) {
                                    console.error(
                                        "Excelシリアル値の変換に失敗:",
                                        timeValue,
                                        e,
                                    );
                                }
                            } else if (typeof timeValue === "string") {
                                // 2. ISO文字列 の場合
                                try {
                                    const d = new Date(timeValue);
                                    if (!isNaN(d.getTime())) { // 有効な日付かチェック
                                        displayTime = d.toLocaleString("ja-JP");
                                    }
                                } catch (e) {
                                    console.error(
                                        "日付文字列の変換に失敗:",
                                        timeValue,
                                        e,
                                    );
                                }
                            }

                            personalRecords.push({
                                time: displayTime, // 形式を問わず変換した日付文字列を使用
                                content: personalInfo.trim(),
                            });
                            // --- ▲ 修正ここまで ▲ ---
                        }
                    });
                    return {
                        name: resident.name,
                        count: totalRecords,
                        emotionDistribution,
                        careplanMatchRate,
                        personalRecords: personalRecords,
                    };
                });
                info.sort((a, b) => b.count - a.count);
                setResidentRecordInfo(info);
            } catch (error) {
                console.error("利用者ごとの情報計算に失敗:", error);
                setResidentRecordInfo([]);
            }
        };
        calculateInfo();
    }, [analysisData, selectedFloor, selectedStaffName]);

    return { residentRecordInfo, planSuggestions };
};
