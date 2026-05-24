use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A saved Codex configuration profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexProfile {
    pub id: String,
    pub name: String,
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CodexProfiles {
    pub active: Option<String>,
    pub profiles: Vec<CodexProfile>,
    pub official_backup_exists: bool,
}

fn codex_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).unwrap_or_else(|_| ".".to_string());
    PathBuf::from(&home).join(".codex")
}
fn profiles_path() -> PathBuf { codex_dir().join("profiles.json") }
fn auth_path() -> PathBuf { codex_dir().join("auth.json") }
fn config_path() -> PathBuf { codex_dir().join("config.toml") }
fn auth_backup() -> PathBuf { codex_dir().join("auth.json.backup") }
fn config_backup() -> PathBuf { codex_dir().join("config.toml.backup") }

pub fn load_profiles() -> CodexProfiles {
    let _ = std::fs::create_dir_all(codex_dir());
    if let Ok(content) = std::fs::read_to_string(profiles_path()) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        let mut p = CodexProfiles::default();
        p.official_backup_exists = auth_backup().exists();
        p
    }
}

fn save_profiles(profiles: &CodexProfiles) -> Result<(), String> {
    let content = serde_json::to_string_pretty(profiles).map_err(|e| format!("Serialize: {}", e))?;
    std::fs::write(profiles_path(), content).map_err(|e| format!("Write: {}", e))
}

pub fn add_profile(name: &str, api_key: &str, base_url: &str, model: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    let id = uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown").to_string();
    profiles.profiles.push(CodexProfile { id, name: name.to_string(), api_key: api_key.to_string(), base_url: base_url.to_string(), model: model.to_string(), created_at: chrono::Utc::now().to_rfc3339() });
    save_profiles(&profiles)?;
    Ok(profiles)
}

pub fn delete_profile(id: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    profiles.profiles.retain(|p| p.id != id);
    if profiles.active.as_deref() == Some(id) { profiles.active = None; }
    save_profiles(&profiles)?;
    Ok(profiles)
}

pub fn backup_official() -> Result<(), String> {
    std::fs::create_dir_all(codex_dir()).ok();
    if auth_path().exists() { std::fs::copy(auth_path(), auth_backup()).map_err(|e| format!("Backup auth: {}", e))?; }
    if config_path().exists() { std::fs::copy(config_path(), config_backup()).map_err(|e| format!("Backup config: {}", e))?; }
    let mut profiles = load_profiles();
    profiles.official_backup_exists = true;
    save_profiles(&profiles)?;
    Ok(())
}

/// Apply a profile — properly merges into existing TOML preserving all sections
pub fn switch_to_profile(id: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    let profile = profiles.profiles.iter().find(|p| p.id == id).cloned()
        .ok_or_else(|| format!("Profile not found: {}", id))?;

    if !profiles.official_backup_exists && auth_path().exists() {
        backup_official()?;
        profiles = load_profiles();
    }

    // Write auth.json
    let auth = serde_json::json!({ "api_key": &profile.api_key });
    std::fs::write(auth_path(), serde_json::to_string_pretty(&auth).unwrap_or_default())
        .map_err(|e| format!("Write auth.json: {}", e))?;

    // Write config.toml — preserve existing structure, only modify relay fields
    write_codex_config(&profile.base_url, &profile.model)?;

    profiles.active = Some(id.to_string());
    save_profiles(&profiles)?;
    Ok(profiles)
}

/// Write Codex config.toml preserving all existing sections
fn write_codex_config(base_url: &str, model: &str) -> Result<(), String> {
    // Read existing config.toml as raw TOML Value
    let mut root: toml::Value = if config_path().exists() {
        let content = std::fs::read_to_string(config_path()).unwrap_or_default();
        toml::from_str(&content).unwrap_or(toml::Value::Table(toml::value::Table::new()))
    } else {
        toml::Value::Table(toml::value::Table::new())
    };

    let table = root.as_table_mut().ok_or("Invalid TOML root")?;

    // Set top-level relay fields
    table.insert("model_provider".into(), toml::Value::String("custom".into()));
    table.insert("model".into(), toml::Value::String(model.to_string()));

    // Ensure model_providers section exists
    if !table.contains_key("model_providers") {
        table.insert("model_providers".into(), toml::Value::Table(toml::value::Table::new()));
    }

    // Set model_providers.custom
    if let Some(providers) = table.get_mut("model_providers").and_then(|v| v.as_table_mut()) {
        let mut custom = toml::value::Table::new();
        custom.insert("name".into(), toml::Value::String(model.to_string()));
        custom.insert("wire_api".into(), toml::Value::String("responses".into()));
        custom.insert("requires_openai_auth".into(), toml::Value::Boolean(true));
        custom.insert("base_url".into(), toml::Value::String(base_url.to_string()));
        providers.insert("custom".into(), toml::Value::Table(custom));
    }

    // Serialize back to TOML
    let output = toml::to_string_pretty(&root).map_err(|e| format!("Serialize TOML: {}", e))?;
    std::fs::write(config_path(), output).map_err(|e| format!("Write config.toml: {}", e))
}

pub fn restore_official() -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    if auth_backup().exists() { std::fs::copy(auth_backup(), auth_path()).map_err(|e| format!("Restore auth: {}", e))?; }
    if config_backup().exists() { std::fs::copy(config_backup(), config_path()).map_err(|e| format!("Restore config: {}", e))?; }
    profiles.active = None;
    save_profiles(&profiles)?;
    Ok(profiles)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexStatus {
    pub profiles: Vec<CodexProfile>,
    pub active_id: Option<String>,
    pub backup_exists: bool,
    pub current_auth: String,
    pub current_config: String,
}

pub fn get_status() -> CodexStatus {
    let profiles = load_profiles();
    CodexStatus {
        profiles: profiles.profiles.clone(),
        active_id: profiles.active.clone(),
        backup_exists: profiles.official_backup_exists,
        current_auth: std::fs::read_to_string(auth_path()).unwrap_or_default(),
        current_config: std::fs::read_to_string(config_path()).unwrap_or_default(),
    }
}

pub fn update_profile(id: &str, name: &str, api_key: &str, base_url: &str, model: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    let p = profiles.profiles.iter_mut().find(|p| p.id == id).ok_or_else(|| format!("Profile not found: {}", id))?;
    p.name = name.to_string();
    p.api_key = api_key.to_string();
    p.base_url = base_url.to_string();
    p.model = model.to_string();
    save_profiles(&profiles)?;
    if profiles.active.as_deref() == Some(id) { switch_to_profile(id)?; }
    Ok(profiles)
}
