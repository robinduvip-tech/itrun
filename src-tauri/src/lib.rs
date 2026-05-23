pub mod proxy;
pub mod provider;
pub mod db;
pub mod commands;
pub mod middleware;

use std::sync::Arc;
use parking_lot::Mutex;

use db::init_db;
use provider::registry::ProviderRegistry;

static DB_PATH: once_cell::sync::OnceCell<String> = once_cell::sync::OnceCell::new();

pub fn get_db_path() -> &'static str {
    DB_PATH.get().map(|s| s.as_str()).unwrap_or("itrun.db")
}

pub fn run() {
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir).ok();

    let db_path = format!("{}/itrun.db", app_dir);
    DB_PATH.set(db_path.clone()).ok();

    tracing::info!("Database path: {}", db_path);

    let conn = init_db(&db_path).expect("Failed to initialize database");
    let db_conn = Arc::new(Mutex::new(conn));

    // Make DB connection available to proxy handlers
    proxy::handler::set_handler_db(db_conn.clone());

    // Initialize provider registry from database
    {
        let conn = db_conn.lock();
        if let Ok(providers) = db::config::list_providers(&conn) {
            for p in providers {
                if let Ok(Some(provider)) =
                    provider::build_provider(&p.provider_type, &p.api_key, &p.base_url, &p.config)
                {
                    let arc_provider: Arc<dyn provider::Provider> = provider;
                    ProviderRegistry::register(&p.id, arc_provider);
                }
            }
            // Set default provider
            if let Ok(Some(default_id)) = db::config::get_default_provider(&conn) {
                ProviderRegistry::set_default(&default_id);
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(db_conn.clone())
        .invoke_handler(tauri::generate_handler![
            commands::proxy::start_proxy,
            commands::proxy::stop_proxy,
            commands::proxy::get_proxy_status,
            commands::provider::add_provider,
            commands::provider::update_provider_cmd,
            commands::provider::remove_provider,
            commands::provider::list_providers_cmd,
            commands::provider::test_provider_connection,
            commands::provider::set_default_provider_cmd,
            commands::history::get_history,
            commands::history::get_request_detail,
            commands::history::clear_history_cmd,
            commands::history::get_dashboard_stats,
            commands::history::get_daily_stats_cmd,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::reset_settings,
        ])
        .setup(|_app| {
            tracing::info!("iTrun app setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_app_data_dir() -> String {
    if let Ok(dir) = std::env::var("APPDATA") {
        format!("{}/iTrun", dir)
    } else if let Ok(dir) = std::env::var("HOME") {
        format!("{}/.codexbridge", dir)
    } else {
        ".".to_string()
    }
}
