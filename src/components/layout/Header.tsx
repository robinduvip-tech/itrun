import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Play, Square, RefreshCw } from "lucide-react";
import { useProxyStore } from "@/stores/proxyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "控制台",
  "/providers": "供应商管理",
  "/history": "请求历史",
  "/settings": "设置",
};

export default function Header() {
  const location = useLocation();
  const isRunning = useProxyStore((s) => s.isRunning);
  const isLoading = useProxyStore((s) => s.isLoading);
  const startProxy = useProxyStore((s) => s.startProxy);
  const stopProxy = useProxyStore((s) => s.stopProxy);
  const proxyPort = useSettingsStore((s) => s.proxyPort);

  const title = useMemo(() => {
    // Match exact path or path starting with the prefix
    if (pageTitles[location.pathname]) return pageTitles[location.pathname];
    // Try matching prefix for nested routes
    for (const [path, name] of Object.entries(pageTitles)) {
      if (path !== "/" && location.pathname.startsWith(path)) return name;
    }
    return "iTrun";
  }, [location.pathname]);

  const handleToggleProxy = async () => {
    if (isRunning) {
      await stopProxy();
    } else {
      await startProxy(proxyPort);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6 backdrop-blur-md" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
      {/* Page Title */}
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>

      {/* Proxy Toggle */}
      <button
        onClick={handleToggleProxy}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isRunning
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            : "bg-bridge-500/10 text-bridge-400 hover:bg-bridge-500/20 border border-bridge-500/20"
        )}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : isRunning ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span>{isRunning ? "停止代理" : "启动代理"}</span>

        {/* Running indicator */}
        {isRunning && (
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
        )}
      </button>
    </header>
  );
}
