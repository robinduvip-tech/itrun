use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use parking_lot::Mutex;

use super::router::build_router;

static PROXY_INSTANCE: once_cell::sync::OnceCell<ProxyServer> = once_cell::sync::OnceCell::new();

pub struct ProxyServer {
    port: Arc<Mutex<u16>>,
    running: Arc<Mutex<bool>>,
    start_time: Arc<Mutex<Option<std::time::Instant>>>,
    shutdown_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

impl ProxyServer {
    pub fn global() -> &'static ProxyServer {
        PROXY_INSTANCE.get_or_init(|| ProxyServer::new())
    }

    fn new() -> Self {
        Self {
            port: Arc::new(Mutex::new(0)),
            running: Arc::new(Mutex::new(false)),
            start_time: Arc::new(Mutex::new(None)),
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub fn is_running(&self) -> bool {
        *self.running.lock()
    }

    pub fn port(&self) -> u16 {
        *self.port.lock()
    }

    pub fn uptime_ms(&self) -> u64 {
        self.start_time
            .lock()
            .map(|t| t.elapsed().as_millis() as u64)
            .unwrap_or(0)
    }

    pub async fn start(&self, port: u16) -> Result<(), String> {
        if self.is_running() {
            return Err("Proxy server is already running".to_string());
        }

        let router = build_router();
        let addr = format!("127.0.0.1:{}", port);

        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

        let actual_port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local address: {}", e))?
            .port();

        let (tx, rx) = oneshot::channel::<()>();

        *self.port.lock() = actual_port;
        *self.start_time.lock() = Some(std::time::Instant::now());
        *self.running.lock() = true;
        *self.shutdown_tx.lock() = Some(tx);

        let running = self.running.clone();
        let start_time = self.start_time.clone();
        let port_clone = self.port.clone();

        tokio::spawn(async move {
            tracing::info!("Proxy server starting on port {}", actual_port);

            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    let _ = rx.await;
                    tracing::info!("Proxy server shutting down...");
                })
                .await
                .unwrap_or_else(|e| {
                    tracing::error!("Server error: {}", e);
                });

            *running.lock() = false;
            *start_time.lock() = None;
            *port_clone.lock() = 0;
            tracing::info!("Proxy server stopped");
        });

        tracing::info!("Proxy server started on port {}", actual_port);
        Ok(())
    }

    pub fn stop(&self) {
        if let Some(tx) = self.shutdown_tx.lock().take() {
            let _ = tx.send(());
        }
    }
}
