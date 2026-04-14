"use client";

import { formatBRL } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface PriceChartProps {
  data: PricePoint[];
  positive?: boolean;
  height?: number;
}

export default function PriceChart({
  data,
  positive = true,
  height = 200,
}: PriceChartProps) {
  const color = positive ? "#10b981" : "#ef4444";

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
      >
        Sem dados de preço disponíveis
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={formatted}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient
            id={`gradient-${positive ? "up" : "down"}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatBRL(v)}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: 13,
          }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(value) => [formatBRL(Number(value)), "Preço"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${positive ? "up" : "down"})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
