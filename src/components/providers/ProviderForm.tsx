import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Save, RefreshCw, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Provider, ProviderInput } from "@/lib/tauri";
import { fetchProviderModels } from "@/lib/tauri";

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
  { value: "openai", label: "OpenAI", models: "gpt-4o\ngpt-4o-mini\ngpt-4-turbo\ngpt-3.5-turbo" },
  { value: "anthropic", label: "Anthropic (Claude/Opus)", models: "claude-opus-4-20250514\nclaude-sonnet-4-20250514\nclaude-haiku-3-5-20241022" },
  { value: "kimi", label: "Kimi (Moonshot)", models: "moonshot-v1-8k\nmoonshot-v1-32k\nmoonshot-v1-128k" },
  { value: "deepseek", label: "DeepSeek", models: "deepseek-chat\ndeepseek-reasoner" },
  { value: "qwen", label: "Qwen (通义千问)", models: "qwen-turbo\nqwen-plus\nqwen-max\nqwen-max-longcontext" },
  { value: "gemini", label: "Google Gemini", models: "gemini-2.5-pro-preview\ngemini-2.5-flash-preview\ngemini-2.0-flash" },
  { value: "nvidia", label: "NVIDIA NIM", models: "meta/llama-3.3-70b-instruct\nnvidia/llama-3.1-nemotron-70b" },
  { value: "groq", label: "Groq", models: "llama-3.3-70b-versatile\nmixtral-8x7b-32768\ngemma2-9b-it" },
  { value: "siliconflow", label: "SiliconFlow", models: "Qwen/Qwen2.5-72B-Instruct\ndeepseek-ai/DeepSeek-V3\nmeta-llama/Llama-3.3-70B" },
  { value: "xai", label: "xAI (Grok)", models: "grok-2-1212\ngrok-2-vision-1212" },
  { value: "custom", label: "自定义", models: "" },
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
  const [models, setModels] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  // Init form
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderType(provider.provider_type);
      setApiBase(provider.api_base);
      setApiKey("");
      setModels(provider.models.join("\n"));
    } else {
      setName("");
      setProviderType("openai");
      setApiBase(defaultApiBases["openai"]);
      setApiKey("");
      const opt = providerTypeOptions.find((o) => o.value === "openai");
      setModels(opt?.models || "");
    }
    setErrors({});
    setTestResult(null);
    setShowKey(false);
    setModelFetchError(null);
  }, [provider, isOpen]);

  // Update default api_base and models when type changes
  useEffect(() => {
    if (!provider) {
      setApiBase(defaultApiBases[providerType] || "");
      const opt = providerTypeOptions.find((o) => o.value === providerType);
      setModels(opt?.models || "");
    }
  }, [providerType, provider]);

  const isTestingThisProvider = isTesting || testingId === provider?.id;

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "供应商名称不能为空";
    if (!apiBase.trim()) newErrors.api_base = "API 地址不能为空";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const modelList = models
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    const data: ProviderInput = {
      name: name.trim(),
      provider_type: providerType,
      api_base: apiBase.trim(),
      api_key: apiKey.trim(),
      models: modelList.length > 0 ? modelList : [],
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
    if (!provider) return;
    setIsFetchingModels(true);
    setModelFetchError(null);
    try {
      const remoteModels = await fetchProviderModels(provider.id);
      if (remoteModels.length > 0) {
        setModels(remoteModels.map((m) => m.id).join("\n"));
      }
    } catch (err) {
      setModelFetchError(err instanceof Error ? err.message : "获取模型列表失败");
    } finally {
      setIsFetchingModels(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-2xl border border-surface-700/60 bg-surface-900/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800/60 px-6 py-4">
          <h3 className="text-base font-semibold text-white">
            {isEdit ? "编辑供应商" : "添加供应商"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-surface-300">
              名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="例如：我的 OpenAI"
              className={cn("input-field", errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/30")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Provider Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-surface-300">供应商类型</label>
            <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="input-field appearance-none">
              {providerTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* API Base */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-surface-300">
              API 地址 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => { setApiBase(e.target.value); if (errors.api_base) setErrors((p) => ({ ...p, api_base: undefined })); }}
              placeholder="https://api.openai.com/v1"
              className={cn("input-field", errors.api_base && "border-red-500 focus:border-red-500 focus:ring-red-500/30")}
            />
            {errors.api_base && <p className="mt-1 text-xs text-red-400">{errors.api_base}</p>}
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-surface-300">
              API 密钥 {isEdit && <span className="ml-1 text-surface-500">(留空则不修改)</span>}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? "留空以保留现有密钥" : "sk-..."}
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Models */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-surface-300">
                模型列表 <span className="text-surface-500">(每行一个)</span>
              </label>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={isFetchingModels}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-bridge-400 hover:bg-bridge-500/10 disabled:opacity-50 transition-colors"
                >
                  {isFetchingModels ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  从 API 获取
                </button>
              )}
            </div>
            <textarea
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="gpt-4o&#10;gpt-4o-mini"
              rows={5}
              className="input-field resize-none font-mono text-xs"
            />
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
        <div className="flex items-center justify-between border-t border-surface-800/60 px-6 py-4">
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
            <button onClick={handleSave} disabled={isSaving}
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
