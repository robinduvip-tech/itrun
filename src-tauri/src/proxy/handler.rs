use axum::{
    body::Body,
    extract::Json,
    http::{StatusCode, HeaderMap},
    response::{IntoResponse, Response, Json as JsonResponse},
};
use serde_json::{json, Value};
use uuid::Uuid;
use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::Connection;

use crate::provider::registry::ProviderRegistry;
use crate::db::history;
use crate::middleware::transform;
use super::sse;

static HANDLER_DB: once_cell::sync::OnceCell<Arc<Mutex<Connection>>> = once_cell::sync::OnceCell::new();

fn get_db_conn() -> Option<Arc<Mutex<Connection>>> {
    HANDLER_DB.get().cloned()
}

pub fn set_handler_db(conn: Arc<Mutex<Connection>>) {
    let _ = HANDLER_DB.set(conn);
}

// ── Helpers ──────────────────────────────────────────────────────

fn update_history_error(request_id: &str, error: &str) {
    if let Some(conn) = get_db_conn() {
        let conn = conn.lock();
        let _ = history::update_response(&conn, request_id, "error", 0, 0, Some(&format!("[ERROR] {}", error)));
    }
}

fn extract_auth_key(headers: &HeaderMap) -> Option<String> {
    headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(String::from)
        .or_else(|| {
            headers
                .get("x-api-key")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        })
}

fn extract_base_url(_headers: &HeaderMap, model: &str) -> String {
    if model.starts_with("claude") || model.contains("claude") {
        "https://api.anthropic.com/v1".to_string()
    } else if model.starts_with("gemini") || model.contains("gemini") {
        "https://generativelanguage.googleapis.com/v1beta".to_string()
    } else {
        "https://api.openai.com/v1".to_string()
    }
}

/// Transparent proxy: forward request directly to upstream using client's API key.
async fn transparent_proxy(
    headers: &HeaderMap,
    body: &Value,
    model: &str,
    stream: bool,
    path: &str,
) -> Result<Response, String> {
    let api_key = extract_auth_key(headers)
        .ok_or_else(|| "No API key found".to_string())?;

    let mask_key = || { if api_key.len() > 8 { format!("{}...", &api_key[..8]) } else { api_key.clone() } };

    let base_url = extract_base_url(headers, model);
    let url = format!("{}{}", base_url.trim_end_matches('/'), path);
    tracing::info!("[PROXY] model={} stream={} key={} -> {}", model, stream, mask_key(), url);

    let client = reqwest::Client::new();

    if stream {
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", &api_key))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Upstream request failed: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let err_body = response.text().await.unwrap_or_default();
            tracing::error!("[PROXY-ERR] status={} body={}", status.as_u16(), &err_body[..err_body.len().min(200)]); return Err(format!("Upstream error {}: {}", status.as_u16(), err_body));
        }

        let byte_stream = response.bytes_stream();
        let mapped = futures::StreamExt::map(byte_stream, |item| {
            match item {
                Ok(bytes) => Ok(bytes),
                Err(e) => Err(format!("Stream error: {}", e)),
            }
        });
        let boxed: std::pin::Pin<Box<dyn futures::Stream<Item = Result<bytes::Bytes, String>> + Send>> = Box::pin(mapped);
        let sse_stream = sse::create_sse_stream(boxed, String::new());

        Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .body(Body::from_stream(sse_stream))
            .unwrap())
    } else {
        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", &api_key))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Upstream request failed: {}", e))?;

        let status = response.status();
        let resp_body: Value = response.json().await.map_err(|e| format!("Parse response: {}", e))?;

        if !status.is_success() {
            return Err(serde_json::to_string(&resp_body).unwrap_or_else(|_| format!("HTTP {}", status.as_u16())));
        }

        Ok(JsonResponse(resp_body).into_response())
    }
}

// ── Route Handlers ───────────────────────────────────────────────

