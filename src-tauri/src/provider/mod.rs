mod r#trait;
mod openai;
pub mod registry;

pub use r#trait::{Provider, ModelInfo};
pub use registry::ProviderRegistry;
pub use openai::OpenAiProvider;

use std::sync::Arc;
use serde_json::Value;

/// Build a provider instance from config values.
/// Used to instantiate providers loaded from the database.
pub fn build_provider(
    provider_type: &str,
    api_key: &str,
    base_url: &str,
    _config: &Value,
) -> Result<Option<Arc<dyn Provider>>, String> {
    match provider_type {
        "openai" | "open_ai" => {
            let base = if base_url.is_empty() {
                "https://api.openai.com/v1".to_string()
            } else {
                base_url.to_string()
            };
            let provider = OpenAiProvider::new(api_key, &base);
            Ok(Some(Arc::new(provider)))
        }
        "azure" | "azure_openai" => {
            // Azure OpenAI uses the same API shape but different auth
            let provider = OpenAiProvider::new(api_key, base_url);
            Ok(Some(Arc::new(provider)))
        }
        "custom" => {
            // Custom OpenAI-compatible provider
            let provider = OpenAiProvider::new(api_key, base_url);
            Ok(Some(Arc::new(provider)))
        }
        _ => {
            // Try as OpenAI-compatible
            let provider = OpenAiProvider::new(api_key, base_url);
            Ok(Some(Arc::new(provider)))
        }
    }
}
