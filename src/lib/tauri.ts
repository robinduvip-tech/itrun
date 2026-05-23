import { invoke } from "@tauri-apps/api/core";

// ── TypeScript Interfaces ──────────────────────────────────────────

export interface ProxyStatus {
  is_running: boolean;
  port: number;
  uptime_seconds: number;
  requests_handled: number;
  active_connections: number;
}

export interface Provider {
  id: string;
  name: string;
  provider_type: string;
  api_base: string;
  api_key: string;
  models: string[];
  is_default: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderInput {
  name: string;
  provider_type: string;
  api_base: string;
  api_key: string;
  models: string[];
}

export interface ModelInfo {
  name: string;
  provider_id: string;
  provider_name: string;
}

export interface HistoryEntry {
  id: string;
  request_type: string;
  provider_id: string;
  model: string;
  status: string;
  tokens_used: number;
  latency_ms: number;
  request_body_preview: string;
  response_body_preview: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryQuery {
  page?: number;
  page_size?: number;
  provider?: string;
  model?: string;
  status?: "success" | "error" | "all";
  search?: string;
}

// Internal filter matching Rust HistoryFilter
interface HistoryFilter {
  limit: number;
  offset: number;
  provider_id?: string;
  model?: string;
  status?: string;
}

export interface DashboardStats {
  total_requests: number;
  total_tokens: number;
  total_errors: number;
  avg_latency_ms: number;
  by_provider: ProviderStat[];
}

export interface ProviderStat {
  provider_id: string;
  request_count: number;
  token_count: number;
  avg_latency_ms: number;
}

export interface DailyStat {
  date: string;
  provider_id: string;
  request_count: number;
  token_count: number;
  error_count: number;
  avg_latency_ms: number;
}

export interface ProviderLatencyStat {
  provider: string;
  avg_latency_ms: number;
  request_count: number;
}

// ── Tauri Invoke Wrappers ──────────────────────────────────────────

export async function startProxy(port: number): Promise<number> {
  return invoke<number>("start_proxy", { port });
}

export async function stopProxy(): Promise<void> {
  return invoke<void>("stop_proxy");
}

export async function getProxyStatus(): Promise<ProxyStatus> {
  return invoke<ProxyStatus>("get_proxy_status");
}

export async function addProvider(data: ProviderInput): Promise<Provider> {
  return invoke<Provider>("add_provider", {
    args: {
      id: data.name.toLowerCase().replace(/\s+/g, "-"),
      name: data.name,
      provider_type: data.provider_type,
      api_key: data.api_key,
      base_url: data.api_base,
      config: { models: data.models },
    },
  });
}

export async function updateProvider(
  id: string,
  data: ProviderInput
): Promise<void> {
  return invoke<void>("update_provider_cmd", {
    args: {
      id,
      name: data.name,
      provider_type: data.provider_type,
      api_key: data.api_key,
      base_url: data.api_base,
      config: data.models,
    },
  });
}

export async function removeProvider(id: string): Promise<void> {
  return invoke<void>("remove_provider", { id });
}

export async function listProviders(): Promise<Provider[]> {
  return invoke<Provider[]>("list_providers_cmd");
}

export async function testProviderConnection(id: string): Promise<boolean> {
  return invoke<boolean>("test_provider_connection", { id });
}

export async function setDefaultProvider(id: string): Promise<void> {
  return invoke<void>("set_default_provider_cmd", { id });
}

export async function getHistory(
  params: HistoryQuery
): Promise<{ entries: HistoryEntry[]; total: number }> {
  const page = params.page || 1;
  const pageSize = params.page_size || 20;
  const filter: HistoryFilter = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    provider_id: params.provider || undefined,
    model: params.model || undefined,
    status: params.status === "all" ? undefined : params.status,
  };
  return invoke<{ entries: HistoryEntry[]; total: number }>("get_history", {
    filter,
  });
}

export async function getRequestDetail(id: string): Promise<HistoryEntry> {
  return invoke<HistoryEntry>("get_request_detail", { id });
}

export async function clearHistory(): Promise<void> {
  return invoke<void>("clear_history_cmd");
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return invoke<DashboardStats>("get_dashboard_stats");
}

export async function getDailyStats(
  days: number
): Promise<DailyStat[]> {
  return invoke<DailyStat[]>("get_daily_stats_cmd", { days });
}

export async function getProviderLatencyStats(): Promise<ProviderLatencyStat[]> {
  // Not yet implemented in backend — return empty for now
  return [];
}

export async function getSettings(): Promise<Record<string, string>> {
  return invoke<Record<string, string>>("get_settings");
}

export async function setSetting(
  key: string,
  value: string
): Promise<void> {
  return invoke<void>("set_setting", { key, value });
}
