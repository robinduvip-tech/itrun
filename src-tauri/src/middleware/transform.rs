use serde_json::Value;

/// Extract the model name from a request body.
/// Checks the "model" field first, then falls back to other known locations.
pub fn extract_model_name(body: &Value) -> Option<String> {
    // Standard OpenAI format: { "model": "gpt-4", ... }
    if let Some(model) = body.get("model").and_then(|v| v.as_str()) {
        return Some(model.to_string());
    }

    // Some clients embed model in other places
    if let Some(messages) = body.get("messages").and_then(|v| v.as_array()) {
        // Not a standard location but some custom implementations do this
        if let Some(first) = messages.first() {
            if let Some(model) = first.get("model").and_then(|v| v.as_str()) {
                return Some(model.to_string());
            }
        }
    }

    None
}

/// Build the full forward URL for a provider.
/// Combines the provider's base URL with the API endpoint path.
pub fn build_forward_url(provider_base: &str, endpoint: &str) -> String {
    let base = provider_base.trim_end_matches('/');
    let ep = endpoint.trim_start_matches('/');
    format!("{}/{}", base, ep)
}
