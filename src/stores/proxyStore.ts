import { create } from "zustand";
import {
  startProxy as tauriStartProxy,
  stopProxy as tauriStopProxy,
  getProxyStatus,
  type ProxyStatus,
} from "@/lib/tauri";

interface ProxyState {
  isRunning: boolean;
  port: number;
  uptimeSeconds: number;
  requestsHandled: number;
  activeConnections: number;
  isLoading: boolean;
  error: string | null;

  startProxy: (port: number) => Promise<void>;
  stopProxy: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  startAutoRefresh: () => () => void;
}

export const useProxyStore = create<ProxyState>((set, get) => {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    isRunning: false,
    port: 0,
    uptimeSeconds: 0,
    requestsHandled: 0,
    activeConnections: 0,
    isLoading: false,
    error: null,

    startProxy: async (port: number) => {
      set({ isLoading: true, error: null });
      try {
        const actualPort = await tauriStartProxy(port);
        set({
          isRunning: true,
          port: actualPort,
          isLoading: false,
        });
        // Refresh full status immediately
        await get().refreshStatus();
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to start proxy",
        });
      }
    },

    stopProxy: async () => {
      set({ isLoading: true, error: null });
      try {
        await tauriStopProxy();
        set({
          isRunning: false,
          port: 0,
          uptimeSeconds: 0,
          requestsHandled: 0,
          activeConnections: 0,
          isLoading: false,
        });
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to stop proxy",
        });
      }
    },

    refreshStatus: async () => {
      try {
        const status: ProxyStatus = await getProxyStatus();
        set({
          isRunning: status.is_running,
          port: status.port,
          uptimeSeconds: status.uptime_seconds,
          requestsHandled: status.requests_handled,
          activeConnections: status.active_connections,
          error: null,
        });
      } catch (err) {
        set({
          isRunning: false,
          error: err instanceof Error ? err.message : "Failed to get status",
        });
      }
    },

    startAutoRefresh: () => {
      // Clear existing interval if any
      if (intervalId) clearInterval(intervalId);

      // Poll every 5 seconds when running
      intervalId = setInterval(() => {
        const { isRunning } = get();
        if (isRunning) {
          get().refreshStatus();
        }
      }, 5000);

      // Return cleanup function
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
  };
});
