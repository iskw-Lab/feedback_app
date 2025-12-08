"use client";

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer, // ★ ResponsiveContainer を再度使用
  Legend,
  Tooltip,
} from 'recharts';

// Data object type definition
interface ChartData {
  subject: string;
  individual: number;
  average?: number;
  fullMark?: number;
}

// Props type definition (width/height は不要)
interface RadarChartProps {
  data: ChartData[];
  individualName?: string; // Optional name for the legend
}

// RadarChartComponent implementation using ResponsiveContainer
export const RadarChartComponent: React.FC<RadarChartProps> = (
  {
    data,
    individualName = "個人",
  },
) => {
  const fullMark = data.length > 0 && data[0]?.fullMark ? data[0].fullMark : 100;

  // ★ Render using ResponsiveContainer
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius="80%" // Adjust size relative to container
        data={data}
        // Style adjustments for better visibility, especially on screen
        margin={{ top: 5, right: 30, left: 30, bottom: 5 }} // Add margins for labels
      >
        <PolarGrid stroke="#ccc" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 12, fill: '#333' }} // Slightly larger font for screen
          dy={4}
        />
        <PolarRadiusAxis angle={30} domain={[0, fullMark]} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
          }}
          formatter={(value: number | string, name: string) => {
            const formattedValue = typeof value === 'number'
              ? `${value.toFixed(1)}`
              : value;
            if (name === "フロア平均" || name.includes("傾向")) {
              return `${formattedValue}%`;
            }
            return formattedValue;
          }}
        />
        <Radar
          name={individualName}
          dataKey="individual"
          stroke="#16a34a" // Green
          fill="#16a34a"
          fillOpacity={0.6}
          strokeWidth={1.5}
        />
        {data.length > 0 && data[0]?.average !== undefined && (
          <Radar
            name="フロア平均"
            dataKey="average"
            stroke="#8884d8" // Purple
            fill="#8884d8"
            fillOpacity={0.3}
            strokeWidth={1}
          />
        )}
        <Legend
          verticalAlign="bottom"
          height={30} // Allocate space for legend
          wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};