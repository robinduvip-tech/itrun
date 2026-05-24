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
  id: string;
  name: string;
  provider_name: string;
  max_tokens: number;
  pricing: Record<string, string>;
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

export async function fetchProviderModels(id: string): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("fetch_provider_models", { id });
}

export async function tryFetchModels(
  providerType: string,
  apiKey: string,
  baseUrl: string
): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("try_fetch_models", {
    providerType,
    apiKey,
    baseUrl,
  });
}

export async function listAllModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("list_all_models_cmd");
}

// ── Config Scanner ─────────────────────────────────────────────

export interface ConfigFile {
  name: string;
  category: string;
  path: string;
  exists: boolean;
  content?: string;
  keys?: ConfigKey[];
}

export interface ConfigKey {
  key: string;
  value: string;
  description: string;
}

export async function scanConfigs(): Promise<ConfigFile[]> {
  return invoke<ConfigFile[]>("scan_configs");
}

export async function readConfigFile(path: string): Promise<ConfigFile> {
  return invoke<ConfigFile>("read_config_file", { path });
}

export async function writeConfigFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_config_file", { path, content });
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

export interface ProviderHealth {
  id: string;
  healthy: boolean;
  latency_ms: number;
  rate_test_ms: number;
  last_checked: string;
}

export async function testProviderHealth(id: string): Promise<ProviderHealth> {
  return invoke<ProviderHealth>("test_provider_health", { id });
}

export async function checkAllProvidersHealth(): Promise<ProviderHealth[]> {
  return invoke<ProviderHealth[]>("check_all_providers_health");
}

// ── Codex Config Switcher ──────────────────────────────────────

export interface CodexConfigStatus {
  mode: string;
  auth_json_exists: boolean;
  config_toml_exists: boolean;
  backup_exists: boolean;
  auth_json_preview: string;
  config_toml_preview: string;
}

export async function getCodexConfigStatus(): Promise<CodexConfigStatus> {
  return invoke<CodexConfigStatus>("get_codex_config_status");
}

export async function switchCodexMode(
  mode: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<CodexConfigStatus> {
  return invoke<CodexConfigStatus>("switch_codex_mode", { mode, apiKey, baseUrl, model });
}

// ── Codex Profile Management ───────────────────────────────────

export interface CodexProfile {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
  model: string;
  created_at: string;
}

export interface CodexStatus {
  profiles: CodexProfile[];
  active_id: string | null;
  backup_exists: boolean;
  current_auth: string;
  current_config: string;
}

export async function getCodexStatus(): Promise<CodexStatus> {
  return invoke<CodexStatus>("get_codex_status");
}

export async function addCodexProfile(
  name: string, apiKey: string, baseUrl: string, model: string
): Promise<CodexStatus> {
  return invoke<CodexStatus>("add_codex_profile", { name, apiKey, baseUrl, model });
}

export async function deleteCodexProfile(id: string): Promise<CodexStatus> {
  return invoke<CodexStatus>("delete_codex_profile", { id });
}

export async function switchCodexProfile(id: string): Promise<CodexStatus> {
  return invoke<CodexStatus>("switch_codex_profile", { id });
}

export async function backupCodexOfficial(): Promise<CodexStatus> {
  return invoke<CodexStatus>("backup_codex_official");
}

export async function restoreCodexOfficial(): Promise<CodexStatus> {
  return invoke<CodexStatus>("restore_codex_official");
}

export async function updateCodexProfile(
  id: string, name: string, apiKey: string, baseUrl: string, model: string, customName: string
): Promise<CodexStatus> {
  return invoke<CodexStatus>("update_codex_profile", { id, name, apiKey, baseUrl, model, customName });
}

export async function testCodexProfile(id: string): Promise<string> {
  return invoke<string>("test_codex_profile", { id });
}

export async function writeCodexFiles(authJson: string, configToml: string): Promise<void> {
  return invoke<void>("write_codex_files", { authJson, configToml });
}
