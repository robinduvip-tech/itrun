use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::Connection;
use tauri::{command, State};

use crate::db::config::{self, ProviderConfig};
use crate::provider::registry::ProviderRegistry;
use crate::provider::{self, ModelInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddProviderArgs {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub api_key: String,
    pub base_url: String,
    pub config: Value,
}

#[command]
pub async fn add_provider(
    db: State<'_, Arc<Mutex<Connection>>>,
    args: AddProviderArgs,
) -> Result<ProviderConfig, String> {
    // Phase 1: Write to DB (sync, holding lock)
    {
        let conn = db.lock();
        config::insert_provider(
            &conn,
            &args.id,
            &args.name,
            &args.provider_type,
            &args.api_key,
            &args.base_url,
            &args.config,
        )?;
    }
    // Lock dropped here

    // Phase 2: Register in-memory (lock-free)
    if let Ok(Some(provider_instance)) = provider::build_provider(
        &args.provider_type,
        &args.api_key,
        &args.base_url,
        &args.config,
    ) {
        ProviderRegistry::register(&args.id, provider_instance);

        // Try to refresh models (async, no lock held)
        if let Some(p) = ProviderRegistry::get(&args.id) {
            if let Ok(models) = p.list_models().await {
                ProviderRegistry::cache_models(&args.id, models);
            }
        }
    }

    // Phase 3: Read back from DB (sync, holding lock)
    let conn = db.lock();
    config::get_provider(&conn, &args.id)?.ok_or_else(|| "Provider not found after insert".to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProviderArgs {
    pub id: String,
    pub name: Option<String>,
    pub provider_type: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub config: Option<Value>,
}

#[command]
pub async fn update_provider_cmd(
    db: State<'_, Arc<Mutex<Connection>>>,
    args: UpdateProviderArgs,
) -> Result<(), String> {
    let conn = db.lock();

    config::update_provider(
        &conn,
        &args.id,
        args.name.as_deref(),
        args.provider_type.as_deref(),
        args.api_key.as_deref(),
        args.base_url.as_deref(),
        args.config.as_ref(),
    )?;

    // Re-register provider
    if let Ok(Some(pc)) = config::get_provider(&conn, &args.id) {
        if let Ok(Some(provider_instance)) = provider::build_provider(
            &pc.provider_type,
            &pc.api_key,
            &pc.base_url,
            &pc.config,
        ) {
            ProviderRegistry::register(&pc.id, provider_instance);
        }
    }

    Ok(())
}

#[command]
pub async fn remove_provider(
    db: State<'_, Arc<Mutex<Connection>>>,
    id: String,
) -> Result<(), String> {
    let conn = db.lock();
    config::delete_provider(&conn, &id)?;
    ProviderRegistry::remove(&id);
    Ok(())
}

#[command]
pub async fn list_providers_cmd(
    db: State<'_, Arc<Mutex<Connection>>>,
) -> Result<Vec<ProviderConfig>, String> {
    let conn = db.lock();
    config::list_providers(&conn)
}

#[command]
pub async fn test_provider_connection(
    id: String,
) -> Result<bool, String> {
    if let Some(provider) = ProviderRegistry::get(&id) {
        provider.validate_api_key().await
    } else {
        Err(format!("Provider not found: {}", id))
    }
}

#[command]
pub async fn set_default_provider_cmd(
    db: State<'_, Arc<Mutex<Connection>>>,
    id: String,
) -> Result<(), String> {
    let conn = db.lock();
    config::set_default_provider(&conn, &id)?;
    ProviderRegistry::set_default(&id);
    Ok(())
}

#[command]
pub async fn try_fetch_models(
    provider_type: String,
    api_key: String,
    base_url: String,
) -> Result<Vec<ModelInfo>, String> {
    let provider = provider::build_provider(&provider_type, &api_key, &base_url, &serde_json::Value::Null)?
        .ok_or_else(|| format!("Unsupported provider type: {}", provider_type))?;
    provider.list_models().await
}

#[command]
pub async fn fetch_provider_models(
    id: String,
) -> Result<Vec<ModelInfo>, String> {
    match ProviderRegistry::get(&id) {
        Some(provider) => {
            let models = provider.list_models().await?;
            ProviderRegistry::cache_models(&id, models.clone());
            Ok(models)
        }
        None => Err(format!("Provider not found: {}", id)),
    }
}

#[command]
pub async fn list_all_models_cmd() -> Result<Vec<ModelInfo>, String> {
    let all = ProviderRegistry::list_all();
    let mut models: Vec<ModelInfo> = Vec::new();
    for (_, provider_models) in all {
        models.extend(provider_models);
    }
    Ok(models)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderHealth {
    pub id: String,
    pub healthy: bool,
    pub latency_ms: i64,
    pub rate_test_ms: i64,
    pub last_checked: String,
}

#[command]
pub async fn test_provider_health(id: String) -> Result<ProviderHealth, String> {
    match ProviderRegistry::get(&id) {
        Some(provider) => {
            let start = std::time::Instant::now();
            let valid = provider.validate_api_key().await.unwrap_or(false);
            let latency_ms = start.elapsed().as_millis() as i64;

            Ok(ProviderHealth {
                id,
                healthy: valid,
                latency_ms,
                rate_test_ms: 0,
                last_checked: chrono::Utc::now().to_rfc3339(),
            })
        }
        None => Err(format!("Provider not found: {}", id)),
    }
}

#[command]
pub async fn check_all_providers_health() -> Result<Vec<ProviderHealth>, String> {
    let registry = ProviderRegistry::global();
    let providers: Vec<String> = {
        registry.providers.read().keys().cloned().collect()
    };

    let mut results = Vec::new();
    for id in providers {
        if let Some(provider) = ProviderRegistry::get(&id) {
            let start = std::time::Instant::now();
            let healthy = provider.validate_api_key().await.unwrap_or(false);
            let latency_ms = start.elapsed().as_millis() as i64;
            results.push(ProviderHealth {
                id: id.clone(),
                healthy,
                latency_ms,
                rate_test_ms: 0,
                last_checked: chrono::Utc::now().to_rfc3339(),
            });
        }
    }
    Ok(results)
}
