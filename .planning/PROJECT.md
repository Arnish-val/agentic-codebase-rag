# Agentic Codebase & Documentation Intelligence Platform

## What This Is

A multi-agent AI system for enterprise engineering teams that answers multi-hop developer queries over codebases, documentation, and API references with grounded, verified responses and executable code suggestions. Built on MERN stack with LangGraph orchestration, MongoDB Atlas Vector Search, and hybrid BM25+vector retrieval with cross-encoder reranking.

## Core Value

Developers get accurate, citation-backed answers to complex codebase questions — with verifiable sources and runnable code — faster than searching docs manually.

## Context

- **Stack**: MERN (MongoDB, Express.js, React, Node.js)
- **Agent Framework**: LangGraph for multi-agent orchestration with state graphs
- **Embeddings**: BGE-M3 (multi-lingual, multi-granularity)
- **Retrieval**: Hybrid BM25 + vector search with Reciprocal Rank Fusion, cross-encoder reranking
- **Vector Store**: MongoDB Atlas Vector Search
- **LLM Provider**: OpenRouter/Anthropic API (Claude 3.5 Sonnet primary)
- **Code Execution**: Docker sandbox for safe code execution
- **Streaming**: Server-Sent Events (SSE) for real-time response streaming
- **Target Users**: Enterprise engineering teams (10–500 developers)
- **Deployment**: Docker Compose (dev), Kubernetes-ready (prod)

## Constraints

- **Tech Stack**: MERN + LangGraph — no alternative frameworks without explicit approval
- **Security**: All code execution MUST be sandboxed in ephemeral Docker containers with network isolation
- **Latency**: First token < 2s for simple queries, full response < 15s for multi-hop
- **Grounding**: Every factual claim must cite a source chunk with file path + line range
- **Cost**: LLM API spend must be controllable — implement caching, token budgets, model routing
- **Data Privacy**: No customer code leaves the deployment boundary except to configured LLM APIs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph over CrewAI/AutoGen | State graph model gives deterministic control over agent transitions, retry logic, and observability | — Pending |
| MongoDB Atlas Vector Search over Pinecone/Weaviate | Unified data layer — same DB for docs, vectors, sessions, and metadata; reduces operational complexity | — Pending |
| BGE-M3 over OpenAI ada-002 | Multi-granularity (dense+sparse+colbert), self-hostable, no per-token embedding cost at scale | — Pending |
| Hybrid BM25+Vector with RRF | Keyword exactness (BM25) + semantic understanding (vector) — proven to outperform either alone by 15-25% on code search | — Pending |
| Cross-encoder reranking | Two-stage retrieval: fast recall (bi-encoder) → precise reranking (cross-encoder) dramatically improves precision@5 | — Pending |
| Docker sandbox over WASM/Firecracker | Docker is well-understood, has mature tooling, sufficient isolation for code execution with proper seccomp profiles | — Pending |
| SSE over WebSocket | Simpler protocol for unidirectional streaming; sufficient for response streaming; easier to load-balance | — Pending |

---
*Last updated: 2026-07-29 after initial project definition*
