import { useState } from "react";
import { Search, Filter, Check, X, Clock } from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { cn } from "@/lib/utils";

export default function History() {
  const entries = useHistoryStore((s) => s.entries);
  const totalCount = useHistoryStore((s) => s.totalCount);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const filters = useHistoryStore((s) => s.filters);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const loadMore = useHistoryStore((s) => s.loadMore);
  const setFilter = useHistoryStore((s) => s.setFilter);
  const getDetail = useHistoryStore((s) => s.getDetail);
  const selectedDetail = useHistoryStore((s) => s.selectedDetail);
  const isDetailOpen = useHistoryStore((s) => s.isDetailOpen);
  const closeDetail = useHistoryStore((s) => s.closeDetail);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const hasMore = entries.length < totalCount;

  return (
    <div className="flex h-full bg-white dark:bg-surface-950">
      <div className="flex w-[360px] shrink-0 flex-col border-r border-gray-100 dark:border-surface-800/60">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 dark:border-surface-800/60 px-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input type="text" value={filters.search} onChange={(e) => setFilter("search", e.target.value)}
              placeholder="搜索请求..." className="w-full rounded-lg border-0 bg-gray-50 dark:bg-surface-800 py-1.5 pl-8 pr-3 text-xs outline-none" />
          </div>
          <div className="relative">
            <button onClick={() => setShowStatusFilter(!showStatusFilter)}
              className={cn("flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                filters.status !== "all" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-surface-800")}>
              <Filter className="h-3 w-3" />
            </button>
            {showStatusFilter && (
              <div className="absolute right-0 top-full z-30 mt-1 w-28 rounded-lg border bg-white dark:bg-surface-900 shadow-xl py-1">
                {["all","success","error"].map(v => (
                  <button key={v} onClick={() => { setFilter("status", v); setShowStatusFilter(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-surface-800">
                    {filters.status === v && <Check className="h-3 w-3 text-emerald-500" />}
                    <span className={filters.status !== v ? "ml-[18px]" : ""}>{v === "all" ? "全部" : v === "success" ? "成功" : "失败"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && entries.length === 0 ? (
            <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-50 dark:bg-surface-800/50" />)}</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Clock className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">暂无请求记录</p>
            </div>
          ) : (
            <div>
              {entries.map((e) => (
                <button key={e.id} onClick={() => getDetail(e.id)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-surface-800/50 border-b border-gray-50 dark:border-surface-800/30",
                    selectedDetail?.id === e.id && "bg-emerald-50 dark:bg-emerald-500/5")}>
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    e.status === "success" ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10" : "bg-red-50 text-red-500 dark:bg-red-500/10")}>
                    {e.status === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{e.model}</span>
                      <span className="text-[10px] text-gray-400">{e.latency_ms}ms</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">{e.provider_id}</span>
                      <span className="text-[10px] text-gray-400">{e.created_at?.slice(0, 16).replace("T", " ")}</span>
                    </div>
                  </div>
                </button>
              ))}
              {hasMore && (
                <button onClick={loadMore} className="w-full py-3 text-xs text-emerald-600 hover:bg-gray-50 dark:hover:bg-surface-800/50">加载更多</button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isDetailOpen && selectedDetail ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">请求详情</h3>
              <button onClick={closeDetail} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Block label="模型" value={selectedDetail.model} />
                <Block label="供应商" value={selectedDetail.provider_id} />
                <Block label="状态" value={selectedDetail.status === "success" ? "成功" : "失败"} />
                <Block label="Token" value={String(selectedDetail.tokens_used)} />
                <Block label="延迟" value={`${selectedDetail.latency_ms}ms`} />
                <Block label="时间" value={selectedDetail.created_at?.replace("T", " ").slice(0, 19) || "-"} />
              </div>
              {selectedDetail.request_body_preview && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">请求内容</p>
                  <pre className="text-xs font-mono bg-gray-50 dark:bg-surface-800/50 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
                    {fmt(selectedDetail.request_body_preview)}
                  </pre>
                </div>
              )}
              {selectedDetail.response_body_preview && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">响应内容</p>
                  <pre className="text-xs font-mono bg-gray-50 dark:bg-surface-800/50 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
                    {fmt(selectedDetail.response_body_preview)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center h-full text-center">
            <Clock className="h-16 w-16 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="text-sm text-gray-500">选择一条记录查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-gray-50 dark:bg-surface-800/50 p-3">
    <p className="text-[10px] text-gray-400 uppercase">{label}</p>
    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">{value || "-"}</p>
  </div>;
}

function fmt(s: string) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } }
