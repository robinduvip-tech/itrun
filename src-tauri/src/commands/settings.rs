use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
use parking_lot::Mutex;
use rusqlite::{Connection, params};
use tauri::{command, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingEntry {
    pub key: String,
    pub value: String,
    pub description: String,
    pub updated_at: String,
}

#[command]
pub async fn get_settings(
    db: State<'_, Arc<Mutex<Connection>>>,
) -> Result<HashMap<String, String>, String> {
    let conn = db.lock();
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings ORDER BY key")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query settings: {}", e))?;

    let mut settings = HashMap::new();
    for row in rows {
        let (key, value) = row.map_err(|e| format!("Row error: {}", e))?;
        settings.insert(key, value);
    }

    // Ensure defaults exist
    if !settings.contains_key("proxy_port") {
        settings.insert("proxy_port".to_string(), "9876".to_string());
    }
    if !settings.contains_key("theme") {
        settings.insert("theme".to_string(), "light".to_string());
    }
    if !settings.contains_key("auto_start") {
        settings.insert("auto_start".to_string(), "true".to_string());
    }

    Ok(settings)
}

#[command]
pub async fn set_setting(
    db: State<'_, Arc<Mutex<Connection>>>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = db.lock();
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value],
    )
    .map_err(|e| format!("Failed to set setting: {}", e))?;

    Ok(())
}

#[command]
pub async fn reset_settings(
    db: State<'_, Arc<Mutex<Connection>>>,
) -> Result<(), String> {
    let conn = db.lock();
    conn.execute("DELETE FROM settings", [])
        .map_err(|e| format!("Failed to reset settings: {}", e))?;
    Ok(())
}
