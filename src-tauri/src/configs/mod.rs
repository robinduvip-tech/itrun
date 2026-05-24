use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub mod codex_switch;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigFile {
    /// Display name for this config
    pub name: String,
    /// Category: "codex", "claude", "claude_desktop", "cursor", "vscode"
    pub category: String,
    /// Full path to the config file
    pub path: String,
    /// Whether the file exists on disk
    pub exists: bool,
    /// File content (only when read)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    /// Parsed keys (for JSON configs)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keys: Option<Vec<ConfigKey>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigKey {
    pub key: String,
    pub value: String,
    pub description: String,
}

/// Scan all known config directories and return discovered config files.
pub fn scan_all_configs() -> Vec<ConfigFile> {
    let home = home_dir();
    let appdata = data_dir();
    let home_str = home.as_str();
    let appdata_str = appdata.as_str();

    let mut configs = Vec::new();

    // ── Claude Code ──
    configs.push(ConfigFile {
        name: "Claude Code — settings.json".into(),
        category: "claude".into(),
        path: format!("{}/.claude/settings.json", home_str),
        exists: false, keys: None, content: None,
    });
    configs.push(ConfigFile {
        name: "Claude Code — CLAUDE.md".into(),
        category: "claude".into(),
        path: format!("{}/.claude/CLAUDE.md", home_str),
        exists: false, keys: None, content: None,
    });
    configs.push(ConfigFile {
        name: "Claude Code — MCP (.claude.json)".into(),
        category: "claude".into(),
        path: format!("{}/.claude.json", home_str),
        exists: false, keys: None, content: None,
    });

    // ── Claude Desktop ──
    configs.push(ConfigFile {
        name: "Claude Desktop — claude_desktop_config.json".into(),
        category: "claude_desktop".into(),
        path: format!("{}/Claude/claude_desktop_config.json", appdata_str),
        exists: false, keys: None, content: None,
    });

    // ── Codex CLI ──
    configs.push(ConfigFile {
        name: "Codex CLI — auth.json".into(),
        category: "codex".into(),
        path: format!("{}/.codex/auth.json", home_str),
        exists: false, keys: None, content: None,
    });
    configs.push(ConfigFile {
        name: "Codex CLI — config.toml".into(),
        category: "codex".into(),
        path: format!("{}/.codex/config.toml", home_str),
        exists: false, keys: None, content: None,
    });

    // ── VS Code ──
    configs.push(ConfigFile {
        name: "VS Code — settings.json".into(),
        category: "vscode".into(),
        path: format!("{}/Code/User/settings.json", appdata_str),
        exists: false, keys: None, content: None,
    });

    // ── Cursor ──
    configs.push(ConfigFile {
        name: "Cursor — settings.json".into(),
        category: "cursor".into(),
        path: format!("{}/Cursor/User/settings.json", appdata_str),
        exists: false, keys: None, content: None,
    });

    // ── Gemini CLI ──
    configs.push(ConfigFile {
        name: "Gemini CLI — .env".into(),
        category: "gemini".into(),
        path: format!("{}/.gemini/.env", home_str),
        exists: false, keys: None, content: None,
    });
    configs.push(ConfigFile {
        name: "Gemini CLI — settings.json".into(),
        category: "gemini".into(),
        path: format!("{}/.gemini/settings.json", home_str),
        exists: false, keys: None, content: None,
    });

    // Check existence and mark
    for cfg in &mut configs {
        cfg.exists = std::path::Path::new(&cfg.path).exists();
    }

    configs
}

/// Read the content of a specific config file.
pub fn read_config(path: &str) -> Result<ConfigFile, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Cannot read {}: {}", path, e))?;

    let mut cfg = ConfigFile {
        name: String::new(),
        category: String::new(),
        path: path.to_string(),
        exists: true,
        content: Some(content.clone()),
        keys: None,
    };

    // Parse JSON configs to extract keys
    if path.ends_with(".json") {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) {
            let mut keys = Vec::new();
            extract_json_keys(&value, "", &mut keys);
            cfg.keys = Some(keys);
        }
    }

    // Parse TOML configs
    if path.ends_with(".toml") {
        let mut keys = Vec::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('[') {
                continue;
            }
            if let Some((k, v)) = trimmed.split_once('=') {
                keys.push(ConfigKey {
                    key: k.trim().to_string(),
                    value: v.trim().trim_matches('"').to_string(),
                    description: String::new(),
                });
            }
        }
        cfg.keys = Some(keys);
    }

    // Parse .env files
    if path.ends_with(".env") {
        let mut keys = Vec::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = trimmed.split_once('=') {
                keys.push(ConfigKey {
                    key: k.trim().to_string(),
                    value: if v.trim().len() > 20 {
                        format!("{}...", &v.trim()[..17])
                    } else {
                        v.trim().to_string()
                    },
                    description: String::new(),
                });
            }
        }
        cfg.keys = Some(keys);
    }

    Ok(cfg)
}

/// Write content to a config file (with optional backup).
pub fn write_config(path: &str, content: &str, create_backup: bool) -> Result<(), String> {
    let p = PathBuf::from(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create directory: {}", e))?;
    }

    if create_backup && p.exists() {
        let backup = format!("{}.backup", path);
        std::fs::copy(path, &backup)
            .map_err(|e| format!("Cannot create backup: {}", e))?;
    }

    std::fs::write(path, content)
        .map_err(|e| format!("Cannot write {}: {}", path, e))?;

    Ok(())
}

fn extract_json_keys(value: &serde_json::Value, prefix: &str, keys: &mut Vec<ConfigKey>) {
    match value {
        serde_json::Value::Object(map) => {
            for (k, v) in map {
                let full_key = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{}.{}", prefix, k)
                };
                match v {
                    serde_json::Value::String(s) => {
                        let display_val = if s.len() > 40 {
                            format!("{}...", &s[..37])
                        } else {
                            s.clone()
                        };
                        keys.push(ConfigKey {
                            key: full_key,
                            value: display_val,
                            description: String::new(),
                        });
                    }
                    serde_json::Value::Number(n) => {
                        keys.push(ConfigKey {
                            key: full_key,
                            value: n.to_string(),
                            description: String::new(),
                        });
                    }
                    serde_json::Value::Bool(b) => {
                        keys.push(ConfigKey {
                            key: full_key,
                            value: b.to_string(),
                            description: String::new(),
                        });
                    }
                    serde_json::Value::Object(_) => {
                        extract_json_keys(v, &full_key, keys);
                    }
                    _ => {}
                }
            }
        }
        _ => {}
    }
}

/// Get user home directory as string
fn home_dir() -> String {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string())
}

/// Get app data directory as string
fn data_dir() -> String {
    std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/AppData/Roaming", h)))
        .unwrap_or_else(|_| ".".to_string())
}
