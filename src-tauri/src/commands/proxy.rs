use serde::{Deserialize, Serialize};
use tauri::command;

use crate::proxy::ProxyServer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    #[serde(rename = "is_running")]
    pub running: bool,
    pub port: u16,
    pub uptime_seconds: u64,
    pub requests_handled: u64,
    pub active_connections: u64,
}

#[command]
pub async fn start_proxy(port: u16) -> Result<u16, String> {
    let server = ProxyServer::global();
    server.start(port).await?;
    Ok(server.port())
}

#[command]
pub async fn stop_proxy() -> Result<ProxyStatus, String> {
    let server = ProxyServer::global();
    server.stop();
    Ok(ProxyStatus {
        running: server.is_running(),
        port: server.port(),
        uptime_seconds: server.uptime_ms() / 1000,
        requests_handled: 0,
        active_connections: 0,
    })
}

#[command]
pub async fn get_proxy_status() -> Result<ProxyStatus, String> {
    let server = ProxyServer::global();
    Ok(ProxyStatus {
        running: server.is_running(),
        port: server.port(),
        uptime_seconds: server.uptime_ms() / 1000,
        requests_handled: 0,
        active_connections: 0,
    })
}
