import { useState } from "react";
import { Plus, Server, Shield } from "lucide-react";
import ProviderForm from "@/components/providers/ProviderForm";
import { useProviderStore } from "@/stores/providerStore";
import type { Provider, ProviderInput } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const typeBadge: Record<string, string> = {
  openai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  anthropic: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  kimi: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  deepseek: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
  qwen: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  gemini: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};
const typeLabel: Record<string, string> = {
  openai: "OpenAI", anthropic: "Anthropic", kimi: "Kimi", deepseek: "DeepSeek",
  qwen: "Qwen", gemini: "Gemini", nvidia: "NVIDIA", groq: "Groq",
  siliconflow: "SiliconFlow", xai: "xAI", custom: "自定义",
};

export default function Providers() {
  const providers = useProviderStore((s) => s.providers);
  const isLoading = useProviderStore((s) => s.isLoading);
  const addProvider = useProviderStore((s) => s.addProvider);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const testConnection = useProviderStore((s) => s.testConnection);
  const testingId = useProviderStore((s) => s.testingId);
  const defaultProviderId = useProviderStore((s) => s.defaultProviderId);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const handleAdd = () => { setSelected(null); setIsNew(true); setFormOpen(true); };
  const handleSelect = (p: Provider) => { setSelected(p); setIsNew(false); setFormOpen(true); };
  const handleSave = async (data: ProviderInput) => {
    if (isNew) await addProvider(data);
    else if (selected) await updateProvider(selected.id, data);
    setFormOpen(false);
  };

  return (
    <div className="flex h-full bg-white dark:bg-surface-950">
      <div className="flex w-[320px] shrink-0 flex-col border-r border-gray-100 dark:border-surface-800/60">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 dark:border-surface-800/60 px-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">供应商</h2>
          <button onClick={handleAdd} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && providers.length === 0 ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-50 dark:bg-surface-800/50" />)}</div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Server className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500">暂无供应商</p>
              <button onClick={handleAdd} className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">添加第一个供应商</button>
            </div>
          ) : (
            <div className="py-1">
              {providers.map((p) => (
                <button key={p.id} onClick={() => handleSelect(p)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-surface-800/50",
                    selected?.id === p.id ? "bg-emerald-50 dark:bg-emerald-500/5 border-r-2 border-emerald-500" : "border-r-2 border-transparent")}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-800">
                    <Server className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                      {p.id === defaultProviderId && <Shield className="h-3 w-3 text-emerald-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("rounded px-1 py-0 text-[10px] font-medium", typeBadge[p.provider_type] || "bg-gray-100 text-gray-600")}>
                        {typeLabel[p.provider_type] || p.provider_type}
                      </span>
                      <span className="text-[10px] text-gray-400">{p.models.length} 个模型</span>
                    </div>
                  </div>
                  {p.api_key && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {formOpen ? (
          <div className="flex-1 overflow-y-auto">
            <ProviderForm isOpen={formOpen} onClose={() => setFormOpen(false)} provider={isNew ? null : selected}
              onSave={handleSave} onTestConnection={testConnection} isSaving={isLoading} testingId={testingId} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Server className="h-16 w-16 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">选择供应商或点击 + 添加新的</p>
          </div>
        )}
      </div>
    </div>
  );
}
