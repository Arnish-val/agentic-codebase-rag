# Agentic Codebase & Documentation Intelligence Platform

> An enterprise-grade, multi-agent AI system for software engineering teams that performs multi-hop developer query resolution over codebases, documentation, and API references with grounded verification, exact line-range citations, and sandboxed code execution.

---

## 📌 Features & Architecture Overview

- **Multi-Agent State Orchestration (LangGraph)**:
  - **Router Agent**: Classifies incoming developer queries into 5 execution tracks (`factual`, `multi_hop`, `codegen`, `comparison`, `ambiguous`) and blocks prompt injections.
  - **Retrieval Agent**: Executes hybrid BM25 + BGE-M3 vector search with Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking.
  - **Generation Agent**: Streams markdown responses token-by-token with inline citation anchors (`[1]`, `[2]`).
  - **Critic Agent**: Audits generated claims against retrieved source chunks, executing up to 3 re-retrieval loops if claims are ungrounded.
  - **Code Execution Agent**: Executes Python, Node.js, and Shell code blocks inside ephemeral Docker containers.
  - **Memory Agent**: Manages session state and handles anaphoric follow-up resolution.

- **Hybrid Retrieval Pipeline**:
  - Dense BGE-M3 embeddings (1024-dim) stored in **MongoDB Atlas Vector Search**.
  - BM25 full-text index on source code chunks and documentation sections.
  - **Reciprocal Rank Fusion (RRF)** ($k=60$) combining keyword and vector ranks.
  - **Cross-Encoder Reranking** (`bge-reranker-v2-m3`) filtering candidates down to the top-10.

- **Sandboxed Execution Security**:
  - Ephemeral Docker containers running under non-root user `sandboxuser`.
  - Security hardening: Seccomp syscall profile, read-only root filesystem, `NetworkMode: 'none'`, 256MB RAM limit, 50% CPU quota.

- **Developer UI & Observability**:
  - React 18 frontend with Server-Sent Events (SSE) streaming (<100ms TTFT).
  - Source Code Inspector Modal displaying full source chunks with line range anchors (`#L42-L65`).
  - **Agent Decision Trace Panel** showing real-time agent node state transitions, execution durations, and reasoning logs.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose
- MongoDB 7.0 Instance or MongoDB Atlas Cluster

### Installation & Run

1. **Clone the Repository**:
   ```bash
   git clone <your-repository-url>
   cd agentic-codebase
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Update OPENROUTER_API_KEY, MONGODB_URI, REDIS_URI in .env
   ```

4. **Start Infrastructure Services**:
   ```bash
   docker-compose up -d
   ```

5. **Start Application Server & Client**:
   ```bash
   npm run dev
   ```

---

## 📖 Deep-Dive Documentation & Technical Interview Q&A

For a detailed query execution walkthrough example, system architecture deep-dive, and technical interview questions & answers, view:
👉 **[PROJECT_EXPLANATION.md](file:///d:/Agentic%20Codebase/PROJECT_EXPLANATION.md)**
