import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Provider, ProviderInput, ModelInfo } from "@/lib/tauri";
import { tryFetchModels, fetchProviderModels } from "@/lib/tauri";

interface ProviderFormProps {
  isOpen: boolean;
  onClose: () => void;
  provider?: Provider | null;
  onSave: (data: ProviderInput) => Promise<void>;
  onTestConnection?: (id: string) => Promise<boolean>;
  isSaving?: boolean;
  testingId?: string | null;
}

const providerTypeOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude/Opus)" },
  { value: "kimi", label: "Kimi (Moonshot)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "Qwen (通义千问)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "nvidia", label: "NVIDIA NIM" },
  { value: "groq", label: "Groq" },
  { value: "siliconflow", label: "SiliconFlow" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "custom", label: "自定义" },
];

const defaultApiBases: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  kimi: "https://api.moonshot.cn/v1",
  deepseek: "https://api.deepseek.com/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  nvidia: "https://integrate.api.nvidia.com/v1",
  groq: "https://api.groq.com/openai/v1",
  siliconflow: "https://api.siliconflow.cn/v1",
  xai: "https://api.x.ai/v1",
  custom: "",
};

interface FormErrors {
  name?: string;
  api_base?: string;
  api_key?: string;
}

export default function ProviderForm({
  isOpen,
  onClose,
  provider,
  onSave,
  onTestConnection,
  isSaving = false,
  testingId,
}: ProviderFormProps) {
  const isEdit = !!provider;

  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState("openai");
  const [apiBase, setApiBase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Model fetching state
  const [fetchedModels, setFetchedModels] = useState<ModelInfo[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Init form
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderType(provider.provider_type);
      setApiBase(provider.api_base);
      setApiKey("");
      setSelectedModels(new Set(provider.models));
      setHasFetched(true);
      setFetchedModels(provider.models.map((m) => ({
        id: m, name: m, provider_name: provider.name, max_tokens: 0, pricing: {},
      })));
    } else {
      setName("");
      setProviderType("openai");
      setApiBase(defaultApiBases["openai"]);
      setApiKey("");
      setFetchedModels([]);
      setSelectedModels(new Set());
      setHasFetched(false);
    }
    setErrors({});
    setTestResult(null);
    setShowKey(false);
    setModelFetchError(null);
  }, [provider, isOpen]);

  // Update default api_base when type changes
  useEffect(() => {
    if (!provider) {
      setApiBase(defaultApiBases[providerType] || "");
    }
  }, [providerType, provider]);

  const isTestingThisProvider = isTesting || testingId === provider?.id;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "供应商名称不能为空";
    if (!apiBase.trim()) newErrors.api_base = "API 地址不能为空";
    if (!apiKey.trim() && !isEdit) newErrors.api_key = "API 密钥不能为空";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const modelList = Array.from(selectedModels);
    const data: ProviderInput = {
      name: name.trim(),
      provider_type: providerType,
      api_base: apiBase.trim(),
      api_key: apiKey.trim(),
      models: modelList,
    };
    await onSave(data);
  };

  const handleTest = async () => {
    if (!provider || !onTestConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(provider.id);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim()) {
      setErrors((p) => ({ ...p, api_key: "请先输入 API 密钥" }));
      return;
    }
    setIsFetchingModels(true);
    setModelFetchError(null);
    try {
      let models: ModelInfo[];
      if (isEdit && provider) {
        models = await fetchProviderModels(provider.id);
      } else {
        models = await tryFetchModels(providerType, apiKey.trim(), apiBase.trim());
      }
      setFetchedModels(models);
      // Pre-select all fetched models
      setSelectedModels(new Set(models.map((m) => m.id)));
      setHasFetched(true);
    } catch (err) {
      setModelFetchError(err instanceof Error ? err.message : "获取模型列表失败");
    } finally {
      setIsFetchingModels(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedModels.size === fetchedModels.length) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(fetchedModels.map((m) => m.id)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[4vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? "编辑供应商" : "添加供应商"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="例如：我的 OpenAI"
              className={cn("input-field", errors.name && "border-red-500")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Provider Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">供应商类型</label>
            <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="input-field appearance-none">
              {providerTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* API Base */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
              API 地址 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => { setApiBase(e.target.value); if (errors.api_base) setErrors((p) => ({ ...p, api_base: undefined })); }}
              placeholder="https://api.openai.com/v1"
              className={cn("input-field", errors.api_base && "border-red-500")}
            />
            {errors.api_base && <p className="mt-1 text-xs text-red-400">{errors.api_base}</p>}
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
              API 密钥 <span className="text-red-400">*</span>
              {isEdit && <span className="ml-1 text-gray-400">(留空则不修改)</span>}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); if (errors.api_key) setErrors((p) => ({ ...p, api_key: undefined })); }}
                placeholder={isEdit ? "留空以保留现有密钥" : "sk-..."}
                className={cn("input-field pr-10", errors.api_key && "border-red-500")}
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.api_key && <p className="mt-1 text-xs text-red-400">{errors.api_key}</p>}
          </div>

          {/* Models Section */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                模型列表
                {hasFetched && (
                  <span className="ml-1 text-gray-400">
                    (已选 {selectedModels.size}/{fetchedModels.length})
                  </span>
                )}
              </label>
            </div>

            {/* Fetch button or model list */}
            {!hasFetched ? (
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm font-medium transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 disabled:opacity-50"
                style={{ borderColor: isFetchingModels ? 'var(--accent)' : 'var(--border-primary)', color: isFetchingModels ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                {isFetchingModels ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isFetchingModels ? "正在获取模型列表..." : "获取模型列表"}
              </button>
            ) : (
              <div className="space-y-1.5 rounded-xl border p-3" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
                {/* Select all toggle */}
                <button
                  onClick={toggleAll}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-surface-700"
                >
                  <Check className={cn("h-3.5 w-3.5", selectedModels.size === fetchedModels.length ? "text-indigo-500" : "text-gray-400")} />
                  {selectedModels.size === fetchedModels.length ? "取消全选" : "全选"}
                </button>
                {/* Model checkboxes */}
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  {fetchedModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                        selectedModels.has(m.id)
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-surface-700/50"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selectedModels.has(m.id)
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300 dark:border-gray-600"
                      )}>
                        {selectedModels.has(m.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate font-mono">{m.id}</span>
                    </button>
                  ))}
                </div>
                {/* Refresh button */}
                <button
                  onClick={handleFetchModels}
                  disabled={isFetchingModels}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-indigo-500 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50"
                >
                  {isFetchingModels ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  重新获取
                </button>
              </div>
            )}
            {modelFetchError && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" /> {modelFetchError}
              </p>
            )}
          </div>

          {/* Test Connection Result */}
          {testResult !== null && (
            <div className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium",
              testResult ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {testResult ? "连接测试成功" : <><AlertTriangle className="h-3.5 w-3.5" /> 连接测试失败，请检查配置</>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            {isEdit && onTestConnection && (
              <button type="button" onClick={handleTest} disabled={isTestingThisProvider}
                className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50">
                {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                测试连接
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">取消</button>
            <button onClick={handleSave} disabled={isSaving || !hasFetched || selectedModels.size === 0}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
