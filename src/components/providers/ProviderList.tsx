import { useEffect } from "react";
import { Server, Plus, Settings, Trash2, Zap } from "lucide-react";
import { useProviderStore } from "@/stores/providerStore";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/tauri";

interface ProviderListProps {
  onAdd: () => void;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
}

const typeLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  ollama: "Ollama",
  custom: "自定义",
};

const typeColors: Record<string, string> = {
  openai: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  anthropic: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  deepseek: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  qwen: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  ollama: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  custom: "bg-surface-500/15 text-surface-400 border-surface-500/20",
};

export default function ProviderList({
  onAdd,
  onEdit,
  onDelete,
}: ProviderListProps) {
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const isLoading = useProviderStore((s) => s.isLoading);
  const error = useProviderStore((s) => s.error);
  const defaultProviderId = useProviderStore((s) => s.defaultProviderId);
  const clearError = useProviderStore((s) => s.clearError);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Loading skeleton
  if (isLoading && providers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">供应商</h2>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-800" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-surface-800/60 bg-surface-900/60 p-6 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-surface-800" />
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-surface-800" />
                  <div className="h-3 w-16 rounded bg-surface-800" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-surface-800" />
                <div className="h-3 w-3/4 rounded bg-surface-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-red-500/10 p-4">
          <Server className="h-8 w-8 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-red-400">加载失败</p>
          <p className="mt-1 text-xs text-surface-500">{error}</p>
        </div>
        <button
          onClick={() => {
            clearError();
            loadProviders();
          }}
          className="btn-secondary text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  // Empty state
  if (providers.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">供应商</h2>
          <button onClick={onAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            添加供应商
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="rounded-full bg-surface-800 p-5">
            <Server className="h-10 w-10 text-surface-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-surface-300">
              还没有配置供应商
            </p>
            <p className="mt-1 text-xs text-surface-500">
              添加 AI 供应商以开始代理请求
            </p>
          </div>
          <button onClick={onAdd} className="btn-primary mt-2">
            <Plus className="mr-2 inline h-4 w-4" />
            添加第一个供应商
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">供应商</h2>
        <button onClick={onAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" />
          添加供应商
        </button>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const isConnected = provider.is_connected;
          const isDefault = provider.id === defaultProviderId;
          const typeColor =
            typeColors[provider.provider_type] || typeColors.custom;
          const typeLabel =
            typeLabels[provider.provider_type] || provider.provider_type;

          return (
            <div
              key={provider.id}
              onClick={() => onEdit(provider)}
              className={cn(
                "group cursor-pointer rounded-2xl border border-surface-800/60 bg-surface-900/60 p-5 backdrop-blur-xl transition-all duration-300",
                "hover:border-surface-700/60 hover:bg-surface-900/80",
                isDefault && "ring-1 ring-inset ring-bridge-500/20"
              )}
            >
              {/* Top row: icon + info + actions */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isConnected ? "bg-emerald-500" : "bg-surface-600"
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {provider.name}
                      </h3>
                      {isDefault && (
                        <span className="rounded-md bg-bridge-500/15 px-1.5 py-0.5 text-[10px] font-medium text-bridge-400">
                          默认
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                        typeColor
                      )}
                    >
                      {typeLabel}
                    </span>
                  </div>
                </div>

                {/* Action buttons - visible on hover */}
                <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(provider);
                    }}
                    className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-700 hover:text-surface-200"
                    title="编辑"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(provider);
                    }}
                    className="rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom row: model count + status */}
              <div className="flex items-center justify-between text-xs text-surface-500">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  <span>{provider.models.length} 个模型</span>
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isConnected ? "text-emerald-400" : "text-surface-500"
                  )}
                >
                  {isConnected ? "已配置" : "未配置密钥"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
