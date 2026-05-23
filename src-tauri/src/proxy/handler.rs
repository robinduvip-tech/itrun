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

/// Global DB connection for handler access. Set from lib.rs during startup.
static HANDLER_DB: once_cell::sync::OnceCell<Arc<Mutex<Connection>>> = once_cell::sync::OnceCell::new();

fn get_db_conn() -> Option<Arc<Mutex<Connection>>> {
    HANDLER_DB.get().cloned()
}

/// Called from lib.rs to set the global DB connection for handler access.
pub fn set_handler_db(conn: Arc<Mutex<Connection>>) {
    let _ = HANDLER_DB.set(conn);
}

fn update_history_error(request_id: &str, error: &str) {
    if let Some(conn) = get_db_conn() {
        let conn = conn.lock();
        let _ = history::update_response(&conn, request_id, "error", 0, 0, Some(error));
    }
}

pub async fn chat_completions(
    _headers: HeaderMap,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body)
        .unwrap_or_else(|| "unknown".to_string());
    let stream = body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);

    let request_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now();

    let provider_info = ProviderRegistry::get_by_model(&model_name);

    if provider_info.is_none() {
        return error_response(
            StatusCode::BAD_REQUEST,
            &format!("No provider found for model: {}", model_name),
        );
    }

    let (provider_id, provider, actual_model) = provider_info.unwrap();

    // Log request to history
    if let Some(conn) = get_db_conn() {
        let conn = conn.lock();
        if let Ok(preview) = serde_json::to_string(&json!({
            "model": actual_model,
            "stream": stream,
        })) {
            let _ = history::insert_request(
                &conn,
                &request_id,
                "chat_completion",
                &provider_id,
                &actual_model,
                &preview,
            );
        }
    }

    if stream {
        match provider.chat_completion_stream(&actual_model, body.clone()).await {
            Ok(stream_body) => {
                let sse_stream = sse::create_sse_stream(stream_body, request_id.clone());
                Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "text/event-stream")
                    .header("Cache-Control", "no-cache")
                    .header("Connection", "keep-alive")
                    .body(Body::from_stream(sse_stream))
                    .unwrap()
            }
            Err(e) => {
                update_history_error(&request_id, &e);
                error_response(StatusCode::INTERNAL_SERVER_ERROR, &e)
            }
        }
    } else {
        match provider.chat_completion(&actual_model, body).await {
            Ok(response_body) => {
                let latency_ms = (chrono::Utc::now() - timestamp).num_milliseconds() as i64;
                let tokens = response_body
                    .get("usage")
                    .and_then(|u| u.get("total_tokens"))
                    .and_then(|t| t.as_i64())
                    .unwrap_or(0);

                let preview = response_body
                    .get("choices")
                    .and_then(|c| c.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|choice| choice.get("message"))
                    .and_then(|msg| msg.get("content"))
                    .and_then(|c| c.as_str())
                    .map(|s| s.chars().take(200).collect::<String>());

                if let Some(conn) = get_db_conn() {
                    let conn = conn.lock();
                    let _ = history::update_response(
                        &conn,
                        &request_id,
                        "success",
                        tokens,
                        latency_ms,
                        preview.as_deref(),
                    );
                }

                JsonResponse(response_body).into_response()
            }
            Err(e) => {
                update_history_error(&request_id, &e);
                error_response(StatusCode::INTERNAL_SERVER_ERROR, &e)
            }
        }
    }
}

