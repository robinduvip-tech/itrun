use std::pin::Pin;
use bytes::Bytes;
use futures::Stream;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    /// Unique model identifier (e.g., "gpt-4")
    pub id: String,
    /// Display name
    pub name: String,
    /// Provider name (e.g., "OpenAI")
    pub provider_name: String,
    /// Maximum tokens supported
    pub max_tokens: i64,
    /// Pricing information as JSON
    pub pricing: Value,
}

/// Trait that all AI providers must implement.
#[async_trait::async_trait]
pub trait Provider: Send + Sync {
    /// Send a chat completion request (non-streaming).
    async fn chat_completion(
        &self,
        model: &str,
        body: Value,
    ) -> Result<Value, String>;

    /// Send a chat completion request with SSE streaming.
    /// Returns a boxed, pinned stream of raw bytes from the upstream provider.
    async fn chat_completion_stream(
        &self,
        model: &str,
        body: Value,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>, String>;

    /// List available models from this provider.
    async fn list_models(&self) -> Result<Vec<ModelInfo>, String>;

    /// Validate that the API key works by making a test request.
    async fn validate_api_key(&self) -> Result<bool, String>;
}
