use std::pin::Pin;
use std::task::{Context, Poll};
use bytes::Bytes;
use futures::Stream;
use serde_json::Value;
use tokio_stream::StreamExt;

/// Creates an SSE stream from a boxed byte stream.
/// Reads lines, parses SSE events, and forwards them as Bytes.
pub fn create_sse_stream(
    input: Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>,
    _request_id: String,
) -> impl Stream<Item = Result<Bytes, std::convert::Infallible>> + Send {
    SseStream {
        inner: input,
        buffer: String::new(),
    }
}

struct SseStream {
    inner: Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>,
    buffer: String,
}

impl Stream for SseStream {
    type Item = Result<Bytes, std::convert::Infallible>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            match self.inner.as_mut().poll_next(cx) {
                Poll::Ready(Some(Ok(bytes))) => {
                    let chunk = std::str::from_utf8(&bytes).unwrap_or("");
                    self.buffer.push_str(chunk);

                    // Extract complete SSE events (lines ending with \n\n)
                    while let Some(pos) = self.buffer.find("\n\n") {
                        let event = self.buffer[..pos + 2].to_string();
                        self.buffer = self.buffer[pos + 2..].to_string();

                        // Also check for "data: [DONE]" sentinel
                        if event.contains("data: [DONE]") {
                            return Poll::Ready(None);
                        }

                        let event_bytes = Bytes::from(event);
                        return Poll::Ready(Some(Ok(event_bytes)));
                    }

                    // If buffer is large and no complete event, flush partial
                    if self.buffer.len() > 4096 && !self.buffer.is_empty() {
                        let remaining = self.buffer.clone();
                        self.buffer.clear();
                        return Poll::Ready(Some(Ok(Bytes::from(remaining))));
                    }
                }
                Poll::Ready(Some(Err(e))) => {
                    tracing::error!("SSE stream error: {}", e);
                    let error_event = format!(
                        "data: {{\"error\": \"{}\"}}\n\n",
                        e.replace("\"", "\\\"")
                    );
                    return Poll::Ready(Some(Ok(Bytes::from(error_event))));
                }
                Poll::Ready(None) => {
                    // Flush any remaining buffer
                    if !self.buffer.is_empty() {
                        let remaining = std::mem::take(&mut self.buffer);
                        return Poll::Ready(Some(Ok(Bytes::from(remaining))));
                    }
                    return Poll::Ready(None);
                }
                Poll::Pending => {
                    return Poll::Pending;
                }
            }
        }
    }
}

/// Helper to forward request body to an upstream provider as SSE stream
pub async fn stream_request(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    body: Value,
) -> Result<Pin<Box<dyn Stream<Item = Result<Bytes, String>> + Send>>, String> {
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("Upstream error {}: {}", status.as_u16(), body_text));
    }

    let stream = response.bytes_stream();

    let mapped = stream.map(|item| match item {
        Ok(bytes) => Ok(bytes),
        Err(e) => Err(format!("Stream error: {}", e)),
    });

    Ok(Box::pin(mapped))
}
