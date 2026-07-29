# Phase 3 Research: LangGraph Agent Orchestration & Generation Pipeline

## 1. Multi-Agent State Graph Architecture
- **State Schema (`AgentStateAnnotation`)**: Shared state containing query, conversation history, routing classification, retrieved chunks, response stream, verification verdict, and reasoning trace array.
- **Node Execution**:
  - `RouterAgent` → `RetrievalAgent` → `GenerationAgent` → `CriticAgent` → `MemoryAgent`.

## 2. Re-Retrieval Verification Loop
- `CriticAgent` parses factual assertions against retrieved chunks.
- If verdict is `ungrounded` and `reRetrievalCount < 3`, query is augmented with missing claim keywords and routed back to `RetrievalAgent`.

## 3. SSE Streaming Pipeline
- Express `/api/v1/query` initializes SSE headers and pipes agent node tokens to client.
