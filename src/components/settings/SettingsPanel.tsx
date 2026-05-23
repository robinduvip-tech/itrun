import { useState } from "react";
import { Settings, Sun, Moon, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { cn } from "@/lib/utils";

export default function SettingsPanel() {
  const { theme, proxyPort, setTheme } = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try { await clearHistory(); setShowClearConfirm(false); } catch { /* ignore */ }
    setIsClearing(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-800">
          <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
      </div>

      {/* 外观 */}
      <Section title="外观" icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}>
        <div className="flex gap-3">
          <ThemeBtn icon={<Sun className="h-4 w-4" />} label="浅色" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeBtn icon={<Moon className="h-4 w-4" />} label="深色" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </Section>

      {/* 数据管理 */}
      <Section title="数据管理" icon={<Trash2 className="h-4 w-4" />}>
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

      {/* 关于 */}
      <Section title="关于" icon={<ExternalLink className="h-4 w-4" />}>
        <InfoRow label="应用" value="iTrun" />
        <InfoRow label="版本" value="v0.1.0" badge />
        <InfoRow label="代理地址" value={`http://localhost:${proxyPort}`} />
        <InfoRow label="描述" value="AI 中转客户端" />
      </Section>

      {/* Clear confirmation */}
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-surface-700/60 bg-white dark:bg-surface-900/60 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
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
