use rusqlite::{Connection, params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub api_key: String,
    #[serde(rename = "api_base")]
    pub base_url: String,
    #[serde(skip_serializing_if = "Value::is_null")]
    pub config: Value,
    pub is_default: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

pub fn insert_provider(
    conn: &Connection,
    id: &str,
    name: &str,
    provider_type: &str,
    api_key: &str,
    base_url: &str,
    config: &Value,
) -> Result<(), String> {
    let config_str = serde_json::to_string(config).unwrap_or_else(|_| "{}".to_string());
    conn.execute(
        "INSERT INTO providers (id, name, provider_type, api_key, base_url, config)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            provider_type = excluded.provider_type,
            api_key = excluded.api_key,
            base_url = excluded.base_url,
            config = excluded.config,
            updated_at = datetime('now')",
        params![id, name, provider_type, api_key, base_url, config_str],
    )
    .map_err(|e| format!("Failed to insert provider: {}", e))?;

    Ok(())
}

pub fn update_provider(
    conn: &Connection,
    id: &str,
    name: Option<&str>,
    provider_type: Option<&str>,
    api_key: Option<&str>,
    base_url: Option<&str>,
    config: Option<&Value>,
) -> Result<(), String> {
    let mut sets: Vec<String> = Vec::new();
    let mut params_list: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(name) = name {
        sets.push(format!("name = ?{}", sets.len() + 1));
        params_list.push(Box::new(name.to_string()));
    }
    if let Some(pt) = provider_type {
        sets.push(format!("provider_type = ?{}", sets.len() + 1));
        params_list.push(Box::new(pt.to_string()));
    }
    if let Some(ak) = api_key {
        sets.push(format!("api_key = ?{}", sets.len() + 1));
        params_list.push(Box::new(ak.to_string()));
    }
    if let Some(bu) = base_url {
        sets.push(format!("base_url = ?{}", sets.len() + 1));
        params_list.push(Box::new(bu.to_string()));
    }
    if let Some(cfg) = config {
        sets.push(format!("config = ?{}", sets.len() + 1));
        let cfg_str = serde_json::to_string(cfg).unwrap_or_else(|_| "{}".to_string());
        params_list.push(Box::new(cfg_str));
    }

    if sets.is_empty() {
        return Ok(());
    }

    sets.push("updated_at = datetime('now')".to_string());

    let sql = format!(
        "UPDATE providers SET {} WHERE id = ?{}",
        sets.join(", "),
        sets.len() + 1
    );
    params_list.push(Box::new(id.to_string()));

    let refs: Vec<&dyn rusqlite::types::ToSql> = params_list.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, refs.as_slice())
        .map_err(|e| format!("Failed to update provider: {}", e))?;

    Ok(())
}

pub fn delete_provider(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM providers WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete provider: {}", e))?;
    Ok(())
}

pub fn get_provider(conn: &Connection, id: &str) -> Result<Option<ProviderConfig>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, provider_type, api_key, base_url, config, is_default, enabled,
                    created_at, updated_at
             FROM providers WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let result = stmt
        .query_row(params![id], |row| {
            let config_str: String = row.get(5)?;
            let config: Value =
                serde_json::from_str(&config_str).unwrap_or(Value::Object(Default::default()));
            Ok(ProviderConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                api_key: row.get(3)?,
                base_url: row.get(4)?,
                config,
                is_default: row.get::<_, i32>(6)? != 0,
                enabled: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .optional()
        .map_err(|e| format!("Failed to query provider: {}", e))?;

    Ok(result)
}

pub fn list_providers(conn: &Connection) -> Result<Vec<ProviderConfig>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, provider_type, api_key, base_url, config, is_default, enabled,
                    created_at, updated_at
             FROM providers ORDER BY name",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let config_str: String = row.get(5)?;
            let config: Value =
                serde_json::from_str(&config_str).unwrap_or(Value::Object(Default::default()));
            Ok(ProviderConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                api_key: row.get(3)?,
                base_url: row.get(4)?,
                config,
                is_default: row.get::<_, i32>(6)? != 0,
                enabled: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Failed to query providers: {}", e))?;

    let mut providers = Vec::new();
    for row in rows {
        providers.push(row.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(providers)
}

pub fn set_default_provider(conn: &Connection, id: &str) -> Result<(), String> {
    // Unset all defaults
    conn.execute("UPDATE providers SET is_default = 0", [])
        .map_err(|e| format!("Failed to reset defaults: {}", e))?;

    // Set the new default
    conn.execute("UPDATE providers SET is_default = 1 WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to set default provider: {}", e))?;

    Ok(())
}

pub fn get_default_provider(conn: &Connection) -> Result<Option<String>, String> {
    let result: Option<String> = conn
        .query_row(
            "SELECT id FROM providers WHERE is_default = 1 AND enabled = 1 LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query default provider: {}", e))?;

    Ok(result)
}
