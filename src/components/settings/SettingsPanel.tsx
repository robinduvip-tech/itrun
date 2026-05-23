import { useState, useEffect } from "react";
import {
  Server, Sun, Moon, Trash2, AlertTriangle, ExternalLink, RefreshCw,
  Route, Shield, Cpu, Globe, Clock, ArrowRightLeft, Zap, Braces,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { cn } from "@/lib/utils";
import { setSetting } from "@/lib/tauri";

// ── Config keys & defaults ─────────────────────────────────────
const DEFAULTS: Record<string, string> = {
  proxy_port: "9876",
  auto_start: "true",
  theme: "light",
  request_timeout_ms: "120000",
  max_concurrent: "10",
  openai_default_model: "gpt-4o",
  openai_streaming: "true",
  openai_max_tokens: "4096",
  openai_temperature: "0.7",
  claude_default_model: "claude-sonnet-4-20250514",
  claude_thinking_budget: "16000",
  claude_max_tokens: "8192",
  routing_mode: "auto",
  log_requests: "true",
  log_retention_days: "30",
};

export default function SettingsPanel() {
  const { settings, theme, proxyPort, isLoading, error, loadSettings, setTheme, clearError } = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Init local settings from store
  useEffect(() => {
    const merged = { ...DEFAULTS, ...settings };
    setLocalSettings(merged);
  }, [settings]);

  const handleSave = async (key: string, value: string) => {
    setSavingKey(key);
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await setSetting(key, value);
      // Refresh store
      await loadSettings();
    } catch { /* handled by store */ }
    setSavingKey(null);
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await clearHistory();
      setShowClearConfirm(false);
    } catch { /* ignore */ }
    setIsClearing(false);
  };

  const get = (key: string) => localSettings[key] || DEFAULTS[key] || "";

  if (isLoading && Object.keys(settings).length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
          <p className="text-xs text-gray-500 dark:text-gray-400">加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
          <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">中转服务配置</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 text-xs text-red-400">{error}</p>
          <button onClick={clearError} className="text-xs underline">关闭</button>
        </div>
      )}

      {/* ── 1. 代理服务 ── */}
      <Section icon={<Globe className="h-4 w-4" />} title="代理服务" subtitle="全局中转服务参数">
        <Row label="监听端口">
          <NumberInput value={get("proxy_port")} onChange={(v) => handleSave("proxy_port", v)} min={1} max={65535} />
        </Row>
        <Row label="启动时自动开启代理">
          <Toggle value={get("auto_start") === "true"} onChange={(v) => handleSave("auto_start", String(v))} />
        </Row>
        <Row label="请求超时 (ms)">
          <SelectInput value={get("request_timeout_ms")} onChange={(v) => handleSave("request_timeout_ms", v)}
            options={[
              { label: "30 秒", value: "30000" },
              { label: "60 秒", value: "60000" },
              { label: "120 秒", value: "120000" },
              { label: "300 秒", value: "300000" },
            ]} />
        </Row>
        <Row label="最大并发请求">
          <NumberInput value={get("max_concurrent")} onChange={(v) => handleSave("max_concurrent", v)} min={1} max={50} />
        </Row>
      </Section>

      {/* ── 2. OpenAI Codex 中转 ── */}
      <Section icon={<Braces className="h-4 w-4" />} title="OpenAI / Codex 中转" subtitle="OpenAI 兼容 API 中转参数" accent="indigo">
        <Row label="默认模型">
          <TextInput value={get("openai_default_model")} onChange={(v) => handleSave("openai_default_model", v)} placeholder="gpt-4o" />
        </Row>
        <Row label="启用流式传输 (SSE)">
          <Toggle value={get("openai_streaming") === "true"} onChange={(v) => handleSave("openai_streaming", String(v))} />
        </Row>
        <Row label="默认 Max Tokens">
          <SelectInput value={get("openai_max_tokens")} onChange={(v) => handleSave("openai_max_tokens", v)}
            options={[
              { label: "1024", value: "1024" }, { label: "2048", value: "2048" },
              { label: "4096", value: "4096" }, { label: "8192", value: "8192" },
              { label: "16384", value: "16384" },
            ]} />
        </Row>
        <Row label="默认 Temperature">
          <SelectInput value={get("openai_temperature")} onChange={(v) => handleSave("openai_temperature", v)}
            options={[
              { label: "0.0 (精确)", value: "0" }, { label: "0.3", value: "0.3" },
              { label: "0.7 (平衡)", value: "0.7" }, { label: "1.0 (创意)", value: "1.0" },
            ]} />
        </Row>
      </Section>

      {/* ── 3. Claude 中转 ── */}
      <Section icon={<Zap className="h-4 w-4" />} title="Anthropic Claude 中转" subtitle="Claude API 中转参数" accent="amber">
        <Row label="默认模型">
          <TextInput value={get("claude_default_model")} onChange={(v) => handleSave("claude_default_model", v)} placeholder="claude-sonnet-4-20250514" />
        </Row>
        <Row label="Thinking Budget (token)">
          <SelectInput value={get("claude_thinking_budget")} onChange={(v) => handleSave("claude_thinking_budget", v)}
            options={[
              { label: "关闭", value: "0" }, { label: "4000", value: "4000" },
              { label: "8000", value: "8000" }, { label: "16000", value: "16000" },
              { label: "32000", value: "32000" },
            ]} />
        </Row>
        <Row label="默认 Max Tokens">
          <SelectInput value={get("claude_max_tokens")} onChange={(v) => handleSave("claude_max_tokens", v)}
            options={[
              { label: "4096", value: "4096" }, { label: "8192", value: "8192" },
              { label: "16384", value: "16384" },
            ]} />
        </Row>
      </Section>

      {/* ── 4. 路由规则 ── */}
      <Section icon={<Route className="h-4 w-4" />} title="路由规则" subtitle="模型自动路由到对应 Provider">
        <Row label="路由模式">
          <div className="flex gap-2">
            {[
              { value: "auto", label: "自动", desc: "根据模型名自动匹配" },
              { value: "prefix", label: "前缀", desc: "openai/ 前缀指定 Provider" },
              { value: "default", label: "默认", desc: "全部走默认 Provider" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => handleSave("routing_mode", opt.value)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-center text-xs transition-all",
                  get("routing_mode") === opt.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                )}>
                <div className="font-medium">{opt.label}</div>
                <div className="mt-0.5 text-[10px] opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── 5. 安全 & 日志 ── */}
      <Section icon={<Shield className="h-4 w-4" />} title="安全 & 日志">
        <Row label="记录请求日志">
          <Toggle value={get("log_requests") === "true"} onChange={(v) => handleSave("log_requests", String(v))} />
        </Row>
        <Row label="日志保留天数">
          <SelectInput value={get("log_retention_days")} onChange={(v) => handleSave("log_retention_days", v)}
            options={[
              { label: "7 天", value: "7" }, { label: "14 天", value: "14" },
              { label: "30 天", value: "30" }, { label: "90 天", value: "90" },
            ]} />
        </Row>
      </Section>

      {/* ── 6. 主题 ── */}
      <Section icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} title="外观">
        <div className="flex gap-3">
          <ThemeBtn icon={<Sun className="h-4 w-4" />} label="浅色" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeBtn icon={<Moon className="h-4 w-4" />} label="深色" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </Section>

      {/* ── 7. 数据管理 ── */}
      <Section icon={<Trash2 className="h-4 w-4" />} title="数据管理">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">清除请求历史</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">删除所有已记录的请求数据</p>
          </div>
          <button onClick={() => setShowClearConfirm(true)} className="btn-danger text-sm flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" />清除
          </button>
        </div>
      </Section>

      {/* ── 8. 关于 ── */}
      <Section icon={<ExternalLink className="h-4 w-4" />} title="关于">
        <InfoRow label="应用" value="iTrun" />
        <InfoRow label="版本" value="v0.1.0" badge />
        <InfoRow label="描述" value="AI Codex & Claude 中转服务" />
        <InfoRow label="代理地址" value={`http://localhost:${proxyPort}`} />
      </Section>

      {/* Clear confirmation dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/95 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">确认清除历史记录？</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">此操作不可撤销。</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={handleClearHistory} disabled={isClearing} className="btn-danger text-sm">
                {isClearing ? "清除中..." : "确认清除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Components ─────────────────────────────────────────

function Section({ icon, title, subtitle, accent, children }: {
  icon: React.ReactNode; title: string; subtitle?: string; accent?: string; children: React.ReactNode;
}) {
  const borderColor = accent === "indigo" ? "border-l-indigo-500" : accent === "amber" ? "border-l-amber-500" : "border-l-transparent";
  return (
    <div className={cn("rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/60 p-6 backdrop-blur-xl border-l-4", borderColor)}>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-600 dark:text-gray-300 shrink-0">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", value ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-700")}>
      <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", value && "translate-x-5")} />
    </button>
  );
}

function NumberInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min: number; max: number }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(e.target.value)}
      className="input-field w-24 text-center text-sm" />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="input-field w-48 text-sm" />
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="input-field w-auto appearance-none text-sm pr-8">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ThemeBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all",
      active ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
    )}>
      {icon} {label}
    </button>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      {badge ? (
        <span className="rounded-md bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">{value}</span>
      ) : (
        <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
      )}
    </div>
  );
}
