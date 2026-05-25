import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import IconBar from "./IconBar";
import { useProxyStore } from "@/stores/proxyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Layout() {
  const startProxy = useProxyStore((s) => s.startProxy);
  const refreshStatus = useProxyStore((s) => s.refreshStatus);
  const isRunning = useProxyStore((s) => s.isRunning);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const proxyPort = useSettingsStore((s) => s.proxyPort);
  const settingsLoading = useSettingsStore((s) => s.isLoading);
  const [isMaximized, setIsMaximized] = useState(false);
  const hasAutoStarted = useState(false)[1];

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Auto-start proxy after settings load
  useEffect(() => {
    if (!settingsLoading && proxyPort > 0 && !isRunning) {
      refreshStatus().then(() => {
        const running = useProxyStore.getState().isRunning;
        if (!running) {
          console.log("Auto-starting proxy on port", proxyPort);
          startProxy(proxyPort).catch((e: any) => console.error("Auto-start failed:", e));
        }
      });
    }
  }, [settingsLoading, proxyPort]);

  const handleMinimize = () => { getCurrentWindow().minimize(); };
  const handleMaximize = () => {
    const w = getCurrentWindow();
    w.isMaximized().then((maxed) => {
      if (maxed) { w.unmaximize(); setIsMaximized(false); }
      else { w.maximize(); setIsMaximized(true); }
    });
  };
  const handleClose = () => { getCurrentWindow().close(); };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div data-tauri-drag-region className="flex h-8 shrink-0 items-center justify-between bg-gray-100 dark:bg-[#1a1a1f] select-none">
        <div className="flex items-center gap-2 pl-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600">
            <span className="text-[9px] font-bold text-white">Ti</span>
          </div>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">iTrun</span>
        </div>
        <div className="flex items-center px-1">
          <button onClick={handleMinimize} className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors"><Minus className="h-3.5 w-3.5" /></button>
          <button onClick={handleMaximize} className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors">{isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}</button>
          <button onClick={handleClose} className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <IconBar />
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
