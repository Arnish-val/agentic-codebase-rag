# Phase 3 Context: LangGraph Agent Orchestration & Generation Pipeline

## Overview
Phase 3 establishes the multi-agent state graph and SSE streaming pipeline for grounded query execution.

## Requirements Mapped
- `ROUTE-03`: Ambiguous query clarification prompts
- `ROUTE-04`: Query classification confidence logging
- `GEN-01`: Grounded response generation (zero hallucination target)
- `GEN-02`: Critic/verification agent for claim auditing
- `GEN-03`: Re-retrieval loop (max 3 retries) for ungrounded claims
- `GEN-04`: Inline citation formatting `[1]`, `[2]`
- `GEN-05`: Server-Sent Events (SSE) streaming delivery (< 100ms TTFT)
- `CITE-01`: Numbered source citations
- `CITE-02`: File path + line range links
- `SEC-03`: Prompt injection sanitization
