import { useState, useEffect } from "react";
import { Save, RotateCcw, Eye, EyeOff, Copy, Check, Server, Braces, Zap, AlertTriangle, Play } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { setSetting, getSettings } from "@/lib/tauri";
import { cn } from "@/lib/utils";

// ── Default configurations ──────────────────────────────────────

const CODECX_DEFAULTS: Record<string, string> = {
  codex_model: "gpt-4o",
  codex_max_tokens: "4096",
  codex_temperature: "0.7",
  codex_streaming: "true",
  codex_base_url: "https://api.openai.com/v1",
};

const CLAUDE_DEFAULTS: Record<string, string> = {
  claude_model: "claude-sonnet-4-20250514",
  claude_max_tokens: "8192",
  claude_thinking_budget: "16000",
  claude_base_url: "https://api.anthropic.com/v1",
};

// ── Copy to clipboard helper ────────────────────────────────────

function copyJson(obj: Record<string, string>) {
  const text = JSON.stringify(obj, null, 2);
  navigator.clipboard.writeText(text);
}

// ── Main Page ───────────────────────────────────────────────────

export default function RelayConfig() {
  const { settings, loadSettings } = useSettingsStore();
  const [codexConfig, setCodexConfig] = useState<Record<string, string>>({});
  const [claudeConfig, setClaudeConfig] = useState<Record<string, string>>({});
  const [editingCodex, setEditingCodex] = useState(false);
  const [editingClaude, setEditingClaude] = useState(false);
  const [showCodexKey, setShowCodexKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Load current config from store
  useEffect(() => {
    const c: Record<string, string> = {};
    for (const k of Object.keys(CODECX_DEFAULTS)) {
      c[k] = settings[k] || CODECX_DEFAULTS[k];
    }
    if (settings.codex_api_key) c["codex_api_key"] = settings.codex_api_key;
    setCodexConfig(c);

    const cl: Record<string, string> = {};
    for (const k of Object.keys(CLAUDE_DEFAULTS)) {
      cl[k] = settings[k] || CLAUDE_DEFAULTS[k];
    }
    if (settings.claude_api_key) cl["claude_api_key"] = settings.claude_api_key;
    setClaudeConfig(cl);
  }, [settings]);

  const updateCodex = (key: string, value: string) => {
    setCodexConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateClaude = (key: string, value: string) => {
    setClaudeConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Save config
  const saveConfig = async (prefix: string, config: Record<string, string>) => {
    setSaving(prefix);
    try {
      for (const [k, v] of Object.entries(config)) {
        await setSetting(k, v);
      }
      await loadSettings();
      setMsg({ type: "ok", text: `${prefix === "codex" ? "Codex" : "Claude"} 配置已保存` });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ type: "err", text: "保存失败" });
    }
    setSaving(null);
  };

  // Reset to defaults
  const resetConfig = (prefix: string, defaults: Record<string, string>) => {
    if (prefix === "codex") {
      const reset = { ...defaults };
      if (codexConfig.codex_api_key) reset["codex_api_key"] = codexConfig.codex_api_key;
      setCodexConfig(reset);
    } else {
      const reset = { ...defaults };
      if (claudeConfig.claude_api_key) reset["claude_api_key"] = claudeConfig.claude_api_key;
      setClaudeConfig(reset);
    }
    setMsg({ type: "ok", text: `已恢复${prefix === "codex" ? "Codex" : "Claude"}默认配置（未保存）` });
    setTimeout(() => setMsg(null), 3000);
  };

  // One-click apply (save defaults if no custom config)
  const oneClickApply = async (prefix: string, config: Record<string, string>) => {
    setSaving(prefix + "-quick");
    try {
      for (const [k, v] of Object.entries(config)) {
        await setSetting(k, v);
      }
      await loadSettings();
      setMsg({ type: "ok", text: `${prefix === "codex" ? "Codex" : "Claude"} 一键应用完成` });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ type: "err", text: "应用失败" });
    }
    setSaving(null);
  };

  const copyConfig = (label: string, config: Record<string, string>) => {
    copyJson(config);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
          <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">中转配置</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">管理 Codex 和 Claude 客户端中转参数</p>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
          msg.type === "ok" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        )}>
          {msg.type === "ok" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* ── Codex Configuration ── */}
      <ConfigCard
        icon={<Braces className="h-5 w-5" />}
        title="OpenAI Codex 客户端配置"
        subtitle="VS Code / Cursor 中 Codex 补全的中转参数"
        accent="indigo"
        isEditing={editingCodex}
        onToggleEdit={() => setEditingCodex(!editingCodex)}
        onSave={() => saveConfig("codex", codexConfig)}
        onReset={() => resetConfig("codex", CODECX_DEFAULTS)}
        onQuickApply={() => oneClickApply("codex", codexConfig)}
        onCopy={() => copyConfig("codex", codexConfig)}
        copied={copied === "codex"}
        saving={saving?.startsWith("codex") || false}
      >
        <div className="space-y-4">
          <Field label="API 密钥" icon={<KeyIcon />}>
            <div className="relative w-full max-w-sm">
              <input type={showCodexKey ? "text" : "password"}
                value={codexConfig.codex_api_key || ""}
                onChange={(e) => updateCodex("codex_api_key", e.target.value)}
                disabled={!editingCodex}
                placeholder="sk-..."
                className={cn("input-field pr-10 text-sm font-mono", !editingCodex && "opacity-60")} />
              <button onClick={() => setShowCodexKey(!showCodexKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCodexKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="模型">
            <input type="text" value={codexConfig.codex_model || ""}
              onChange={(e) => updateCodex("codex_model", e.target.value)}
              disabled={!editingCodex}
              className={cn("input-field w-56 text-sm font-mono", !editingCodex && "opacity-60")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Max Tokens">
              <select value={codexConfig.codex_max_tokens || "4096"}
                onChange={(e) => updateCodex("codex_max_tokens", e.target.value)}
                disabled={!editingCodex}
                className={cn("input-field w-full text-sm", !editingCodex && "opacity-60")}>
                {["1024","2048","4096","8192","16384"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Temperature">
              <select value={codexConfig.codex_temperature || "0.7"}
                onChange={(e) => updateCodex("codex_temperature", e.target.value)}
                disabled={!editingCodex}
                className={cn("input-field w-full text-sm", !editingCodex && "opacity-60")}>
                {["0","0.3","0.7","1.0"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="流式传输">
              <Toggle value={codexConfig.codex_streaming === "true"}
                onChange={(v) => updateCodex("codex_streaming", String(v))}
                disabled={!editingCodex} />
            </Field>
          </div>
          <Field label="Base URL">
            <input type="text" value={codexConfig.codex_base_url || ""}
              onChange={(e) => updateCodex("codex_base_url", e.target.value)}
              disabled={!editingCodex}
              className={cn("input-field w-full max-w-md text-sm font-mono", !editingCodex && "opacity-60")} />
          </Field>
          {/* Current effective config display */}
          {!editingCodex && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 p-4">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">当前生效配置</p>
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono overflow-x-auto">
{JSON.stringify({
  model: codexConfig.codex_model || CODECX_DEFAULTS.codex_model,
  max_tokens: parseInt(codexConfig.codex_max_tokens || CODECX_DEFAULTS.codex_max_tokens),
  temperature: parseFloat(codexConfig.codex_temperature || CODECX_DEFAULTS.codex_temperature),
  stream: codexConfig.codex_streaming !== "false",
  base_url: codexConfig.codex_base_url || CODECX_DEFAULTS.codex_base_url,
}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ConfigCard>

      {/* ── Claude Configuration ── */}
      <ConfigCard
        icon={<Zap className="h-5 w-5" />}
        title="Anthropic Claude 客户端配置"
        subtitle="Claude 中转参数配置"
        accent="amber"
        isEditing={editingClaude}
        onToggleEdit={() => setEditingClaude(!editingClaude)}
        onSave={() => saveConfig("claude", claudeConfig)}
        onReset={() => resetConfig("claude", CLAUDE_DEFAULTS)}
        onQuickApply={() => oneClickApply("claude", claudeConfig)}
        onCopy={() => copyConfig("claude", claudeConfig)}
        copied={copied === "claude"}
        saving={saving?.startsWith("claude") || false}
      >
        <div className="space-y-4">
          <Field label="API 密钥" icon={<KeyIcon />}>
            <div className="relative w-full max-w-sm">
              <input type={showClaudeKey ? "text" : "password"}
                value={claudeConfig.claude_api_key || ""}
                onChange={(e) => updateClaude("claude_api_key", e.target.value)}
                disabled={!editingClaude}
                placeholder="sk-ant-..."
                className={cn("input-field pr-10 text-sm font-mono", !editingClaude && "opacity-60")} />
              <button onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showClaudeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="模型">
            <input type="text" value={claudeConfig.claude_model || ""}
              onChange={(e) => updateClaude("claude_model", e.target.value)}
              disabled={!editingClaude}
              className={cn("input-field w-72 text-sm font-mono", !editingClaude && "opacity-60")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Max Tokens">
              <select value={claudeConfig.claude_max_tokens || "8192"}
                onChange={(e) => updateClaude("claude_max_tokens", e.target.value)}
                disabled={!editingClaude}
                className={cn("input-field w-full text-sm", !editingClaude && "opacity-60")}>
                {["4096","8192","16384","32768"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Thinking Budget">
              <select value={claudeConfig.claude_thinking_budget || "16000"}
                onChange={(e) => updateClaude("claude_thinking_budget", e.target.value)}
                disabled={!editingClaude}
                className={cn("input-field w-full text-sm", !editingClaude && "opacity-60")}>
                {["0","4000","8000","16000","32000"].map(v => <option key={v} value={v}>{v === "0" ? "关闭" : v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Base URL">
            <input type="text" value={claudeConfig.claude_base_url || ""}
              onChange={(e) => updateClaude("claude_base_url", e.target.value)}
              disabled={!editingClaude}
              className={cn("input-field w-full max-w-md text-sm font-mono", !editingClaude && "opacity-60")} />
          </Field>
          {/* Current effective config display */}
          {!editingClaude && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">当前生效配置</p>
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono overflow-x-auto">
{JSON.stringify({
  model: claudeConfig.claude_model || CLAUDE_DEFAULTS.claude_model,
  max_tokens: parseInt(claudeConfig.claude_max_tokens || CLAUDE_DEFAULTS.claude_max_tokens),
  thinking_budget: parseInt(claudeConfig.claude_thinking_budget || CLAUDE_DEFAULTS.claude_thinking_budget),
  base_url: claudeConfig.claude_base_url || CLAUDE_DEFAULTS.claude_base_url,
}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ConfigCard>
    </div>
  );
}

// ── Reusable Components ─────────────────────────────────────────

function ConfigCard({ icon, title, subtitle, accent, isEditing, onToggleEdit, onSave, onReset, onQuickApply, onCopy, copied, saving, children }: {
  icon: React.ReactNode; title: string; subtitle: string; accent: string;
  isEditing: boolean; onToggleEdit: () => void; onSave: () => void; onReset: () => void;
  onQuickApply: () => void; onCopy: () => void; copied: boolean; saving: boolean; children: React.ReactNode;
}) {
  const borderColor = accent === "indigo" ? "border-l-indigo-500" : "border-l-amber-500";
  const btnColor = accent === "indigo"
    ? "bg-indigo-500 hover:bg-indigo-600 text-white"
    : "bg-amber-500 hover:bg-amber-600 text-white";
  const ringColor = accent === "indigo" ? "ring-indigo-500/20" : "ring-amber-500/20";

  return (
    <div className={cn(
      "rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/60 backdrop-blur-xl border-l-4 overflow-hidden",
      borderColor
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-surface-800/60">
        <div className="flex items-center gap-3">
          <span className={cn("text-gray-700 dark:text-gray-300", accent === "indigo" ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400")}>{icon}</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCopy}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "已复制" : "复制配置"}
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />恢复默认
          </button>
          <button onClick={onQuickApply}
            disabled={saving}
            className={cn("flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-all disabled:opacity-50", btnColor)}>
            <Play className="h-3.5 w-3.5" />一键应用
          </button>
          <button onClick={isEditing ? onSave : onToggleEdit}
            disabled={saving}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50",
              isEditing ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600"
            )}>
            {isEditing ? <><Save className="h-3.5 w-3.5" />保存</> : "编辑"}
          </button>
        </div>
      </div>
      {/* Body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors duration-200",
        disabled && "opacity-50 cursor-not-allowed",
        value ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-700"
      )}>
      <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", value && "translate-x-5")} />
    </button>
  );
}

function KeyIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
