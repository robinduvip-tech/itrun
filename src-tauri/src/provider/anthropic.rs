use std::pin::Pin;
use bytes::Bytes;
use futures::Stream;
use reqwest::Client;
use serde_json::{json, Value};

use super::r#trait::{ModelInfo, Provider};

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
    base_url: String,
}

impl AnthropicProvider {
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

    /// Convert OpenAI-format messages to Anthropic format
    fn convert_body(&self, model: &str, body: &Value) -> Result<Value, String> {
        let messages = body
            .get("messages")
            .and_then(|v| v.as_array())
            .ok_or("Missing 'messages' array")?;

        // Extract system message
        let system = messages.iter().find_map(|m| {
            if m.get("role").and_then(|v| v.as_str()) == Some("system") {
                m.get("content").and_then(|v| v.as_str()).map(String::from)
            } else {
                None
            }
        });

        // Convert remaining messages
        let anthropic_messages: Vec<Value> = messages
            .iter()
            .filter(|m| m.get("role").and_then(|v| v.as_str()) != Some("system"))
            .map(|m| {
                let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("user");
                let content = m.get("content");
                json!({
                    "role": if role == "assistant" { "assistant" } else { "user" },
                    "content": content
                })
            })
            .collect();

        let max_tokens = body
            .get("max_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(4096);

        let mut req = json!({
            "model": model,
            "max_tokens": max_tokens,
            "messages": anthropic_messages,
        });

        if let Some(sys) = system {
            req["system"] = json!(sys);
        }

        Ok(req)
    }
}

#[async_trait::async_trait]
impl Provider for AnthropicProvider {
    async fn chat_completion(&self, model: &str, body: Value) -> Result<Value, String> {
        let anthropic_body = self.convert_body(model, &body)?;

        let url = self.url("/messages");
        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&anthropic_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();
        let body_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("Anthropic API error {}: {}", status.as_u16(), body_text));
        }

        let value: Value =
            serde_json::from_str(&body_text).map_err(|e| format!("Parse JSON: {}", e))?;

        // Convert Anthropic response to OpenAI format
        let content = value
            .get("content")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|b| b.get("text"))
            .and_then(|t| t.as_str())
            .unwrap_or("");

        let model_name = value
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or(model);

        let usage = value.get("usage").cloned().unwrap_or(json!({
            "input_tokens": 0,
            "output_tokens": 0
        }));

        Ok(json!({
            "id": format!("msg_{}", uuid::Uuid::new_v4()),
            "object": "chat.completion",
            "created": chrono::Utc::now().timestamp(),
            "model": model_name,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content
                },
                "finish_reason": value.get("stop_reason").and_then(|v| v.as_str()).unwrap_or("stop")
            }],
            "usage": {
                "prompt_tokens": usage.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                "completion_tokens": usage.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                "total_tokens": 0
            }
        }))
    }

    async fn chat_completion_stream(
        &self,
        _model: &str,
        _body: Value,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>, String> {
        Err("Streaming not yet implemented for Anthropic".to_string())
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        Ok(vec![
            ModelInfo {
                id: "claude-opus-4-20250514".to_string(),
                name: "Claude Opus 4".to_string(),
                provider_name: "Anthropic".to_string(),
                max_tokens: 200000,
                pricing: json!({"prompt": "$15/MTok", "completion": "$75/MTok"}),
            },
            ModelInfo {
                id: "claude-sonnet-4-20250514".to_string(),
                name: "Claude Sonnet 4".to_string(),
                provider_name: "Anthropic".to_string(),
                max_tokens: 200000,
                pricing: json!({"prompt": "$3/MTok", "completion": "$15/MTok"}),
            },
            ModelInfo {
                id: "claude-haiku-3-5-20241022".to_string(),
                name: "Claude Haiku 3.5".to_string(),
                provider_name: "Anthropic".to_string(),
                max_tokens: 200000,
                pricing: json!({"prompt": "$0.80/MTok", "completion": "$4/MTok"}),
            },
            ModelInfo {
                id: "claude-3-5-sonnet-20241022".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                provider_name: "Anthropic".to_string(),
                max_tokens: 200000,
                pricing: json!({"prompt": "$3/MTok", "completion": "$15/MTok"}),
            },
        ])
    }

    async fn validate_api_key(&self) -> Result<bool, String> {
        // Anthropic doesn't have a simple /models endpoint — use a minimal messages request
        let url = self.url("/messages");
        let body = json!({
            "model": "claude-haiku-3-5-20241022",
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "hi"}]
        });
        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Connection test failed: {}", e))?;

        // 401 = bad key, 200/429/etc = key works
        Ok(response.status().as_u16() != 401)
    }
}
