import { useState } from "react";
import {
  Search,
  Filter,
  Check,
  X,
  ChevronDown,
  ArrowUpDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { cn, formatTokens, formatLatency, formatRelativeTime } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/tauri";

interface HistoryTableProps {
  onSelect: (entry: HistoryEntry) => void;
}

type SortField = "created_at" | "provider_id" | "model" | "tokens_used" | "latency_ms" | "status";
type SortDirection = "asc" | "desc";

const columns: { key: SortField; label: string; align: "left" | "right" | "center" }[] = [
  { key: "created_at", label: "时间", align: "left" },
  { key: "provider_id", label: "供应商", align: "left" },
  { key: "model", label: "模型", align: "left" },
  { key: "latency_ms", label: "延迟", align: "right" },
  { key: "tokens_used", label: "Token", align: "right" },
  { key: "status", label: "状态", align: "center" },
];

export default function HistoryTable({ onSelect }: HistoryTableProps) {
  const entries = useHistoryStore((s) => s.entries);
  const totalCount = useHistoryStore((s) => s.totalCount);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const isLoadingMore = useHistoryStore((s) => s.isLoadingMore);
  const error = useHistoryStore((s) => s.error);
  const filters = useHistoryStore((s) => s.filters);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const setFilter = useHistoryStore((s) => s.setFilter);
  const clearFilters = useHistoryStore((s) => s.clearFilters);

  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const hasMore = entries.length < totalCount;

  // Error state
  if (error && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-red-400">加载失败</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{error}</p>
        </div>
        <button onClick={loadHistory} className="btn-secondary text-sm">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Filter */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="搜索请求..."
            className="input-field pl-10 text-sm"
          />
          {filters.search && (
            <button
              onClick={() => setFilter("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className={cn(
              "btn-secondary flex items-center gap-2 text-sm",
              filters.status !== "all" && "border-bridge-500/20 text-bridge-400"
            )}
          >
            <Filter className="h-4 w-4" />
            {filters.status === "all"
              ? "全部状态"
              : filters.status === "success"
                ? "成功"
                : "失败"}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showStatusFilter && (
            <div className="absolute right-0 top-full z-30 mt-2 w-36 overflow-hidden rounded-xl border border-gray-300 dark:border-surface-700/60 bg-gray-50 dark:bg-surface-900 shadow-2xl">
              {[
                { value: "all", label: "全部状态" },
                { value: "success", label: "成功" },
                { value: "error", label: "失败" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilter("status", opt.value);
                    setShowStatusFilter(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-xs transition-colors hover:bg-gray-100 dark:bg-surface-800/80",
                    filters.status === opt.value
                      ? "bg-bridge-500/10 text-bridge-400"
                      : "text-gray-600 dark:text-gray-300"
                  )}
                >
                  {filters.status === opt.value && (
                    <Check className="h-3 w-3 shrink-0" />
                  )}
                  <span className={cn(filters.status !== opt.value && "ml-[18px]")}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(filters.search || filters.status !== "all") && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-300"
          >
            清除筛选
          </button>
        )}

        {/* Total count */}
        <div className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          共 {totalCount} 条记录
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-surface-800/60 bg-gray-50 dark:bg-surface-900/60 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-surface-800/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      "cursor-pointer select-none px-5 py-3.5 text-xs font-medium text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-300",
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3",
                            sortDir === "asc" ? "rotate-180" : ""
                          )}
                        />
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-10 px-2 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {isLoading && entries.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr
                    key={i}
                    className="animate-pulse border-b border-gray-200 dark:border-surface-800/30"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3.5">
                        <div
                          className={cn(
                            "h-3 rounded bg-gray-100 dark:bg-surface-800",
                            col.align === "right" ? "ml-auto" : "",
                            i % 3 === 0
                              ? "w-16"
                              : i % 3 === 1
                                ? "w-24"
                                : "w-20"
                          )}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-3.5">
                      <div className="h-3 w-4 rounded bg-gray-100 dark:bg-surface-800" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                /* Empty state */
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-5 py-20"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gray-100 dark:bg-surface-800 p-3">
                        <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {filters.search || filters.status !== "all"
                          ? "没有匹配的记录"
                          : "暂无请求历史"}
                      </p>
                      <p className="text-xs text-surface-600">
                        {filters.search || filters.status !== "all"
                          ? "尝试调整筛选条件"
                          : "启动代理并发送请求后，记录将显示在此处"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                /* Data rows */
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => onSelect(entry)}
                    className="group cursor-pointer border-b border-gray-200 dark:border-surface-800/30 transition-colors hover:bg-gray-100 dark:bg-surface-800/40"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(entry.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                      {entry.provider_id}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {entry.model}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs tabular-nums text-gray-600 dark:text-gray-300">
                      {formatLatency(entry.latency_ms)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs tabular-nums text-gray-600 dark:text-gray-300">
                      {formatTokens(entry.tokens_used)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center text-xs">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right">
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-surface-600 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && entries.length > 0 && (
          <div className="flex justify-center border-t border-gray-200 dark:border-surface-800/60 px-6 py-3">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface-600 border-t-bridge-500" />
                  加载中...
                </>
              ) : (
                <>
                  加载更多
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
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
