/**
 * SSE (Server-Sent Events) stream utilities
 */

/**
 * Initialize an SSE response — sets headers and flushes.
 */
export function initSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.flushHeaders();

  // Heartbeat every 15s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15_000);

  // Cleanup on client disconnect
  res.on('close', () => {
    clearInterval(heartbeat);
  });

  return heartbeat;
}

/**
 * Send a typed SSE event.
 */
export function sendSSEEvent(res, eventType, data) {
  if (res.writableEnded) return;
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
}

/**
 * Send a token chunk event.
 */
export function sendToken(res, token, index) {
  sendSSEEvent(res, 'chunk', { token, index });
}

/**
 * Send a status update event.
 */
export function sendStatus(res, step, message, metadata = {}) {
  sendSSEEvent(res, 'status', { step, message, ...metadata });
}

/**
 * Send a citation event.
 */
export function sendCitation(res, citation) {
  sendSSEEvent(res, 'citation', citation);
}

/**
 * Send an execution result event.
 */
export function sendExecution(res, result) {
  sendSSEEvent(res, 'execution', result);
}

/**
 * Send the trace event (reasoning chain).
 */
export function sendTrace(res, steps) {
  sendSSEEvent(res, 'trace', { steps });
}

/**
 * Send the session/message ID metadata.
 */
export function sendSession(res, sessionId, messageId) {
  sendSSEEvent(res, 'session', { sessionId, messageId });
}

/**
 * Send a completion event and end the stream.
 */
export function sendDone(res, metadata = {}) {
  sendSSEEvent(res, 'done', metadata);
  res.end();
}

/**
 * Send an error event and end the stream.
 */
export function sendSSEError(res, code, message) {
  sendSSEEvent(res, 'error', { code, message });
  res.end();
}
