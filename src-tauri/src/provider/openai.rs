use std::pin::Pin;
use bytes::Bytes;
use futures::Stream;
use reqwest::Client;
use serde_json::{json, Value};

use super::r#trait::{ModelInfo, Provider};
use crate::proxy::sse;

pub struct OpenAiProvider {
    client: Client,
    api_key: String,
    base_url: String,
}

impl OpenAiProvider {
    pub fn new(api_key: &str, base_url: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }
}

#[async_trait::async_trait]
impl Provider for OpenAiProvider {
    async fn chat_completion(
        &self,
        model: &str,
        mut body: Value,
    ) -> Result<Value, String> {
        // Inject model name into body
        if let Some(obj) = body.as_object_mut() {
            obj.insert("model".to_string(), json!(model));
        }

        let url = self.url("/chat/completions");
        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        if !status.is_success() {
            return Err(format!("OpenAI API error {}: {}", status.as_u16(), body_text));
        }

        let value: Value =
            serde_json::from_str(&body_text).map_err(|e| format!("Failed to parse JSON: {}", e))?;

        Ok(value)
    }

    async fn chat_completion_stream(
        &self,
        model: &str,
        mut body: Value,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>, String> {
        if let Some(obj) = body.as_object_mut() {
            obj.insert("model".to_string(), json!(model));
            obj.insert("stream".to_string(), json!(true));
        }

        let url = self.url("/chat/completions");
        let stream = sse::stream_request(&self.client, &url, &self.api_key, body).await?;

        Ok(stream)
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        let url = self.url("/models");
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        if !status.is_success() {
            return Err(format!("OpenAI API error {}: {}", status.as_u16(), body_text));
        }

        let value: Value =
            serde_json::from_str(&body_text).map_err(|e| format!("Failed to parse JSON: {}", e))?;

        let models = value
            .get("data")
            .and_then(|d| d.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|m| ModelInfo {
                        id: m.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        name: m
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        provider_name: "OpenAI".to_string(),
                        max_tokens: 16384,
                        pricing: json!({
                            "prompt": "$0.001 / 1K tokens",
                            "completion": "$0.002 / 1K tokens"
                        }),
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }

    async fn validate_api_key(&self) -> Result<bool, String> {
        let url = self.url("/models");
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;

        Ok(response.status().is_success())
    }
}
