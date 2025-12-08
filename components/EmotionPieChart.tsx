"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type EmotionData = {
  name: string;
  value: number;
};

interface EmotionPieChartProps {
  data: EmotionData[];
}

// 各感情に対応する色を定義
const COLORS: { [key: string]: string } = {
  positive: '#4ade80', // 緑
  negative: '#f87171', // 赤
  neutral: '#a1a1aa',  // グレー
  default: '#60a5fa',   // 青 (その他)
};

export function EmotionPieChart({ data }: EmotionPieChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500 py-8">感情データがありません。</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          // ★★★ ここが修正箇所 ★★★
          // 引数の型をanyとすることで、ライブラリの型定義の問題を回避します
          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.default} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}件`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}