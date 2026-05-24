import { Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import IconBar from "./IconBar";
import { useProxyStore } from "@/stores/proxyStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function Layout() {
  const startProxy = useProxyStore((s) => s.startProxy);
  const refreshStatus = useProxyStore((s) => s.refreshStatus);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const proxyPort = useSettingsStore((s) => s.proxyPort);
  const settingsLoaded = useSettingsStore((s) => !s.isLoading);
  const autoStartAttempted = useRef(false);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (settingsLoaded && !autoStartAttempted.current) {
      autoStartAttempted.current = true;
      refreshStatus().then(() => {
        if (!useProxyStore.getState().isRunning) startProxy(proxyPort);
      });
    }
  }, [settingsLoaded]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <IconBar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
