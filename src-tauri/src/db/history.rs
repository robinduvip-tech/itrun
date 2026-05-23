use rusqlite::{Connection, params, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub request_type: String,
    pub provider_id: String,
    pub model: String,
    pub status: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
    pub request_body_preview: String,
    pub response_body_preview: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_requests: i64,
    pub total_tokens: i64,
    pub total_errors: i64,
    pub avg_latency_ms: f64,
    pub by_provider: Vec<ProviderStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStat {
    pub provider_id: String,
    pub request_count: i64,
    pub token_count: i64,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyStat {
    pub date: String,
    pub provider_id: String,
    pub request_count: i64,
    pub token_count: i64,
    pub error_count: i64,
    pub avg_latency_ms: i64,
}

pub fn insert_request(
    conn: &Connection,
    id: &str,
    request_type: &str,
    provider_id: &str,
    model: &str,
    request_body_preview: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO request_history (id, request_type, provider_id, model, request_body_preview)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, request_type, provider_id, model, request_body_preview],
    )
    .map_err(|e| format!("Failed to insert request: {}", e))?;

    // Update daily stats
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    conn.execute(
        "INSERT INTO daily_stats (date, provider_id, request_count, token_count, error_count, avg_latency_ms)
         VALUES (?1, ?2, 1, 0, 0, 0)
         ON CONFLICT(date, provider_id) DO UPDATE SET
            request_count = request_count + 1",
        params![today, provider_id],
    )
    .map_err(|e| format!("Failed to update daily stats: {}", e))?;

    Ok(())
}

pub fn update_response(
    conn: &Connection,
    id: &str,
    status: &str,
    tokens: i64,
    latency_ms: i64,
    response_preview: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE request_history SET
            status = ?2,
            tokens_used = ?3,
            latency_ms = ?4,
            response_body_preview = ?5,
            updated_at = datetime('now')
         WHERE id = ?1",
        params![id, status, tokens, latency_ms, response_preview.unwrap_or("")],
    )
    .map_err(|e| format!("Failed to update response: {}", e))?;

    // Update daily stats for tokens and latency
    if tokens > 0 || latency_ms > 0 {
        let row: Option<(String, i64, i64)> = conn
            .query_row(
                "SELECT provider_id, tokens_used, latency_ms FROM request_history WHERE id = ?1",
                params![id],
                |row| Ok((row.get(0)?, row.get::<_, i64>(1)?, row.get::<_, i64>(2)?)),
            )
            .optional()
            .map_err(|e| format!("Failed to query for stats update: {}", e))?;

        if let Some((provider_id, _row_tokens, _row_latency)) = row {
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            conn.execute(
                "UPDATE daily_stats SET
                    token_count = token_count + ?3,
                    avg_latency_ms = CASE
                        WHEN request_count > 1 THEN
                            ((avg_latency_ms * (request_count - 1)) + ?4) / request_count
                        ELSE ?4
                    END,
                    error_count = error_count + CASE WHEN ?2 = 'error' THEN 1 ELSE 0 END
                 WHERE date = ?1 AND provider_id = ?5",
                params![today, status, tokens, latency_ms, provider_id],
            )
            .map_err(|e| format!("Failed to update daily stats: {}", e))?;
        }
    }

    Ok(())
}