pub async fn chat_completions(
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body).unwrap_or_else(|| "gpt-4o".to_string());
    let stream = body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);
    tracing::info!("[chat_completions] model={} stream={}", model_name, stream);
    let request_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now();

    // Try configured provider first
    if let Some((provider_id, provider, actual_model)) = ProviderRegistry::get_by_model(&model_name) {
        // Log to history
        if let Some(conn) = get_db_conn() {
            let conn = conn.lock();
            if let Ok(preview) = serde_json::to_string(&json!({"model": &actual_model, "stream": stream})) {
                let _ = history::insert_request(&conn, &request_id, "chat_completion", &provider_id, &actual_model, &preview);
            }
        }

        if stream {
            match provider.chat_completion_stream(&actual_model, body.clone()).await {
                Ok(stream_body) => {
                    let sse_stream = sse::create_sse_stream(stream_body, request_id);
                    return Response::builder()
                        .status(StatusCode::OK)
                        .header("Content-Type", "text/event-stream")
                        .header("Cache-Control", "no-cache")
                        .header("Connection", "keep-alive")
                        .body(Body::from_stream(sse_stream))
                        .unwrap();
                }
                Err(e) => {
                    update_history_error(&request_id, &e);
                    return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e);
                }
            }
        } else {
            match provider.chat_completion(&actual_model, body).await {
                Ok(response_body) => {
                    let latency_ms = (chrono::Utc::now() - timestamp).num_milliseconds() as i64;
                    if let Some(conn) = get_db_conn() {
                        let conn = conn.lock();
                        let tokens = response_body.get("usage").and_then(|u| u.get("total_tokens")).and_then(|t| t.as_i64()).unwrap_or(0);
                        let preview: Option<String> = response_body.get("choices").and_then(|c| c.as_array())
                            .and_then(|arr| arr.first()).and_then(|c| c.get("message")).and_then(|m| m.get("content"))
                            .and_then(|c| c.as_str()).map(|s| s.chars().take(200).collect::<String>());
                        let _ = history::update_response(&conn, &request_id, "success", tokens, latency_ms, preview.as_deref());
                    }
                    return JsonResponse(response_body).into_response();
                }
                Err(e) => {
                    update_history_error(&request_id, &e);
                    return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e);
                }
            }
        }
    }

    // Fallback: transparent proxy using client's own API key
    log_transparent_proxy(&request_id, &model_name, "chat_completions");
    match transparent_proxy(&headers, &body, &model_name, stream, "/chat/completions").await {
        Ok(response) => {
            if let Some(conn) = get_db_conn() {
                let conn = conn.lock();
                let _ = history::update_response(&conn, &request_id, "success", 0, 0, Some("transparent proxy"));
            }
            response
        }
        Err(e) => {
            update_history_error(&request_id, &e);
            error_response(StatusCode::BAD_REQUEST, &format!("No provider configured for '{}' and transparent proxy failed: {}", model_name, e))
        }
    }
}

fn log_transparent_proxy(request_id: &str, model: &str, req_type: &str) {
    if let Some(conn) = get_db_conn() {
        let conn = conn.lock();
        let preview = json!({"model": model, "type": "transparent_proxy"}).to_string();
        let _ = history::insert_request(&conn, request_id, req_type, "transparent", model, &preview);
    }
}

pub async fn completions(
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body).unwrap_or_else(|| "gpt-3.5-turbo-instruct".to_string());
    let stream = body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);

    // Try configured provider
    if let Some((_pid, provider, actual_model)) = ProviderRegistry::get_by_model(&model_name) {
        if stream {
            match provider.chat_completion_stream(&actual_model, body).await {
                Ok(s) => {
                    let sse = sse::create_sse_stream(s, String::new());
                    return Response::builder().status(200).header("Content-Type", "text/event-stream").body(Body::from_stream(sse)).unwrap();
                }
                Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
            }
        } else {
            match provider.chat_completion(&actual_model, body).await {
                Ok(r) => return JsonResponse(r).into_response(),
                Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
            }
        }
    }

    // Transparent proxy fallback
    match transparent_proxy(&headers, &body, &model_name, stream, "/completions").await {
        Ok(r) => r,
        Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
    }
}

pub async fn responses(
    headers: HeaderMap,
    Json(mut body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body).unwrap_or_else(|| "gpt-4o".to_string());
    let stream = body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);
    tracing::info!("[responses] model={} stream={} body_keys={:?}", model_name, stream, body.as_object().map(|o| o.keys().collect::<Vec<_>>()));

    // Convert Codex responses format → chat format
    if let Some(obj) = body.as_object_mut() {
        if !obj.contains_key("messages") {
            if let Some(input) = obj.remove("input") {
                let content = input.as_str().unwrap_or("");
                obj.insert("messages".to_string(), json!([{"role": "user", "content": content}]));
            }
        }
        if !obj.contains_key("messages") {
            if let Some(instructions) = obj.remove("instructions") {
                obj.insert("messages".to_string(), json!([{"role": "system", "content": instructions}]));
            }
        }
    }

    // Try configured provider first (uses its own base_url and API key)
    if let Some((_pid, provider, actual_model)) = ProviderRegistry::get_by_model(&model_name) {
        if stream {
            match provider.chat_completion_stream(&actual_model, body).await {
                Ok(s) => {
                    let sse = sse::create_sse_stream(s, String::new());
                    return Response::builder().status(200).header("Content-Type", "text/event-stream")
                        .body(Body::from_stream(sse)).unwrap();
                }
                Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
            }
        } else {
            match provider.chat_completion(&actual_model, body).await {
                Ok(r) => return JsonResponse(r).into_response(),
                Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
            }
        }
    }

    // Always try transparent proxy first for Codex (uses Codex's own API key)
    // Only fall back to configured provider if transparent proxy fails
    match transparent_proxy(&headers, &body, &model_name, stream, "/chat/completions").await {
        Ok(r) => return r,
        Err(_transparent_err) => {
            // Fallback: try configured provider
            if let Some((_pid, provider, actual_model)) = ProviderRegistry::get_by_model(&model_name) {
                if stream {
                    match provider.chat_completion_stream(&actual_model, body).await {
                        Ok(s) => {
                            let sse = sse::create_sse_stream(s, String::new());
                            return Response::builder().status(200).header("Content-Type", "text/event-stream")
                                .body(Body::from_stream(sse)).unwrap();
                        }
                        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
                    }
                } else {
                    match provider.chat_completion(&actual_model, body).await {
                        Ok(r) => return JsonResponse(r).into_response(),
                        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
                    }
                }
            }
            error_response(StatusCode::BAD_REQUEST, "No route available")
        }
    }
}

