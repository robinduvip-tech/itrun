import { useState } from "react";
import { Plus, Server, Shield, Settings } from "lucide-react";
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
  const removeProvider = useProviderStore((s) => s.removeProvider);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);

  const handleAdd = () => { setSelected(null); setIsNew(true); setFormOpen(true); };
  const handleSelect = (p: Provider) => { setSelected(p); setIsNew(false); setFormOpen(true); };
  const handleSave = async (data: ProviderInput) => {
    if (isNew) await addProvider(data);
    else if (selected) await updateProvider(selected.id, data);
    setFormOpen(false);
  };

  return (
    <div className="flex h-full bg-white dark:bg-surface-950">
      <div className="flex w-[300px] shrink-0 flex-col border-r border-gray-100 dark:border-surface-800/60">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 dark:border-surface-800/60 px-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">供应商</h2>
          <button onClick={handleAdd} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-800 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Server className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">暂无供应商</p>
            </div>
          ) : (
            providers.map((p) => (
              <button key={p.id} onClick={() => handleSelect(p)}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-surface-800/30",
                  selected?.id === p.id ? "bg-emerald-50 dark:bg-emerald-500/5 border-r-[3px] border-emerald-500" : "border-r-[3px] border-transparent")}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-800">
                  <Server className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                    {p.id === defaultProviderId && <Shield className="h-3 w-3 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("rounded px-1.5 py-0 text-[10px] font-medium", typeBadge[p.provider_type] || "bg-gray-100 text-gray-500")}>
                      {typeLabel[p.provider_type] || p.provider_type}
                    </span>
                    <span className="text-[10px] text-gray-400">{p.models.length} 模型</span>
                  </div>
                </div>
                {p.api_key && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {formOpen ? (
          <div className="h-full overflow-y-auto">
            <ProviderForm isOpen={formOpen} onClose={() => setFormOpen(false)} provider={isNew ? null : selected}
              onSave={handleSave} onTestConnection={testConnection} isSaving={isLoading} testingId={testingId} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <Server className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-400">选择供应商或点击 + 添加</p>
            </div>
          </div>
        )}
      </div>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative rounded-2xl bg-white dark:bg-surface-900 p-6 shadow-2xl max-w-sm"><p className="font-semibold">删除 {deleteTarget.name}？</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">此操作不可撤销</p>
            <div className="flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="btn-secondary text-sm">取消</button>
              <button onClick={() => { removeProvider(deleteTarget.id); setDeleteTarget(null); }} className="btn-danger text-sm">删除</button></div></div>
        </div>
      )}
    </div>
  );
}
