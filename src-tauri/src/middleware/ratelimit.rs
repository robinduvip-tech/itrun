use std::collections::HashMap;
use std::time::Instant;
use parking_lot::Mutex;

/// Simple in-memory rate limiter using a token bucket approach.
/// Each key (e.g., IP address or API key) gets its own bucket.
pub struct RateLimiter {
    buckets: Mutex<HashMap<String, RateBucket>>,
    max_requests: u32,
    window_secs: u64,
}

struct RateBucket {
    tokens: u32,
    last_refill: Instant,
}

impl RateLimiter {
    /// Create a new rate limiter.
    /// `max_requests` is the maximum number of requests allowed per `window_secs`.
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            max_requests,
            window_secs,
        }
    }

    /// Attempt to acquire a token for the given key.
    /// Returns `true` if the request is allowed, `false` if rate limited.
    pub fn acquire(&self, key: &str) -> bool {
        let mut buckets = self.buckets.lock();
        let now = Instant::now();
        let bucket = buckets.entry(key.to_string()).or_insert_with(|| RateBucket {
            tokens: self.max_requests,
            last_refill: now,
        });

        // Refill tokens based on elapsed time
        let elapsed = now.duration_since(bucket.last_refill);
        let window = std::time::Duration::from_secs(self.window_secs);

        if elapsed >= window {
            // Full window elapsed, reset tokens
            bucket.tokens = self.max_requests;
            bucket.last_refill = now;
        } else if elapsed.as_secs() > 0 {
            // Partial refill proportional to elapsed time
            let refill_ratio = elapsed.as_secs_f64() / self.window_secs as f64;
            let refill_amount = (self.max_requests as f64 * refill_ratio) as u32;
            bucket.tokens = (bucket.tokens + refill_amount).min(self.max_requests);
            bucket.last_refill = now;
        }

        if bucket.tokens > 0 {
            bucket.tokens -= 1;
            true
        } else {
            false
        }
    }

    /// Release a token back to the bucket (for cases where request is rejected early).
    /// Note: this does not exceed max_requests.
    pub fn release(&self, key: &str) {
        let mut buckets = self.buckets.lock();
        if let Some(bucket) = buckets.get_mut(key) {
            bucket.tokens = (bucket.tokens + 1).min(self.max_requests);
        }
    }

    /// Get the current token count for a key (for diagnostics).
    pub fn available(&self, key: &str) -> u32 {
        let buckets = self.buckets.lock();
        buckets.get(key).map(|b| b.tokens).unwrap_or(self.max_requests)
    }

    /// Clean up stale entries to prevent memory leaks.
    pub fn cleanup(&self) {
        let mut buckets = self.buckets.lock();
        let now = Instant::now();
        let window = std::time::Duration::from_secs(self.window_secs * 2);
        buckets.retain(|_, b| now.duration_since(b.last_refill) < window);
    }
}
