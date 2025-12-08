import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { MonthlyEmotionData } from "../types"; // 型定義をインポート

type Props = {
  data: MonthlyEmotionData[];
};

export const EmotionLineChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        日付範囲を指定して「データ取得」ボタンを押してください。
      </p>
    );
  }

  // Y軸の目盛りを「100%」のようにフォーマットする関数 (変更なし)
  const percentTickFormatter = (tick: number) => {
    return `${Math.round(tick * 100)}%`;
  };

  // ★★★ 修正点2: ツールチップのフォーマットを修正 ★★★
  // value (生の値) だけでなく、props (その月の全データ) を受け取る
  const tooltipFormatter = (value: number, name: string, props: any) => {
    // props.payload からその月の全データを取得
    // (例: { month: "2025-08", positive: 39, negative: 15, neutral: 63 })
    const payload = props.payload;
    if (!payload) {
      return [`${value}`, name]; // フォールバック
    }

    // その月の合計値を手動で計算
    const total =
      (payload.positive || 0) +
      (payload.negative || 0) +
      (payload.neutral || 0);

    if (total === 0) {
      return ["0.0%", name]; // 合計が0なら0%
    }

    // 正しい割合を計算 (例: 63 / (39 + 15 + 63) * 100)
    const percentage = (value / total) * 100;

    return [
      `${percentage.toFixed(1)}%`, // 小数点以下1桁
      name, // "ポジティブ" などの名前
    ];
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        stackOffset="expand"
        // ★★★ 修正点1: Y軸が見切れないようマージンを修正 ★★★
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }} // left: -20 を 10 に変更
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={percentTickFormatter} />
        {/* ★ 修正点2のロジックがここで使用される ★ */}
        <Tooltip formatter={tooltipFormatter} />
        <Legend />

        {/* (Area定義は変更なし) */}
        <Area
          dataKey="positive"
          stackId="1"
          stroke="#10B981"
          fill="#10B981"
          name="ポジティブ"
        />
        <Area
          dataKey="negative"
          stackId="1"
          stroke="#EF4444"
          fill="#EF4444"
          name="ネガティブ"
        />
        <Area
          dataKey="neutral"
          stackId="1"
          stroke="#6B7280"
          fill="#6B7280"
          name="ニュートラル"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};