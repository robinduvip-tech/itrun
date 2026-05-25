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
    /// Custom name for [model_providers.custom] name field (defaults to model basename)
    pub custom_name: String,
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
    let mut p = if let Ok(content) = std::fs::read_to_string(profiles_path()) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        CodexProfiles::default()
    };
    // Always check actual backup file existence (profiles.json may have stale state)
    p.official_backup_exists = auth_backup().exists();
    p
}

fn save_profiles(profiles: &CodexProfiles) -> Result<(), String> {
    let content = serde_json::to_string_pretty(profiles).map_err(|e| format!("Serialize: {}", e))?;
    std::fs::write(profiles_path(), content).map_err(|e| format!("Write: {}", e))
}

pub fn add_profile(name: &str, api_key: &str, base_url: &str, model: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    let id = uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown").to_string();
    let custom_name = model.rsplit('/').next().unwrap_or(model).to_string();
    profiles.profiles.push(CodexProfile {
        id, name: name.to_string(), api_key: api_key.to_string(),
        base_url: base_url.to_string(), model: model.to_string(),
        custom_name, created_at: chrono::Utc::now().to_rfc3339(),
    });
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

    // Write auth.json — Codex uses OPENAI_API_KEY, not api_key
    let auth = serde_json::json!({ "OPENAI_API_KEY": &profile.api_key });
    std::fs::write(auth_path(), serde_json::to_string_pretty(&auth).unwrap_or_default())
        .map_err(|e| format!("Write auth.json: {}", e))?;

    // Write config.toml — preserve exact formatting via string manipulation
    write_codex_config(&profile.base_url, &profile.model, &profile.custom_name)?;

    profiles.active = Some(id.to_string());
    save_profiles(&profiles)?;
    Ok(profiles)
}

/// Write Codex config.toml preserving exact formatting via string manipulation
fn write_codex_config(base_url: &str, model: &str, custom_name: &str) -> Result<(), String> {
    let content = if config_path().exists() {
        std::fs::read_to_string(config_path()).unwrap_or_default()
    } else {
        String::new()
    };

    // Extract just the model name (e.g., "deepseek/deepseek-v4-pro" → "deepseek-v4-pro")
    let model_name = model.rsplit('/').next().unwrap_or(model);
    let name = if custom_name.is_empty() { model_name } else { custom_name }.to_string();

    let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
    let mut has_model_provider = false;
    let mut has_model = false;
    let mut has_disable_storage = false;
    let mut has_effort = false;
    let mut in_model_providers = false;
    let mut provider_header_idx: Option<usize> = None;
    let mut custom_start: Option<usize> = None;
    let mut custom_end: Option<usize> = None;

    let mut model_provider_line: Option<usize> = None;
    let mut model_line: Option<usize> = None;

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed == "[model_providers]" {
            provider_header_idx = Some(i);
        } else if trimmed == "[model_providers.custom]" {
            custom_start = Some(i);
        } else if custom_start.is_some() && custom_end.is_none() && (trimmed.starts_with('[') || trimmed.is_empty()) {
            custom_end = Some(i);
        } else if trimmed.starts_with("model_provider = ") {
            model_provider_line = Some(i);
            has_model_provider = true;
        } else if trimmed.starts_with("model = ") {
            model_line = Some(i);
            has_model = true;
        } else if trimmed.starts_with("disable_response_storage = ") {
            has_disable_storage = true;
        } else if trimmed.starts_with("model_reasoning_effort = ") {
            has_effort = true;
        }
    }

    // Apply changes after the loop
    if let Some(i) = model_provider_line { lines[i] = "model_provider = \"custom\"".into(); }
    if let Some(i) = model_line { lines[i] = format!("model = \"{}\"", model_name); }

    // If custom section end not found, it goes to end of file
    if custom_end.is_none() {
        custom_end = Some(lines.len());
    }

    // Add missing top-level fields before [model_providers]
    let insert_pos = provider_header_idx.unwrap_or(0);
    if !has_model_provider { lines.insert(insert_pos, "model_provider = \"custom\"".into()); }
    if !has_model { lines.insert(insert_pos + 1, format!("model = \"{}\"", model_name)); }
    if !has_disable_storage { lines.insert(insert_pos + 2, "disable_response_storage = true".into()); }
    if !has_effort { lines.insert(insert_pos + 3, "model_reasoning_effort = \"medium\"".into()); }

    // Update/insert [model_providers] section
    if provider_header_idx.is_none() {
        lines.push(String::new());
        lines.push("[model_providers]".into());
    }
    if custom_start.is_none() {
        lines.push("[model_providers.custom]".into());
        lines.push(format!("name = \"{}\"", name));
        lines.push("wire_api = \"responses\"".into());
        lines.push("requires_openai_auth = true".into());
        lines.push(format!("base_url = \"{}\"", base_url));
    } else {
        // Update existing custom section fields
        let start = custom_start.unwrap();
        let end = custom_end.unwrap();
        let section: Vec<String> = lines[start..end].to_vec();
        let mut new_section: Vec<String> = Vec::new();
        let mut found_name = false;
        let mut found_wire = false;
        let mut found_auth = false;
        let mut found_base = false;

        for line in &section {
            let t = line.trim();
            if t.starts_with("name = ") {
                new_section.push(format!("name = \"{}\"", name));
                found_name = true;
            } else if t.starts_with("wire_api = ") {
                new_section.push("wire_api = \"responses\"".into());
                found_wire = true;
            } else if t.starts_with("requires_openai_auth = ") {
                new_section.push("requires_openai_auth = true".into());
                found_auth = true;
            } else if t.starts_with("base_url = ") {
                new_section.push(format!("base_url = \"{}\"", base_url));
                found_base = true;
            } else if !t.is_empty() {
                new_section.push(line.clone());
            }
        }

        // Remove trailing empty
        while new_section.last().map(|l| l.trim().is_empty()).unwrap_or(false) { new_section.pop(); }
        // Add missing fields
        if !found_name { new_section.push(format!("name = \"{}\"", name)); }
        if !found_wire { new_section.push("wire_api = \"responses\"".into()); }
        if !found_auth { new_section.push("requires_openai_auth = true".into()); }
        if !found_base { new_section.push(format!("base_url = \"{}\"", base_url)); }

        lines.splice(start..end, new_section);
    }

    let output = lines.join("\n");
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

pub fn update_profile(id: &str, name: &str, api_key: &str, base_url: &str, model: &str, custom_name: &str) -> Result<CodexProfiles, String> {
    let mut profiles = load_profiles();
    let p = profiles.profiles.iter_mut().find(|p| p.id == id).ok_or_else(|| format!("Profile not found: {}", id))?;
    p.name = name.to_string();
    p.api_key = api_key.to_string();
    p.base_url = base_url.to_string();
    p.model = model.to_string();
    p.custom_name = if custom_name.is_empty() { model.rsplit('/').next().unwrap_or(model).to_string() } else { custom_name.to_string() };
    save_profiles(&profiles)?;
    if profiles.active.as_deref() == Some(id) { switch_to_profile(id)?; }
    Ok(profiles)
}
