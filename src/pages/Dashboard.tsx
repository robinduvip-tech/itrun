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
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-surface-950">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 dark:border-surface-800/60 px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">iTrun</h1>
          <span className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            isRunning ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-surface-800 dark:text-gray-400"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isRunning ? "bg-emerald-500" : "bg-gray-400")} />
            {isRunning ? `代理运行中 :${port}` : "代理已停止"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <MiniStat icon={<Activity className="h-4 w-4" />} label="请求数" value={stats ? String(stats.total_requests) : "-"} color="text-indigo-500" />
          <MiniStat icon={<Zap className="h-4 w-4" />} label="Token" value={stats ? `${(stats.total_tokens/1000).toFixed(0)}K` : "-"} color="text-amber-500" />
          <MiniStat icon={<Clock className="h-4 w-4" />} label="延迟" value={stats ? `${stats.avg_latency_ms.toFixed(0)}ms` : "-"} color="text-emerald-500" />
          <MiniStat icon={<ServerIcon className="h-4 w-4" />} label="Provider" value={stats ? String(stats.by_provider.length) : "-"} color="text-sky-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 bg-gray-50/50 dark:bg-surface-900/30 p-5">
            <h3 className="mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Token 用量趋势</h3>
            <TokenChart data={dailyStats} isLoading={isLoading} />
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 bg-gray-50/50 dark:bg-surface-900/30 p-5">
            <h3 className="mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">延迟分布</h3>
            <LatencyChart data={providerLatencyStats} isLoading={isLoading} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 bg-gray-50/50 dark:bg-surface-900/30">
          <LiveRequests />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-surface-800/60 bg-white dark:bg-surface-900/40 p-4">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 dark:bg-surface-800", color)}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
