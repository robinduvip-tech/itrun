use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Config mode for Codex
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CodexMode {
    /// Restore official/original config from backup
    Official,
    /// Apply custom relay settings
    Custom,
    /// Clean default config (official API)
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfigStatus {
    pub mode: String,
    pub auth_json_exists: bool,
    pub config_toml_exists: bool,
    pub backup_exists: bool,
    pub auth_json_preview: String,
    pub config_toml_preview: String,
}

/// Get the codex config directory path
fn codex_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    PathBuf::from(&home).join(".codex")
}

fn auth_path() -> PathBuf { codex_dir().join("auth.json") }
fn config_path() -> PathBuf { codex_dir().join("config.toml") }
fn auth_backup_path() -> PathBuf { codex_dir().join("auth.json.backup") }
fn config_backup_path() -> PathBuf { codex_dir().join("config.toml.backup") }

/// Read the current codex config status
pub fn get_codex_status() -> CodexConfigStatus {
    let dir = codex_dir();
    let _ = std::fs::create_dir_all(&dir);

    let auth_exists = auth_path().exists();
    let config_exists = config_path().exists();
    let backup_exists = auth_backup_path().exists();

    let auth_preview = if auth_exists {
        std::fs::read_to_string(auth_path()).unwrap_or_default()
    } else {
        String::from("{}")
    };

    let config_preview = if config_exists {
        std::fs::read_to_string(config_path()).unwrap_or_default()
    } else {
        String::new()
    };

    CodexConfigStatus {
        mode: "unknown".to_string(),
        auth_json_exists: auth_exists,
        config_toml_exists: config_exists,
        backup_exists,
        auth_json_preview: auth_preview,
        config_toml_preview: config_preview,
    }
}

/// Create backup of current config files
pub fn backup_codex_config() -> Result<(), String> {
    let dir = codex_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create .codex dir: {}", e))?;

    if auth_path().exists() {
        std::fs::copy(auth_path(), auth_backup_path())
            .map_err(|e| format!("Cannot backup auth.json: {}", e))?;
    }
    if config_path().exists() {
        std::fs::copy(config_path(), config_backup_path())
            .map_err(|e| format!("Cannot backup config.toml: {}", e))?;
    }
    Ok(())
}

/// Restore from backup (official mode)
pub fn restore_official() -> Result<(), String> {
    if auth_backup_path().exists() {
        std::fs::copy(auth_backup_path(), auth_path())
            .map_err(|e| format!("Cannot restore auth.json: {}", e))?;
    }
    if config_backup_path().exists() {
        std::fs::copy(config_backup_path(), config_path())
            .map_err(|e| format!("Cannot restore config.toml: {}", e))?;
    }
    Ok(())
}

/// Apply custom relay settings to codex config
pub fn apply_custom(api_key: &str, base_url: &str, model: &str) -> Result<(), String> {
    let dir = codex_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create .codex dir: {}", e))?;

    // Write custom auth.json
    let auth = serde_json::json!({
        "api_key": api_key,
    });
    let auth_str = serde_json::to_string_pretty(&auth)
        .map_err(|e| format!("Cannot serialize auth.json: {}", e))?;
    std::fs::write(auth_path(), auth_str)
        .map_err(|e| format!("Cannot write auth.json: {}", e))?;

    // Write custom config.toml
    let config_content = format!(
        "# iTrun custom relay config\n\
         base_url = \"{}\"\n\
         model = \"{}\"\n\
         # Managed by iTrun — do not edit manually\n",
        base_url, model
    );
    std::fs::write(config_path(), config_content)
        .map_err(|e| format!("Cannot write config.toml: {}", e))?;

    Ok(())
}

/// Apply default (official Codex) config
pub fn apply_default() -> Result<(), String> {
    let dir = codex_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create .codex dir: {}", e))?;

    // Default auth.json — user needs to set their own key
    let auth = serde_json::json!({
        "api_key": "",
    });
    let auth_str = serde_json::to_string_pretty(&auth)
        .map_err(|e| format!("Cannot serialize auth.json: {}", e))?;
    std::fs::write(auth_path(), auth_str)
        .map_err(|e| format!("Cannot write auth.json: {}", e))?;

    // Default config.toml — no base_url override (uses official)
    let config_content = "# Default Codex config — using official OpenAI API\n# Set your API key via: codex auth\n";
    std::fs::write(config_path(), config_content)
        .map_err(|e| format!("Cannot write config.toml: {}", e))?;

    Ok(())
}

/// Switch to a specific mode. Creates backup first if none exists.
pub fn switch_mode(mode: &str, api_key: &str, base_url: &str, model: &str) -> Result<CodexConfigStatus, String> {
    // Always create backup on first switch
    if !auth_backup_path().exists() && auth_path().exists() {
        backup_codex_config()?;
    }

    match mode {
        "default" => apply_default()?,
        "custom" => apply_custom(api_key, base_url, model)?,
        "official" => restore_official()?,
        _ => return Err(format!("Unknown mode: {}", mode)),
    }

    Ok(get_codex_status())
}
