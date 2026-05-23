import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DailyStat } from "@/lib/tauri";
import { formatTokens } from "@/lib/utils";

interface TokenChartProps {
  data: DailyStat[];
  isLoading?: boolean;
}

export default function TokenChart({ data, isLoading }: TokenChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: d.date.slice(5), // MM-DD
      prompt_tokens: d.prompt_tokens,
      completion_tokens: d.completion_tokens,
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
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
        </div>
        <p className="text-sm text-surface-400">暂无 Token 用量数据</p>
        <p className="text-xs text-surface-600">
          启动代理并发送请求后，数据将显示在此处
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 p-6 backdrop-blur-xl">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Token 用量趋势</h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            tickFormatter={(v: number) => formatTokens(v)}
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
            formatter={(value: number, name: string) => [
              formatTokens(value),
              name === "prompt_tokens" ? "提示 Token" : "补全 Token",
            ]}
            labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}
            formatter={(value: string) =>
              value === "prompt_tokens" ? "提示 Token" : "补全 Token"
            }
          />
          <Line
            type="monotone"
            dataKey="prompt_tokens"
            name="prompt_tokens"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#818cf8",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
          <Line
            type="monotone"
            dataKey="completion_tokens"
            name="completion_tokens"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#34d399",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
