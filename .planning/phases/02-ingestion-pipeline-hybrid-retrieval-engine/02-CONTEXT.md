# Phase 2 Context: Ingestion Pipeline & Hybrid Retrieval Engine

## Overview
Phase 2 builds and hardens the data ingestion pipeline and hybrid search system for the Agentic Codebase Intelligence Platform.

## Requirements Mapped
- `INGEST-01`: Multi-format document parser (Source code files, Markdown docs, OpenAPI/Swagger API references)
- `INGEST-02`: Hierarchical parent-child chunker (Repo → File → AST Class/Function → Block)
- `RETR-01`: BGE-M3 1024-dim dense vector generation
- `RETR-02`: MongoDB Atlas Vector Search indexing
- `RETR-03`: BM25 full-text index construction
- `RETR-04`: Reciprocal Rank Fusion (RRF) with $k=60$ and configurable weights ($\alpha_{BM25}=0.4, \alpha_{Vector}=0.6$)
- `RETR-05`: Cross-encoder reranking stage ($50 \rightarrow 10$ candidates)

## Key Technical Decisions
1. **Parser Engine**: AST parsers for JS/TS/Py, section chunking for Markdown, JSON/YAML schemas for OpenAPI specs.
2. **Indexing Stores**: MongoDB `chunks` collection with text search index and Atlas Vector Search index.
3. **Retrieval**: Combined pipeline using `hybridSearch.js` and TEI `reranker.js` service.
