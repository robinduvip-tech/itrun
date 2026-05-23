import { useEffect } from "react";
import { Check, X, Clock } from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { useProxyStore } from "@/stores/proxyStore";
import { cn, formatTokens, formatLatency, formatRelativeTime, truncate } from "@/lib/utils";

export default function LiveRequests() {
  const entries = useHistoryStore((s) => s.entries);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const isRunning = useProxyStore((s) => s.isRunning);

  // Auto-refresh every 3 seconds when proxy is running
  useEffect(() => {
    if (!isRunning) return;
    loadHistory();
    const interval = setInterval(() => {
      loadHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, [isRunning, loadHistory]);

  const recentEntries = entries.slice(0, 10);

  return (
    <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-white">实时请求</h3>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              实时
            </span>
          )}
        </div>
        <span className="text-xs text-surface-500">
          最近 {recentEntries.length} 条
        </span>
      </div>

      {/* Loading skeleton */}
      {isLoading && entries.length === 0 ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-surface-700" />
              <div className="h-3 w-20 rounded bg-surface-700" />
              <div className="h-3 w-24 rounded bg-surface-700" />
              <div className="ml-auto h-3 w-12 rounded bg-surface-700" />
              <div className="h-3 w-14 rounded bg-surface-700" />
              <div className="h-5 w-12 rounded-full bg-surface-700" />
            </div>
          ))}
        </div>
      ) : recentEntries.length === 0 ? (
        /* Empty state */
        <div className="flex h-48 flex-col items-center justify-center gap-2">
          <div className="rounded-full bg-surface-800 p-2.5">
            <Clock className="h-5 w-5 text-surface-500" />
          </div>
          <p className="text-sm text-surface-400">等待请求...</p>
          <p className="text-xs text-surface-600">
            {isRunning
              ? "代理正在运行，等待接收请求..."
              : "启动代理以开始接收请求"}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800/60 text-left">
                <th className="px-6 py-3 text-xs font-medium text-surface-500">
                  时间
                </th>
                <th className="px-6 py-3 text-xs font-medium text-surface-500">
                  供应商
                </th>
                <th className="px-6 py-3 text-xs font-medium text-surface-500">
                  模型
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500">
                  Token
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500">
                  延迟
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-surface-500">
                  状态
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-surface-800/30 transition-colors hover:bg-surface-800/30"
                >
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-surface-400">
                    {formatRelativeTime(entry.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-surface-300">
                    {entry.provider_id}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-surface-400">
                    {truncate(entry.model, 24)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right text-xs tabular-nums text-surface-300">
                    {formatTokens(entry.tokens_used)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right text-xs tabular-nums text-surface-300">
                    {formatLatency(entry.latency_ms)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-center text-xs">
                    <StatusBadge status={entry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "success"
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      )}
    >
      {status === "success" ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      {status === "success" ? "成功" : "失败"}
    </span>
  );
}