pub fn list_history(
    conn: &Connection,
    limit: i64,
    offset: i64,
    provider_id: Option<&str>,
    model: Option<&str>,
    status: Option<&str>,
    request_type: Option<&str>,
) -> Result<Vec<HistoryEntry>, String> {
    let mut sql = String::from(
        "SELECT id, request_type, provider_id, model, status, tokens_used, latency_ms,
                request_body_preview, response_body_preview, created_at, updated_at
         FROM request_history WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    if let Some(pid) = provider_id {
        sql.push_str(&format!(" AND provider_id = ?{}", param_idx));
        param_values.push(Box::new(pid.to_string()));
        param_idx += 1;
    }
    if let Some(m) = model {
        sql.push_str(&format!(" AND model LIKE ?{}", param_idx));
        param_values.push(Box::new(format!("%{}%", m)));
        param_idx += 1;
    }
    if let Some(s) = status {
        sql.push_str(&format!(" AND status = ?{}", param_idx));
        param_values.push(Box::new(s.to_string()));
        param_idx += 1;
    }
    if let Some(rt) = request_type {
        sql.push_str(&format!(" AND request_type = ?{}", param_idx));
        param_values.push(Box::new(rt.to_string()));
        param_idx += 1;
    }

    sql.push_str(" ORDER BY created_at DESC");
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", param_idx, param_idx + 1));
    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(refs.as_slice(), |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                request_type: row.get(1)?,
                provider_id: row.get(2)?,
                model: row.get(3)?,
                status: row.get(4)?,
                tokens_used: row.get(5)?,
                latency_ms: row.get(6)?,
                request_body_preview: row.get(7)?,
                response_body_preview: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Failed to query history: {}", e))?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(entries)
}

pub fn get_request(conn: &Connection, id: &str) -> Result<Option<HistoryEntry>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, request_type, provider_id, model, status, tokens_used, latency_ms,
                    request_body_preview, response_body_preview, created_at, updated_at
             FROM request_history WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let result = stmt
        .query_row(params![id], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                request_type: row.get(1)?,
                provider_id: row.get(2)?,
                model: row.get(3)?,
                status: row.get(4)?,
                tokens_used: row.get(5)?,
                latency_ms: row.get(6)?,
                request_body_preview: row.get(7)?,
                response_body_preview: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .optional()
        .map_err(|e| format!("Failed to query request: {}", e))?;

    Ok(result)
}

pub fn clear_history(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM request_history", [])
        .map_err(|e| format!("Failed to clear history: {}", e))?;
    conn.execute("DELETE FROM daily_stats", [])
        .map_err(|e| format!("Failed to clear daily stats: {}", e))?;
    Ok(())
}

pub fn get_stats(conn: &Connection) -> Result<DashboardStats, String> {
    let total_requests: i64 = conn
        .query_row("SELECT COUNT(*) FROM request_history", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count requests: {}", e))?;

    let total_tokens: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(tokens_used), 0) FROM request_history",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to sum tokens: {}", e))?;

    let total_errors: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM request_history WHERE status = 'error'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count errors: {}", e))?;

    let avg_latency: f64 = conn
        .query_row(
            "SELECT COALESCE(AVG(CAST(latency_ms AS REAL)), 0.0) FROM request_history WHERE status != 'pending'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to compute avg latency: {}", e))?;

    // Per-provider stats
    let mut stmt = conn
        .prepare(
            "SELECT provider_id, COUNT(*) AS cnt, COALESCE(SUM(tokens_used), 0) AS tokens,
                    COALESCE(AVG(CAST(latency_ms AS REAL)), 0.0) AS avg_lat
             FROM request_history
             WHERE provider_id != ''
             GROUP BY provider_id",
        )
        .map_err(|e| format!("Failed to prepare provider stats: {}", e))?;

    let by_provider: Vec<ProviderStat> = stmt
        .query_map([], |row| {
            Ok(ProviderStat {
                provider_id: row.get(0)?,
                request_count: row.get(1)?,
                token_count: row.get(2)?,
                avg_latency_ms: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query provider stats: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DashboardStats {
        total_requests,
        total_tokens,
        total_errors,
        avg_latency_ms: avg_latency,
        by_provider,
    })
}

pub fn get_daily_stats(conn: &Connection, days: i32) -> Result<Vec<DailyStat>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT date, provider_id, request_count, token_count, error_count, avg_latency_ms
             FROM daily_stats
             WHERE date >= date('now', ?1)
             ORDER BY date DESC, provider_id",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let days_param = format!("-{} days", days);
    let rows = stmt
        .query_map(params![days_param], |row| {
            Ok(DailyStat {
                date: row.get(0)?,
                provider_id: row.get(1)?,
                request_count: row.get(2)?,
                token_count: row.get(3)?,
                error_count: row.get(4)?,
                avg_latency_ms: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query daily stats: {}", e))?;

    let mut stats = Vec::new();
    for row in rows {
        stats.push(row.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(stats)
}
