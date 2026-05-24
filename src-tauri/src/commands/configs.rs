use tauri::command;
use crate::configs::{self, ConfigFile, codex_switch::{self, CodexProfile, CodexStatus}};

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
pub async fn get_codex_status() -> Result<CodexStatus, String> {
    Ok(codex_switch::get_status())
}

#[command]
pub async fn add_codex_profile(name: String, api_key: String, base_url: String, model: String) -> Result<CodexStatus, String> {
    codex_switch::add_profile(&name, &api_key, &base_url, &model)?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn delete_codex_profile(id: String) -> Result<CodexStatus, String> {
    codex_switch::delete_profile(&id)?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn switch_codex_profile(id: String) -> Result<CodexStatus, String> {
    codex_switch::switch_to_profile(&id)?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn backup_codex_official() -> Result<CodexStatus, String> {
    codex_switch::backup_official()?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn restore_codex_official() -> Result<CodexStatus, String> {
    codex_switch::restore_official()?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn update_codex_profile(id: String, name: String, api_key: String, base_url: String, model: String) -> Result<CodexStatus, String> {
    codex_switch::update_profile(&id, &name, &api_key, &base_url, &model)?;
    Ok(codex_switch::get_status())
}

#[command]
pub async fn test_codex_profile(id: String) -> Result<String, String> {
    let status = codex_switch::get_status();
    let profile = status.profiles.iter().find(|p| p.id == id)
        .cloned()
        .ok_or_else(|| format!("Profile not found: {}", id))?;

    let start = std::time::Instant::now();
    let client = reqwest::Client::new();
    let url = format!("{}/models", profile.base_url.trim_end_matches('/'));
    let result = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", profile.api_key))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await;

    let latency_ms = start.elapsed().as_millis();
    match result {
        Ok(resp) => {
            let is_ok = resp.status().is_success();
            if is_ok {
                Ok(format!("OK {}ms", latency_ms))
            } else {
                let code = resp.status().as_u16();
                Err(format!("HTTP {} — {}ms", code, latency_ms))
            }
        }
        Err(e) => Err(format!("FAIL {}ms: {}", latency_ms, e)),
    }
}

#[command]
pub async fn write_codex_files(auth_json: String, config_toml: String) -> Result<(), String> {
    let dir = std::path::PathBuf::from(
        std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).unwrap_or_else(|_| ".".to_string())
    ).join(".codex");
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir: {}", e))?;
    std::fs::write(dir.join("auth.json"), auth_json).map_err(|e| format!("write auth: {}", e))?;
    std::fs::write(dir.join("config.toml"), config_toml).map_err(|e| format!("write config: {}", e))?;
    Ok(())
}
