import { Activity, Zap, Clock, Server as ServerIcon } from "lucide-react";
import TokenChart from "@/components/dashboard/TokenChart";
import LatencyChart from "@/components/dashboard/LatencyChart";
import LiveRequests from "@/components/dashboard/LiveRequests";
import { useStats } from "@/hooks/useStats";
import { useProxyStore } from "@/stores/proxyStore";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { stats, dailyStats, providerLatencyStats, isLoading } = useStats();
  const isRunning = useProxyStore((s) => s.isRunning);
  const port = useProxyStore((s) => s.port);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-950">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-gray-100 dark:border-surface-800/60 px-5">
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">iTrun</h1>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
          isRunning ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-gray-100 text-gray-500 dark:bg-surface-800 dark:text-gray-400")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
          {isRunning ? `:${port}` : "已停止"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-4 gap-3">
          <MiniStat icon={<Activity className="h-4 w-4" />} label="请求数" value={stats ? String(stats.total_requests) : "-"} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
          <MiniStat icon={<Zap className="h-4 w-4" />} label="Token" value={stats ? `${(stats.total_tokens/1000).toFixed(0)}K` : "-"} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
          <MiniStat icon={<Clock className="h-4 w-4" />} label="延迟" value={stats ? `${stats.avg_latency_ms.toFixed(0)}ms` : "-"} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
          <MiniStat icon={<ServerIcon className="h-4 w-4" />} label="Provider" value={stats ? String(stats.by_provider.length) : "-"} color="text-sky-500" bg="bg-sky-50 dark:bg-sky-500/10" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Token 用量趋势</h3>
            <TokenChart data={dailyStats} isLoading={isLoading} />
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">延迟分布</h3>
            <LatencyChart data={providerLatencyStats} isLoading={isLoading} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-surface-800/60">
          <LiveRequests />
        </div>
      </div>
    </div>
  );
}

function MiniStat(props: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-surface-800/60 p-3.5">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", props.bg, props.color)}>{props.icon}</div>
      <div><p className="text-[11px] text-gray-400">{props.label}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{props.value}</p></div>
    </div>
  );
}
