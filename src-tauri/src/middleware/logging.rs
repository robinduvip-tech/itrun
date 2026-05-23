use rusqlite::Connection;
use std::sync::Arc;
use parking_lot::Mutex;

/// Log a request to the database.
/// This is intended to be called from tower middleware or other interceptors.
pub async fn log_request(
    db: Arc<Mutex<Connection>>,
    request_id: &str,
    method: &str,
    path: &str,
    body_preview: &str,
) -> Result<(), String> {
    let conn = db.lock();

    conn.execute(
        "INSERT INTO request_history (id, request_type, provider_id, model, status, request_body_preview)
         VALUES (?1, ?2, 'middleware', ?3, 'logging', ?4)",
        rusqlite::params![request_id, method, path, body_preview],
    )
    .map_err(|e| format!("Failed to log request: {}", e))?;

    Ok(())
}

/// Log a response outcome to the database.
pub async fn log_response(
    db: Arc<Mutex<Connection>>,
    request_id: &str,
    status_code: u16,
    latency_ms: i64,
    response_preview: &str,
) -> Result<(), String> {
    let conn = db.lock();
    let status = if status_code >= 200 && status_code < 300 {
        "success"
    } else {
        "error"
    };

    conn.execute(
        "UPDATE request_history SET
            status = ?2,
            latency_ms = ?3,
            response_body_preview = ?4,
            updated_at = datetime('now')
         WHERE id = ?1",
        rusqlite::params![request_id, status, latency_ms, response_preview],
    )
    .map_err(|e| format!("Failed to log response: {}", e))?;

    Ok(())
}
