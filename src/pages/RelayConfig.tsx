import { useState, useEffect } from "react";
import { Save, RotateCcw, Eye, EyeOff, Copy, Check, Server, Braces, Zap, AlertTriangle, Play, FolderOpen, FileText, RefreshCw, Search, Edit3 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { setSetting, getSettings, scanConfigs, readConfigFile, writeConfigFile } from "@/lib/tauri";
import type { ConfigFile, ConfigKey } from "@/lib/tauri";
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

      {/* ── Local Config Scanner ── */}
      <ConfigScanner />
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

// ── Local Config Scanner ──────────────────────────────────────

function ConfigScanner() {
  const [configs, setConfigs] = useState<ConfigFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [viewingFile, setViewingFile] = useState<ConfigFile | null>(null);
  const [editingFile, setEditingFile] = useState<ConfigFile | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await scanConfigs();
      setConfigs(result);
    } catch { /* ignore */ }
    setScanning(false);
  };

  const handleView = async (cfg: ConfigFile) => {
    try {
      const detail = await readConfigFile(cfg.path);
      setViewingFile(detail);
      setEditingFile(null);
    } catch (err) {
      setMsg({ type: "err", text: `读取失败: ${err}` });
    }
  };

  const handleEdit = async (cfg: ConfigFile) => {
    try {
      const detail = await readConfigFile(cfg.path);
      setEditingFile(detail);
      setEditContent(detail.content || "");
      setViewingFile(null);
    } catch (err) {
      setMsg({ type: "err", text: `读取失败: ${err}` });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      await writeConfigFile(editingFile.path, editContent);
      setMsg({ type: "ok", text: "已保存" });
      setEditingFile(null);
      // Refresh scan
      handleScan();
    } catch (err) {
      setMsg({ type: "err", text: `保存失败: ${err}` });
    }
    setSavingFile(false);
  };

  const categoryLabel: Record<string, string> = {
    claude: "Claude Code",
    claude_desktop: "Claude Desktop",
    codex: "Codex CLI",
    vscode: "VS Code",
    cursor: "Cursor",
    gemini: "Gemini CLI",
  };

  const categoryColor: Record<string, string> = {
    claude: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    claude_desktop: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    codex: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    vscode: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    cursor: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
    gemini: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/60 backdrop-blur-xl border-l-4 border-l-emerald-500 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-surface-800/60">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">本地配置扫描</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">检测并管理 Claude Code / Codex / Cursor 等本地配置文件</p>
          </div>
        </div>
        <button onClick={handleScan} disabled={scanning}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50">
          {scanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {scanning ? "扫描中..." : "扫描配置"}
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div className={cn("mx-6 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
          msg.type === "ok" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400")}>
          {msg.type === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-xs underline">关闭</button>
        </div>
      )}

      {/* Config list */}
      <div className="px-6 py-4">
        {configs.length === 0 && !scanning ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">点击「扫描配置」检测本地配置文件</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持 Claude Code、Codex CLI、Cursor、VS Code 等</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {configs.map((cfg) => (
              <div key={cfg.path}
                className={cn("flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                  cfg.exists ? "hover:bg-gray-50 dark:hover:bg-surface-800/50" : "opacity-50")}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    cfg.exists ? "bg-gray-100 dark:bg-surface-700" : "bg-gray-50 dark:bg-surface-800"
                  )}>
                    <FileText className={cn("h-3.5 w-3.5", cfg.exists ? "text-gray-500" : "text-gray-300 dark:text-gray-600")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{cfg.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">{cfg.path}</p>
                  </div>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0", categoryColor[cfg.category] || "bg-gray-100 text-gray-600")}>
                    {categoryLabel[cfg.category] || cfg.category}
                  </span>
                  {cfg.exists && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="文件存在" />}
                  {!cfg.exists && <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" title="文件不存在" />}
                </div>
                {cfg.exists && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => handleView(cfg)}
                      className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors">
                      <Eye className="h-3.5 w-3.5 inline mr-1" />查看
                    </button>
                    <button onClick={() => handleEdit(cfg)}
                      className="rounded-md px-2 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                      <Edit3 className="h-3.5 w-3.5 inline mr-1" />编辑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileModal title={`查看: ${viewingFile.name}`} onClose={() => setViewingFile(null)}>
          {viewingFile.keys && viewingFile.keys.length > 0 && (
            <div className="mb-4 space-y-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">配置项</p>
              {viewingFile.keys.map((k) => (
                <div key={k.key} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-surface-800/50 px-3 py-1.5">
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{k.key}</span>
                  <span className="text-xs font-mono text-gray-500">{k.value}</span>
                </div>
              ))}
            </div>
          )}
          <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-surface-800/50 rounded-lg p-4 max-h-64 overflow-auto whitespace-pre-wrap">
            {viewingFile.content || "(空文件)"}
          </pre>
        </FileModal>
      )}

      {/* File Editor Modal */}
      {editingFile && (
        <FileModal title={`编辑: ${editingFile.name}`} onClose={() => setEditingFile(null)}>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
            className="input-field font-mono text-xs h-80 resize-none" />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditingFile(null)} className="btn-secondary text-sm">取消</button>
            <button onClick={handleSaveEdit} disabled={savingFile}
              className="btn-primary text-sm flex items-center gap-1.5">
              <Save className="h-3.5 w-3.5" />{savingFile ? "保存中..." : "保存"}
            </button>
          </div>
        </FileModal>
      )}
    </div>
  );
}

function FileModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] animate-slide-up rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/95 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-surface-800/60">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
