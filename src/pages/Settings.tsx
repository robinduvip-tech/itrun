import { useState } from "react";
import { Sun, Moon, Trash2, AlertTriangle } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { theme, proxyPort, setTheme } = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-surface-950">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-100 dark:border-surface-800/60 px-6">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">设置</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-lg space-y-6">
        <Section label="外观">
          <div className="flex gap-3">
            <ThemeBtn icon={<Sun className="h-4 w-4" />} label="浅色" active={theme === "light"} onClick={() => setTheme("light")} />
            <ThemeBtn icon={<Moon className="h-4 w-4" />} label="深色" active={theme === "dark"} onClick={() => setTheme("dark")} />
          </div>
        </Section>
        <Section label="数据">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">清除请求历史</p>
              <p className="text-xs text-gray-500 mt-0.5">删除所有已记录的请求数据</p></div>
            <button onClick={() => setShowClearConfirm(true)} className="btn-danger text-xs flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" />清除</button>
          </div>
        </Section>
        <Section label="关于">
          <InfoRow label="应用" value="iTrun" />
          <InfoRow label="版本" value="v0.1.0" badge />
          <InfoRow label="代理地址" value={`http://localhost:${proxyPort}`} />
        </Section>
      </div>
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="relative rounded-2xl bg-white dark:bg-surface-900 p-6 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-sm font-semibold">确认清除历史记录？</p>
                <p className="text-xs text-gray-500 mt-0.5">此操作不可撤销。</p></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={async () => { setIsClearing(true); await clearHistory(); setIsClearing(false); setShowClearConfirm(false); }}
                disabled={isClearing} className="btn-danger text-sm">{isClearing ? "清除中..." : "确认清除"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p><div className="space-y-3">{children}</div></div>;
}

function ThemeBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all",
    active ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border-gray-200 text-gray-500 dark:border-gray-700")}>{icon} {label}</button>;
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return <div className="flex items-center justify-between py-1.5"><span className="text-sm text-gray-500">{label}</span>
    {badge ? <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{value}</span>
      : <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}</div>;
}
