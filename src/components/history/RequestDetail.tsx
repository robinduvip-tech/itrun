import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { cn, formatTokens, formatLatency } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/tauri";

interface RequestDetailProps {
  request: HistoryEntry | null;
  onClose: () => void;
}

export default function RequestDetail({ request, onClose }: RequestDetailProps) {
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!request) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatJSON = (raw: string): string => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const requestBody = request.request_body_preview
    ? formatJSON(request.request_body_preview)
    : "无请求内容";
  const responseBody = request.response_body_preview
    ? formatJSON(request.response_body_preview)
    : "无响应内容";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-2xl animate-slide-up flex-col border-l border-gray-200 dark:border-surface-800/60 bg-gray-50 dark:bg-surface-900/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-surface-800/60 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">请求详情</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:bg-surface-800 hover:text-surface-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 border-b border-gray-200 dark:border-surface-800/60 px-6 py-4">
          <MetaItem label="时间" value={new Date(request.created_at).toLocaleString("zh-CN")} />
          <MetaItem label="供应商" value={request.provider_id} />
          <MetaItem label="模型" value={request.model} mono />
          <MetaItem
            label="状态"
            value={
              <StatusBadge status={request.status} />
            }
          />
          <MetaItem label="Token" value={`${formatTokens(request.tokens_used)}`} />
          <MetaItem label="延迟" value={formatLatency(request.latency_ms)} />
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-surface-800/60">
          <button
            onClick={() => setActiveTab("request")}
            className={cn(
              "flex-1 px-6 py-3 text-center text-xs font-medium transition-colors",
              activeTab === "request"
                ? "border-b-2 border-bridge-500 text-bridge-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
            )}
          >
            请求体 (Request Body)
          </button>
          <button
            onClick={() => setActiveTab("response")}
            className={cn(
              "flex-1 px-6 py-3 text-center text-xs font-medium transition-colors",
              activeTab === "response"
                ? "border-b-2 border-bridge-500 text-bridge-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
            )}
          >
            响应体 (Response Body)
          </button>
        </div>

        {/* Code body */}
        <div className="relative flex-1 overflow-auto">
          {/* Copy button */}
          <button
            onClick={() =>
              handleCopy(
                activeTab === "request" ? requestBody : responseBody,
                activeTab
              )
            }
            className="absolute right-4 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-surface-800 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                复制
              </>
            )}
          </button>

          {/* JSON with colored syntax */}
          <pre className="code-block m-4 text-xs leading-relaxed">
            <code>
              <SyntaxHighlightedJSON
                json={activeTab === "request" ? requestBody : responseBody}
              />
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      {typeof value === "string" ? (
        <p
          className={cn(
            "truncate text-xs text-gray-600 dark:text-gray-300",
            mono && "font-mono"
          )}
        >
          {value}
        </p>
      ) : (
        value
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
      {status === "success" ? "成功" : "失败"}
    </span>
  );
}

function SyntaxHighlightedJSON({ json }: { json: string }) {
  // Simple token-based syntax highlighting
  const tokens = json.split(/(\".*?\"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\]:,]|\s+)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.match(/^\s+$/)) {
          return <span key={i}>{token}</span>;
        }
        if (token.match(/^".*"$/)) {
          // Check if it looks like a key (followed by :)
          return (
            <span key={i} className="text-sky-400">
              {token}
            </span>
          );
        }
        if (token === "true" || token === "false") {
          return (
            <span key={i} className="text-amber-400">
              {token}
            </span>
          );
        }
        if (token === "null") {
          return (
            <span key={i} className="text-gray-400 dark:text-gray-500">
              {token}
            </span>
          );
        }
        if (token.match(/^-?\d/)) {
          return (
            <span key={i} className="text-emerald-400">
              {token}
            </span>
          );
        }
        if (token.match(/^[{}[\]:,]$/)) {
          return (
            <span key={i} className="text-gray-500 dark:text-gray-400">
              {token}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}
