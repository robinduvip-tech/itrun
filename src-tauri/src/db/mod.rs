mod migrate;
pub mod config;
pub mod history;

use rusqlite::Connection;

/// Initialize the database: create connection and run migrations.
pub fn init_db(db_path: &str) -> Result<Connection, String> {
    let conn = Connection::open(db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL;").ok();
    conn.execute_batch("PRAGMA busy_timeout=5000;").ok();
    conn.execute_batch("PRAGMA foreign_keys=ON;").ok();

    migrate::run_migrations(&conn)?;

    tracing::info!("Database initialized successfully at {}", db_path);
    Ok(conn)
}
