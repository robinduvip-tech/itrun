pub mod proxy;
pub mod provider;
pub mod db;
pub mod commands;
pub mod middleware;
pub mod configs;

use std::sync::Arc;
use parking_lot::Mutex;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

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
            for p in &providers {
                if let Ok(Some(provider)) =
                    provider::build_provider(&p.provider_type, &p.api_key, &p.base_url, &p.config)
                {
                    let arc_provider: Arc<dyn provider::Provider> = provider;
                    ProviderRegistry::register(&p.id, arc_provider);
                    // Cache models from DB config
                    if !p.models.is_empty() {
                        let model_infos: Vec<provider::ModelInfo> = p.models.iter().map(|m| {
                            provider::ModelInfo {
                                id: m.clone(),
                                name: m.clone(),
                                provider_name: p.name.clone(),
                                max_tokens: 16384,
                                pricing: serde_json::json!({}),
                            }
                        }).collect();
                        ProviderRegistry::cache_models(&p.id, model_infos);
                    }
                }
            }
            if let Ok(Some(default_id)) = db::config::get_default_provider(&conn) {
                ProviderRegistry::set_default(&default_id);
            }
        }
    }

    // Read close_to_tray setting from DB BEFORE tauri::Builder
    let close_to_tray = {
        let conn = db_conn.lock();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'close_to_tray'").ok();
        stmt.as_mut()
            .and_then(|s| s.query_row([], |row| row.get::<_, String>(0)).ok())
            .map(|v| v == "true")
            .unwrap_or(true)
    };

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
            commands::provider::try_fetch_models,
            commands::provider::fetch_provider_models,
            commands::provider::list_all_models_cmd,
            commands::provider::test_provider_health,
            commands::provider::check_all_providers_health,
            commands::history::get_history,
            commands::history::get_request_detail,
            commands::history::clear_history_cmd,
            commands::history::get_dashboard_stats,
            commands::history::get_daily_stats_cmd,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::reset_settings,
            commands::configs::scan_configs,
            commands::configs::read_config_file,
            commands::configs::write_config_file,
            commands::configs::get_codex_status,
            commands::configs::add_codex_profile,
            commands::configs::delete_codex_profile,
            commands::configs::delete_codex_profile,
            commands::configs::switch_codex_profile,
            commands::configs::backup_codex_official,
            commands::configs::restore_codex_official,
        ])
        .setup(move |app| {
            // ── System Tray ──
            let handle = app.handle();
            let quit_item = MenuItemBuilder::with_id("quit", "退出 iTrun").build(app)?;
            let tray_menu = MenuBuilder::new(app).item(&quit_item).build()?;

            let _tray = TrayIconBuilder::new()
                .icon(handle.default_window_icon().unwrap().clone())
                .tooltip("iTrun — AI 中转客户端")
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(move |tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up, ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Intercept window close → hide to tray (if enabled)
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if close_to_tray {
                            let _ = w.hide();
                        } else {
                            std::process::exit(0);
                        }
                    }
                });
            }

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
