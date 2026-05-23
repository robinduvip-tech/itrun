import { useState } from "react";
import {
  Settings,
  Server,
  Sun,
  Moon,
  Trash2,
  Database,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { cn } from "@/lib/utils";

export default function SettingsPanel() {
  const {
    settings,
    theme,
    proxyPort,
    isLoading,
    error,
    setSetting,
    setTheme,
    clearError,
  } = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  const [portInput, setPortInput] = useState(String(proxyPort));
  const [handleAutoStart, setHandleAutoStart] = useState(
    settings.auto_start === "true"
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  // Sync port input with store
  const handlePortChange = (value: string) => {
    setPortInput(value);
    const port = parseInt(value, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      setSetting("proxy_port", String(port));
    }
  };

  const handleAutoStartToggle = () => {
    const next = !handleAutoStart;
    setHandleAutoStart(next);
    setSetting("auto_start", String(next));
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    setClearResult(null);
    try {
      await clearHistory();
      setClearResult("success");
      setShowClearConfirm(false);
    } catch {
      setClearResult("error");
    } finally {
      setIsClearing(false);
    }
  };

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-600 border-t-bridge-500" />
          <p className="text-xs text-surface-500">加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bridge-500/20">
          <Settings className="h-4 w-4 text-bridge-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">设置</h2>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 text-xs text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="text-xs text-red-400 underline hover:text-red-300"
          >
            关闭
          </button>
        </div>
      )}

      {/* Proxy Settings */}
      <Section title="代理设置" icon={<Server className="h-4 w-4" />}>
        <div className="space-y-4">
          {/* Port */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-surface-300">
              代理端口
            </label>
            <input
              type="number"
              value={portInput}
              onChange={(e) => handlePortChange(e.target.value)}
              min={1}
              max={65535}
              className="input-field w-32 text-sm"
            />
            <p className="mt-1 text-xs text-surface-500">
              默认端口 9876，修改后需重启代理
            </p>
          </div>

          {/* Auto-start */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-surface-300">启动时自动开启代理</p>
              <p className="text-xs text-surface-500">应用启动后自动运行代理服务</p>
            </div>
            <button
              type="button"
              onClick={handleAutoStartToggle}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors duration-200",
                handleAutoStart ? "bg-bridge-600" : "bg-surface-700"
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                  handleAutoStart ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </Section>

      {/* Theme */}
      <Section title="主题" icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}>
        <div className="flex gap-3">
          <ThemeOption
            label="深色"
            icon={<Moon className="h-4 w-4" />}
            selected={theme === "dark"}
            onClick={() => handleThemeChange("dark")}
          />
          <ThemeOption
            label="浅色"
            icon={<Sun className="h-4 w-4" />}
            selected={theme === "light"}
            onClick={() => handleThemeChange("light")}
          />
        </div>
      </Section>

      {/* Data Management */}
      <Section title="数据管理" icon={<Database className="h-4 w-4" />}>
        <div className="space-y-4">
          {/* Clear History */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-surface-300">清除请求历史</p>
              <p className="text-xs text-surface-500">删除所有已记录的请求数据</p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn-danger flex items-center gap-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清除历史
            </button>
          </div>

          {/* Clear result */}
          {clearResult === "success" && (
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400">
              历史记录已清除
            </div>
          )}
          {clearResult === "error" && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
              清除失败，请重试
            </div>
          )}

          {/* DB Path */}
          <div className="rounded-xl bg-surface-800/50 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
              数据库路径
            </p>
            <p className="mt-1 font-mono text-xs text-surface-400">
              {settings.db_path || "~/.itrun/data.db"}
            </p>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="关于" icon={<ExternalLink className="h-4 w-4" />}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">应用名称</span>
            <span className="text-xs font-medium text-surface-200">iTrun</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">版本</span>
            <span className="rounded-md bg-bridge-500/10 px-2 py-0.5 text-xs font-medium text-bridge-400">
              v0.1.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">描述</span>
            <span className="text-xs text-surface-300">
              AI API 代理 & 请求管理
            </span>
          </div>
        </div>
      </Section>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-surface-700/60 bg-surface-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">确认清除历史记录？</p>
                <p className="mt-0.5 text-xs text-surface-400">
                  此操作不可撤销，所有请求记录将被永久删除。
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className="btn-danger flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isClearing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isClearing ? "清除中..." : "确认清除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="text-surface-400">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ThemeOption({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-medium transition-all duration-200",
        selected
          ? "border-bridge-500/40 bg-bridge-500/10 text-bridge-400"
          : "border-surface-700 bg-surface-800/50 text-surface-400 hover:border-surface-600 hover:text-surface-300"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
