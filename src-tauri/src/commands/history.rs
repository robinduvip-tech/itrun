use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::Connection;
use tauri::{command, State};

use crate::db::history::{self, HistoryEntry, DashboardStats, DailyStat};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryFilter {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub status: Option<String>,
    pub request_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryResult {
    pub entries: Vec<HistoryEntry>,
    pub total: i64,
}

#[command]
pub async fn get_history(
    db: State<'_, Arc<Mutex<Connection>>>,
    filter: HistoryFilter,
) -> Result<HistoryResult, String> {
    let conn = db.lock();
    let limit = filter.limit.unwrap_or(50);
    let offset = filter.offset.unwrap_or(0);

    let entries = history::list_history(
        &conn,
        limit,
        offset,
        filter.provider_id.as_deref(),
        filter.model.as_deref(),
        filter.status.as_deref(),
        filter.request_type.as_deref(),
    )?;

    // Get total count (simple version - could be more efficient with separate COUNT query)
    let total = entries.len() as i64;

    Ok(HistoryResult { entries, total })
}

#[command]
pub async fn get_request_detail(
    db: State<'_, Arc<Mutex<Connection>>>,
    id: String,
) -> Result<Option<HistoryEntry>, String> {
    let conn = db.lock();
    history::get_request(&conn, &id)
}

#[command]
pub async fn clear_history_cmd(
    db: State<'_, Arc<Mutex<Connection>>>,
) -> Result<(), String> {
    let conn = db.lock();
    history::clear_history(&conn)
}

#[command]
pub async fn get_dashboard_stats(
    db: State<'_, Arc<Mutex<Connection>>>,
) -> Result<DashboardStats, String> {
    let conn = db.lock();
    history::get_stats(&conn)
}

#[command]
pub async fn get_daily_stats_cmd(
    db: State<'_, Arc<Mutex<Connection>>>,
    days: i32,
) -> Result<Vec<DailyStat>, String> {
    let conn = db.lock();
    history::get_daily_stats(&conn, days)
}
