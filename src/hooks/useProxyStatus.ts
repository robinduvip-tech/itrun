import { useEffect } from "react";
import { useProxyStore } from "@/stores/proxyStore";

export function useProxyStatus() {
  const isRunning = useProxyStore((s) => s.isRunning);
  const port = useProxyStore((s) => s.port);
  const uptimeSeconds = useProxyStore((s) => s.uptimeSeconds);
  const refreshStatus = useProxyStore((s) => s.refreshStatus);

  // Poll refreshStatus every 3 seconds
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(() => {
      refreshStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return { isRunning, port, uptime: uptimeSeconds };
}
