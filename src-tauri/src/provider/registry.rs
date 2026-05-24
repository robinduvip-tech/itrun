use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use once_cell::sync::OnceCell;

use super::r#trait::{ModelInfo, Provider};

static REGISTRY: OnceCell<ProviderRegistry> = OnceCell::new();

pub struct ProviderRegistry {
    pub providers: RwLock<HashMap<String, Arc<dyn Provider>>>,
    default_provider: RwLock<Option<String>>,
    models_cache: RwLock<HashMap<String, Vec<ModelInfo>>>,
}

impl ProviderRegistry {
    pub fn global() -> &'static ProviderRegistry {
        REGISTRY.get_or_init(|| ProviderRegistry {
            providers: RwLock::new(HashMap::new()),
            default_provider: RwLock::new(None),
            models_cache: RwLock::new(HashMap::new()),
        })
    }

    /// Register a provider with a given ID.
    pub fn register(id: &str, provider: Arc<dyn Provider>) {
        let registry = Self::global();
        registry.providers.write().insert(id.to_string(), provider);
    }

    /// Retrieve a provider by ID.
    pub fn get(id: &str) -> Option<Arc<dyn Provider>> {
        let registry = Self::global();
        registry.providers.read().get(id).cloned()
    }

    /// Remove a provider by ID.
    pub fn remove(id: &str) {
        let registry = Self::global();
        registry.providers.write().remove(id);
        registry.models_cache.write().remove(id);
    }

    /// Look up provider by model name.
    /// Model names can be prefixed like "openai/gpt-4" or just "gpt-4".
    /// Returns (provider_id, provider, actual_model_name).
    pub fn get_by_model(model: &str) -> Option<(String, Arc<dyn Provider>, String)> {
        let registry = Self::global();

        // Check for provider prefix: "openai/gpt-4" -> provider_id="openai", model="gpt-4"
        if let Some((prefix, actual)) = model.split_once('/') {
            if let Some(provider) = registry.providers.read().get(prefix).cloned() {
                return Some((prefix.to_string(), provider, actual.to_string()));
            }
        }

        // Try default provider
        if let Some(default_id) = registry.default_provider.read().clone() {
            if let Some(provider) = registry.providers.read().get(&default_id).cloned() {
                return Some((default_id, provider, model.to_string()));
            }
        }

        // Search all providers' model lists
        let providers = registry.providers.read();
        let caches = registry.models_cache.read();

        for (pid, _) in providers.iter() {
            if let Some(models) = caches.get(pid) {
                for m in models {
                    if m.id == model {
                        let provider = providers.get(pid).cloned();
                        if let Some(p) = provider {
                            return Some((pid.clone(), p, model.to_string()));
                        }
                    }
                }
            }
        }

        None
    }

    /// List all providers with their models.
    pub fn list_all() -> Vec<(String, Vec<ModelInfo>)> {
        let registry = Self::global();
        let caches = registry.models_cache.read();
        let result: Vec<(String, Vec<ModelInfo>)> = caches
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        result
    }

    /// Set the default provider.
    pub fn set_default(id: &str) {
        let registry = Self::global();
        *registry.default_provider.write() = Some(id.to_string());
    }

    /// Get the default provider.
    pub fn get_default() -> Option<(String, Arc<dyn Provider>)> {
        let registry = Self::global();
        let default = registry.default_provider.read().clone()?;
        let provider = registry.providers.read().get(&default).cloned()?;
        Some((default, provider))
    }

    /// Cache model list for a provider.
    pub fn cache_models(provider_id: &str, models: Vec<ModelInfo>) {
        let registry = Self::global();
        registry
            .models_cache
            .write()
            .insert(provider_id.to_string(), models);
    }

    /// Try to refresh all providers' model lists.
    pub async fn refresh_all_models() {
        let registry = Self::global();
        let providers: Vec<(String, Arc<dyn Provider>)> = {
            registry
                .providers
                .read()
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        };

        for (id, provider) in providers {
            match provider.list_models().await {
                Ok(models) => {
                    Self::cache_models(&id, models);
                }
                Err(e) => {
                    tracing::warn!("Failed to list models for provider {}: {}", id, e);
                }
            }
        }
    }
}