pub async fn completions(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body)
        .unwrap_or_else(|| "unknown".to_string());
    let stream = body.get("stream").and_then(|v| v.as_bool()).unwrap_or(false);

    let request_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now();

    let provider_info = ProviderRegistry::get_by_model(&model_name);

    if provider_info.is_none() {
        return error_response(
            StatusCode::BAD_REQUEST,
            &format!("No provider found for model: {}", model_name),
        );
    }

    let (provider_id, provider, actual_model) = provider_info.unwrap();

    if let Some(conn) = get_db_conn() {
        let conn = conn.lock();
        if let Ok(preview) = serde_json::to_string(&json!({
            "model": actual_model,
            "stream": stream,
        })) {
            let _ = history::insert_request(
                &conn,
                &request_id,
                "completion",
                &provider_id,
                &actual_model,
                &preview,
            );
        }
    }

    if stream {
        match provider.chat_completion_stream(&actual_model, body).await {
            Ok(stream_body) => {
                let sse_stream = sse::create_sse_stream(stream_body, request_id.clone());
                Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "text/event-stream")
                    .header("Cache-Control", "no-cache")
                    .header("Connection", "keep-alive")
                    .body(Body::from_stream(sse_stream))
                    .unwrap()
            }
            Err(e) => {
                update_history_error(&request_id, &e);
                error_response(StatusCode::INTERNAL_SERVER_ERROR, &e)
            }
        }
    } else {
        match provider.chat_completion(&actual_model, body).await {
            Ok(response_body) => {
                let latency_ms = (chrono::Utc::now() - timestamp).num_milliseconds() as i64;
                let tokens = response_body
                    .get("usage")
                    .and_then(|u| u.get("total_tokens"))
                    .and_then(|t| t.as_i64())
                    .unwrap_or(0);

                let preview = response_body
                    .get("choices")
                    .and_then(|c| c.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|choice| choice.get("text"))
                    .and_then(|c| c.as_str())
                    .map(|s| s.chars().take(200).collect::<String>());

                if let Some(conn) = get_db_conn() {
                    let conn = conn.lock();
                    let _ = history::update_response(
                        &conn,
                        &request_id,
                        "success",
                        tokens,
                        latency_ms,
                        preview.as_deref(),
                    );
                }

                JsonResponse(response_body).into_response()
            }
            Err(e) => {
                update_history_error(&request_id, &e);
                error_response(StatusCode::INTERNAL_SERVER_ERROR, &e)
            }
        }
    }
}

pub async fn list_models() -> impl IntoResponse {
    let all_models = ProviderRegistry::list_all();
    let mut data = Vec::new();

    for (provider_id, models) in &all_models {
        for model in models {
            let model_json = json!({
                "id": format!("{}/{}", provider_id, model.id),
                "object": "model",
                "created": chrono::Utc::now().timestamp(),
                "owned_by": model.provider_name,
                "name": model.name.clone(),
                "max_tokens": model.max_tokens,
                "pricing": model.pricing,
            });
            data.push(model_json);
        }
    }

    JsonResponse(json!({
        "object": "list",
        "data": data,
    }))
}

pub async fn embeddings(
    Json(body): Json<Value>,
) -> impl IntoResponse {
    let model_name = transform::extract_model_name(&body)
        .unwrap_or_else(|| "text-embedding-ada-002".to_string());

    let provider_info = ProviderRegistry::get_by_model(&model_name);

    if provider_info.is_none() {
        return error_response(
            StatusCode::BAD_REQUEST,
            &format!("No provider found for model: {}", model_name),
        );
    }

    let (_provider_id, provider, actual_model) = provider_info.unwrap();

    match provider.chat_completion(&actual_model, body).await {
        Ok(response_body) => JsonResponse(response_body).into_response(),
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
    }
}

pub fn model_to_provider(model: &str) -> Option<(String, String)> {
    if let Some((prefix, actual)) = model.split_once('/') {
        if ProviderRegistry::get(prefix).is_some() {
            return Some((prefix.to_string(), actual.to_string()));
        }
    }

    if let Some((id, _provider)) = ProviderRegistry::get_default() {
        return Some((id, model.to_string()));
    }

    let all = ProviderRegistry::list_all();
    for (provider_id, models) in &all {
        for m in models {
            if m.id == model {
                return Some((provider_id.clone(), model.to_string()));
            }
        }
    }

    None
}

pub fn error_response(status: StatusCode, msg: &str) -> Response {
    let body = json!({
        "error": {
            "message": msg,
            "type": "api_error",
            "code": status.as_u16(),
        }
    });

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}
