import { Activity, Zap, Clock, Cpu, Server } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TokenChart from "@/components/dashboard/TokenChart";
import LatencyChart from "@/components/dashboard/LatencyChart";
import LiveRequests from "@/components/dashboard/LiveRequests";
import { useStats } from "@/hooks/useStats";

export default function Dashboard() {
  const { stats, dailyStats, providerLatencyStats, isLoading: statsLoading } = useStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">控制台</h1>
        <p className="mt-1 text-sm text-surface-400">
          AI API 中转代理运行状态与用量概览
        </p>
      </div>

      {/* Stats Cards Row */}
      {statsLoading && !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-surface-800/60 bg-surface-900/60 backdrop-blur-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="总请求数"
            value={stats ? stats.total_requests.toLocaleString() : "0"}
            subtitle="所有时间"
            icon={Activity}
            color="indigo"
          />
          <StatsCard
            title="Token 用量"
            value={stats ? (stats.total_tokens / 1000).toFixed(0) + "K" : "0"}
            subtitle="所有时间"
            icon={Zap}
            color="amber"
          />
          <StatsCard
            title="平均延迟"
            value={stats ? stats.avg_latency_ms.toFixed(0) + "ms" : "0ms"}
            subtitle={`${stats ? stats.total_errors : 0} 个错误`}
            icon={Clock}
            color="emerald"
          />
          <StatsCard
            title="活跃 Provider"
            value={stats ? String(stats.by_provider.length) : "0"}
            subtitle="已配置的供应商"
            icon={Server}
            color="sky"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TokenChart data={dailyStats} isLoading={statsLoading} />
        <LatencyChart data={providerLatencyStats} isLoading={statsLoading} />
      </div>

      {/* Live Requests */}
      <LiveRequests />
    </div>
  );
}
