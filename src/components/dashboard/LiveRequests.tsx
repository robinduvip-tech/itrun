import { useEffect } from "react";
import { Check, X, Clock, XCircle } from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { useProxyStore } from "@/stores/proxyStore";
import { cn, formatTokens, formatLatency, formatRelativeTime } from "@/lib/utils";

export default function LiveRequests() {
  const entries = useHistoryStore((s) => s.entries);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const getDetail = useHistoryStore((s) => s.getDetail);
  const selectedDetail = useHistoryStore((s) => s.selectedDetail);
  const isDetailLoading = useHistoryStore((s) => s.isDetailLoading);
  const closeDetail = useHistoryStore((s) => s.closeDetail);
  const isLoading = useHistoryStore((s) => s.isLoading);
  const isRunning = useProxyStore((s) => s.isRunning);

  useEffect(() => {
    if (!isRunning) return;
    loadHistory();
    const t = setInterval(() => loadHistory(), 3000);
    return () => clearInterval(t);
  }, [isRunning, loadHistory]);

  const recent = entries.slice(0, 50);
  const errors = recent.filter(e => e.status !== "success");

  return (
    <div className="rounded-xl border border-gray-100 dark:border-surface-800/60 bg-white dark:bg-surface-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-surface-800/60">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">实时请求日志</h3>
          {isRunning && <span className="flex items-center gap-1 text-[10px] text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>实时</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span>{recent.length} 条</span>
          {errors.length > 0 && <span className="text-red-400">{errors.length} 错误</span>}
        </div>
      </div>

      <div className="flex" style={{ height: 320 }}>
        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && recent.length === 0 ? (
            <div className="space-y-2 p-4">{Array.from({length:6}).map((_,i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-50 dark:bg-surface-800/40"/>)}</div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full"><Clock className="h-8 w-8 text-gray-200 dark:text-gray-700 mb-2"/><p className="text-xs text-gray-400">等待请求...</p></div>
          ) : (
            recent.map((e) => (
              <div key={e.id} onClick={() => getDetail(e.id)}
                className={cn("flex items-center gap-3 px-5 py-2 text-xs cursor-pointer border-b border-gray-50 dark:border-surface-800/20 hover:bg-gray-50 dark:hover:bg-surface-800/20 transition-colors",
                  selectedDetail?.id === e.id && "bg-indigo-50 dark:bg-indigo-500/5")}>
                <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  e.status === "success" ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10" : "bg-red-50 text-red-500 dark:bg-red-500/10")}>
                  {e.status === "success" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </div>
                <span className="w-12 text-gray-400 tabular-nums">{formatRelativeTime(e.created_at)}</span>
                <span className="w-20 font-mono text-gray-500 truncate">{e.model}</span>
                <span className="w-12 text-gray-400 tabular-nums">{formatLatency(e.latency_ms)}</span>
                <span className="w-14 text-gray-400 tabular-nums">{formatTokens(e.tokens_used)}</span>
                <span className="flex-1 text-gray-500 truncate">{e.provider_id}</span>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedDetail && (
          <div className="w-[360px] shrink-0 border-l border-gray-100 dark:border-surface-800/60 flex flex-col bg-gray-50/50 dark:bg-surface-900/50">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-surface-800/60">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">请求详情</span>
              <button onClick={closeDetail} className="p-1 text-gray-400 hover:text-gray-600"><XCircle className="h-3.5 w-3.5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isDetailLoading ? (
                <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500"/></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Info label="模型" value={selectedDetail.model}/>
                    <Info label="供应商" value={selectedDetail.provider_id}/>
                    <Info label="状态" value={selectedDetail.status === "success" ? "成功" : "失败"}/>
                    <Info label="Token" value={String(selectedDetail.tokens_used)}/>
                    <Info label="延迟" value={formatLatency(selectedDetail.latency_ms)}/>
                    <Info label="时间" value={selectedDetail.created_at?.replace("T"," ").slice(0,19) || "-"}/>
                  </div>
                  {selectedDetail.request_body_preview && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">请求</p>
                      <pre className="text-[10px] font-mono bg-white dark:bg-surface-800/50 rounded-lg p-2.5 max-h-32 overflow-auto whitespace-pre-wrap text-gray-600 dark:text-gray-300">{fmt(selectedDetail.request_body_preview)}</pre>
                    </div>
                  )}
                  {selectedDetail.response_body_preview && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">响应</p>
                      <pre className="text-[10px] font-mono bg-white dark:bg-surface-800/50 rounded-lg p-2.5 max-h-40 overflow-auto whitespace-pre-wrap text-gray-600 dark:text-gray-300">{fmt(selectedDetail.response_body_preview)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({label, value}: {label: string; value: string}) {
  return <div className="rounded-md bg-white dark:bg-surface-800/40 px-2.5 py-1.5">
    <p className="text-[9px] text-gray-400 uppercase">{label}</p>
    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200 mt-0.5 truncate">{value || "-"}</p>
  </div>;
}

function fmt(s: string) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; } }
