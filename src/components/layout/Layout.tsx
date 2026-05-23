import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useEffect, useRef } from "react";
import { useProxyStore } from "@/stores/proxyStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function Layout() {
  const startAutoRefresh = useProxyStore((s) => s.startAutoRefresh);
  const isRunning = useProxyStore((s) => s.isRunning);
  const isLoading = useProxyStore((s) => s.isLoading);
  const startProxy = useProxyStore((s) => s.startProxy);
  const refreshStatus = useProxyStore((s) => s.refreshStatus);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const proxyPort = useSettingsStore((s) => s.proxyPort);
  const settingsLoaded = useSettingsStore((s) => !s.isLoading && s.settings !== undefined);
  const autoStartAttempted = useRef(false);

  useEffect(() => {
    // Load settings on mount
    loadSettings();

    // Start proxy status auto-refresh
    const cleanup = startAutoRefresh();
    return () => cleanup();
  }, [startAutoRefresh, loadSettings]);

  // Auto-start proxy after settings are loaded
  useEffect(() => {
    if (settingsLoaded && !autoStartAttempted.current && !isRunning && !isLoading) {
      autoStartAttempted.current = true;
      // Check current status first, then auto-start
      refreshStatus().then(() => {
        const running = useProxyStore.getState().isRunning;
        if (!running) {
          startProxy(proxyPort);
        }
      });
    }
  }, [settingsLoaded, isRunning, isLoading, startProxy, proxyPort, refreshStatus]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-950 text-surface-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
