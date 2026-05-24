use tauri::command;
use crate::configs::{self, ConfigFile, codex_switch::{self, CodexConfigStatus}};

#[command]
pub async fn scan_configs() -> Result<Vec<ConfigFile>, String> {
    Ok(configs::scan_all_configs())
}

#[command]
pub async fn read_config_file(path: String) -> Result<ConfigFile, String> {
    configs::read_config(&path)
}

#[command]
pub async fn write_config_file(path: String, content: String) -> Result<(), String> {
    configs::write_config(&path, &content, true)
}

#[command]
pub async fn get_codex_config_status() -> Result<CodexConfigStatus, String> {
    Ok(codex_switch::get_codex_status())
}

#[command]
pub async fn switch_codex_mode(
    mode: String,
    api_key: String,
    base_url: String,
    model: String,
) -> Result<CodexConfigStatus, String> {
    codex_switch::switch_mode(&mode, &api_key, &base_url, &model)
}
