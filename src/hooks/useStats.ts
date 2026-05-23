import { useEffect, useState, useCallback } from "react";
import {
  getDashboardStats,
  getDailyStats,
  getProviderLatencyStats,
  type DashboardStats,
  type DailyStat,
  type ProviderLatencyStat,
} from "@/lib/tauri";
import { useProxyStore } from "@/stores/proxyStore";

export function useStats() {
  const isRunning = useProxyStore((s) => s.isRunning);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [providerLatencyStats, setProviderLatencyStats] = useState<
    ProviderLatencyStat[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const [s, ds, ls] = await Promise.all([
        getDashboardStats(),
        getDailyStats(7),
        getProviderLatencyStats(),
      ]);
      setStats(s);
      setDailyStats(ds);
      setProviderLatencyStats(ls);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard stats"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and when proxy status changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats, isRunning]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    dailyStats,
    providerLatencyStats,
    isLoading,
    error,
  };
}
