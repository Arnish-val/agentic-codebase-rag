import { useState, useCallback, useRef } from 'react';

export function useSSE() {
  const [streamingText, setStreamingText] = useState('');
  const [status, setStatus] = useState(null);
  const [citations, setCitations] = useState([]);
  const [trace, setTrace] = useState([]);
  const [executionResults, setExecutionResults] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const submitQuery = useCallback(async (query, sessionId, options = {}) => {
    setIsStreaming(true);
    setStreamingText('');
    setStatus('Initializing…');
    setCitations([]);
    setTrace([]);
    setExecutionResults([]);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ak_dev_key', // Dev key
        },
        body: JSON.stringify({ query, session_id: sessionId, options }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            switch (eventType) {
              case 'status':
                setStatus(data.message);
                break;
              case 'chunk':
                setStreamingText(prev => prev + data.token);
                break;
              case 'citation':
              case 'citations':
                setCitations(Array.isArray(data) ? data : prev => [...prev, data]);
                break;
              case 'trace':
                setTrace(data.steps || []);
                break;
              case 'execution':
                setExecutionResults(prev => [...prev, data]);
                break;
              case 'error':
                setError(data.message || 'Stream error');
                break;
              case 'done':
                setIsStreaming(false);
                setStatus(null);
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', e, dataStr);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      setStatus(null);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    streamingText,
    status,
    citations,
    trace,
    executionResults,
    isStreaming,
    error,
    submitQuery,
    stopStream,
  };
}
