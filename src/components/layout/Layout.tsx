import { Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import IconBar from "./IconBar";
import { useProxyStore } from "@/stores/proxyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Layout() {
  const startProxy = useProxyStore((s) => s.startProxy);
  const refreshStatus = useProxyStore((s) => s.refreshStatus);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const proxyPort = useSettingsStore((s) => s.proxyPort);
  const settingsLoaded = useSettingsStore((s) => !s.isLoading);
  const autoStartAttempted = useRef(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (settingsLoaded && !autoStartAttempted.current) {
      autoStartAttempted.current = true;
      refreshStatus().then(() => {
        if (!useProxyStore.getState().isRunning) startProxy(proxyPort);
      });
    }
  }, [settingsLoaded]);

  const handleMinimize = () => {
    getCurrentWindow().minimize();
  };

  const handleMaximize = () => {
    const w = getCurrentWindow();
    w.isMaximized().then((maxed) => {
      if (maxed) {
        w.unmaximize();
        setIsMaximized(false);
      } else {
        w.maximize();
        setIsMaximized(true);
      }
    });
  };

  const handleClose = () => {
    getCurrentWindow().close();
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Custom title bar — draggable, no-drag on buttons */}
      <div data-tauri-drag-region className="flex h-8 shrink-0 items-center justify-end bg-gray-100 dark:bg-[#1a1a1f] px-1 select-none">
        <button onClick={handleMinimize}
          className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleMaximize}
          className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-700 transition-colors">
          {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
        </button>
        <button onClick={handleClose}
          className="flex h-7 w-10 items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <IconBar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
