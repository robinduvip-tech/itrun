mod r#trait;
mod openai;
mod anthropic;
pub mod registry;

pub use r#trait::{Provider, ModelInfo};
pub use registry::ProviderRegistry;
pub use openai::OpenAiProvider;
pub use anthropic::AnthropicProvider;

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
                "https://api.openai.com/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "anthropic" | "claude" | "opus" => {
            let base = if base_url.is_empty() {
                "https://api.anthropic.com/v1"
            } else { base_url };
            Ok(Some(Arc::new(AnthropicProvider::new(api_key, base))))
        }
        "kimi" | "moonshot" => {
            let base = if base_url.is_empty() {
                "https://api.moonshot.cn/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "qwen" | "tongyi" => {
            let base = if base_url.is_empty() {
                "https://dashscope.aliyuncs.com/compatible-mode/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "deepseek" => {
            let base = if base_url.is_empty() {
                "https://api.deepseek.com/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "gemini" | "google" => {
            let base = if base_url.is_empty() {
                "https://generativelanguage.googleapis.com/v1beta"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "nvidia" | "nim" => {
            let base = if base_url.is_empty() {
                "https://integrate.api.nvidia.com/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "groq" => {
            let base = if base_url.is_empty() {
                "https://api.groq.com/openai/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "siliconflow" | "silicon" => {
            let base = if base_url.is_empty() {
                "https://api.siliconflow.cn/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "xai" | "grok" => {
            let base = if base_url.is_empty() {
                "https://api.x.ai/v1"
            } else { base_url };
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base))))
        }
        "azure" | "azure_openai" | "custom" | _ => {
            Ok(Some(Arc::new(OpenAiProvider::new(api_key, base_url))))
        }
    }
}
