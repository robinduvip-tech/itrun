use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_http::limit::RequestBodyLimitLayer;

use super::handler;

pub fn build_router() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/v1/chat/completions", axum::routing::post(handler::chat_completions))
        .route("/v1/completions", axum::routing::post(handler::completions))
        .route("/v1/responses", axum::routing::post(handler::responses))
        .route("/v1/models", axum::routing::get(handler::list_models))
        .route("/v1/embeddings", axum::routing::post(handler::embeddings))
        // Catch Codex SDK double /v1 prefix
        .route("/v1/v1/chat/completions", axum::routing::post(handler::chat_completions))
        .route("/v1/v1/responses", axum::routing::post(handler::responses))
        .route("/v1/v1/models", axum::routing::get(handler::list_models))
        .route("/health", axum::routing::get(|| async { "OK" }))
        .layer(RequestBodyLimitLayer::new(50 * 1024 * 1024))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}
