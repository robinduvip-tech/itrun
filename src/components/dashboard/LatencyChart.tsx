import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { ProviderLatencyStat } from "@/lib/tauri";
import { formatLatency } from "@/lib/utils";

interface LatencyChartProps {
  data: ProviderLatencyStat[];
  isLoading?: boolean;
}

const BAR_COLORS = [
  "#818cf8", // bridge-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#38bdf8", // sky-400
  "#fb923c", // orange-400
  "#4ade80", // green-400
];

export default function LatencyChart({ data, isLoading }: LatencyChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.provider,
      latency: d.avg_latency_ms,
      count: d.request_count,
    }));
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-surface-800/60 bg-surface-900/60 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-600 border-t-bridge-500" />
          <p className="text-xs text-surface-500">加载中...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-surface-800/60 bg-surface-900/60 p-6 backdrop-blur-xl">
        <div className="rounded-full bg-surface-800 p-3">
          <svg
            className="h-6 w-6 text-surface-500"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="text-sm text-surface-400">暂无延迟数据</p>
        <p className="text-xs text-surface-600">
          启动代理并发送请求后，数据将显示在此处
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 p-6 backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">供应商平均延迟</h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            tickFormatter={(v: number) => formatLatency(v)}
            dx={-4}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              color: "#fff",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            formatter={(value: number) => formatLatency(value)}
            labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          />
          <Bar dataKey="latency" name="延迟" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