pub async fn list_models() -> impl IntoResponse {
    let all_models = ProviderRegistry::list_all();
    let mut data = Vec::new();

    for (provider_id, models) in &all_models {
        for model in models {
            data.push(json!({
                "id": format!("{}/{}", provider_id, model.id),
                "object": "model",
                "created": chrono::Utc::now().timestamp(),
                "owned_by": model.provider_name,
            }));
        }
    }

    // If no configured providers, return common models as reference
    if data.is_empty() {
        let defaults = [
            ("gpt-4o", "openai"),
            ("gpt-4o-mini", "openai"),
            ("gpt-4-turbo", "openai"),
            ("gpt-3.5-turbo", "openai"),
            ("claude-opus-4-20250514", "anthropic"),
            ("claude-sonnet-4-20250514", "anthropic"),
            ("claude-haiku-3-5-20241022", "anthropic"),
            ("deepseek-chat", "deepseek"),
            ("deepseek-reasoner", "deepseek"),
            ("gemini-2.5-pro", "google"),
            ("gemini-2.0-flash", "google"),
            ("moonshot-v1-8k", "moonshot"),
            ("qwen-turbo", "alibaba"),
            ("qwen-plus", "alibaba"),
        ];
        for (id, owner) in &defaults {
            data.push(json!({
                "id": id,
                "object": "model",
                "created": chrono::Utc::now().timestamp(),
                "owned_by": owner,
            }));
        }
    }

    JsonResponse(json!({ "object": "list", "data": data }))
}

pub async fn embeddings(
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body).unwrap_or_else(|| "text-embedding-ada-002".to_string());

    if let Some((_pid, provider, actual_model)) = ProviderRegistry::get_by_model(&model_name) {
        match provider.chat_completion(&actual_model, body).await {
            Ok(r) => return JsonResponse(r).into_response(),
            Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
        }
    }

    match transparent_proxy(&headers, &body, &model_name, false, "/embeddings").await {
        Ok(r) => r,
        Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
    }
}

pub fn error_response(status: impl Into<StatusCode>, msg: &str) -> Response {
    let code = status.into();
    Response::builder()
        .status(code)
        .header("Content-Type", "application/json")
        .body(Body::from(
            json!({"error": {"message": msg, "type": "api_error", "code": code.as_u16()}}).to_string(),
        ))
        .unwrap()
}

pub async fn catch_responses(
    headers: HeaderMap,
    axum::extract::Path(path): axum::extract::Path<String>,
    method: axum::http::Method,
    body: String,
) -> Response {
    tracing::warn!("CATCH: {} /v1/responses/{} | body: {}", method, path, &body[..body.len().min(200)]);
    let body_value: Value = serde_json::from_str(&body).unwrap_or(json!({}));
    let model_name = transform::extract_model_name(&body_value).unwrap_or_else(|| "gpt-4o".to_string());
    let stream = body_value.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);

    // Convert and forward
    let mut converted = body_value.clone();
    if let Some(obj) = converted.as_object_mut() {
        if !obj.contains_key("messages") {
            if let Some(input) = obj.remove("input") {
                obj.insert("messages".to_string(), json!([{"role": "user", "content": input}]));
            }
        }
    }

    match transparent_proxy(&headers, &converted, &model_name, stream, "/chat/completions").await {
        Ok(r) => r,
        Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
    }
}

/// Catch-all handler: transparent passthrough for any unknown path
pub async fn catch_all(
    headers: HeaderMap,
    method: axum::http::Method,
    uri: axum::http::Uri,
    body: String,
) -> Response {
    let path = uri.path().to_string();
    tracing::info!("CATCH-ALL: {} {} body_len={}", method, path, body.len());

    // Try to parse model from body for routing
    let model = serde_json::from_str::<Value>(&body)
        .ok()
        .and_then(|v| v.get("model").and_then(|m| m.as_str()).map(String::from))
        .unwrap_or_else(|| "gpt-4o".to_string());

    let stream = serde_json::from_str::<Value>(&body)
        .ok()
        .and_then(|v| v.get("stream").and_then(|s| s.as_bool()))
        .unwrap_or(false);

    // Determine upstream path
    let upstream_path = if path.contains("/chat/completions") || path.contains("/responses") || path.contains("/completions") {
        "/chat/completions"
    } else if path.contains("/models") {
        "/models"
    } else {
        "/chat/completions" // default
    };

    // Try transparent proxy
    match transparent_proxy(&headers, &serde_json::from_str(&body).unwrap_or(json!({})), &model, stream, upstream_path).await {
        Ok(r) => r,
        Err(e) => error_response(StatusCode::BAD_REQUEST, &format!("Proxy error: {}", e)),
    }
}
