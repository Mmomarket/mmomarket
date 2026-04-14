"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface VolumePoint {
  timestamp: string;
  volume: number;
}

interface VolumeChartProps {
  data: VolumePoint[];
  height?: number;
}

export default function VolumeChart({ data, height = 120 }: VolumeChartProps) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={formatted}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value) => [
            Number(value).toLocaleString("pt-BR"),
            "Volume",
          ]}
        />
        <Bar
          dataKey="volume"
          fill="#6366f1"
          radius={[2, 2, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
