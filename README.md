# Agentic Codebase & Documentation Intelligence Platform

> A multi-agent AI system designed for enterprise engineering teams to answer multi-hop developer queries over codebases, documentation, and API references with grounded, verified responses, exact line-range citations, and sandboxed code execution.

---

## 📌 Executive Overview & Core Capabilities

The **Agentic Codebase & Documentation Intelligence Platform** solves context limitation, hallucination, and outdated documentation problems in modern engineering organizations. It ingests source code repositories, Markdown documentation, and OpenAPI/Swagger specifications into a unified hybrid retrieval engine and orchestrates multi-agent reasoning via **LangGraph**.

### Key Features
1. **Multi-Agent State Orchestration (LangGraph)**:
   - **Router Agent**: Classifies query types (`factual`, `multi_hop`, `codegen`, `comparison`, `ambiguous`) and detects prompt injections.
   - **Retrieval Agent**: Executes hybrid BM25 + BGE-M3 vector search with Reciprocal Rank Fusion (RRF) and Cross-Encoder reranking.
   - **Generation Agent**: Produces grounded markdown responses with inline citations (`[1]`, `[2]`).
   - **Critic / Verification Agent**: Audits generated claims against retrieved source chunks, triggering up to 3 re-retrieval loops if claims are ungrounded.
   - **Code Execution Agent**: Safely executes Python, Node.js, and Shell code in ephemeral Docker containers.
   - **Memory Agent**: Manages session history and anaphoric follow-up resolution ("what about that function?").
2. **Hybrid Retrieval Engine**:
   - **BGE-M3 1024-dim Dense Embeddings**: Generated via HuggingFace Text Embeddings Inference (TEI).
   - **MongoDB Atlas Vector Search**: Cosine distance indexing over chunk embeddings.
   - **BM25 Text Indexing**: Full-text keyword matching across file paths and code text.
   - **Reciprocal Rank Fusion (RRF)**: Fuses vector and keyword ranks with $k=60$ ($\alpha_{BM25}=0.4, \alpha_{Vector}=0.6$).
   - **Cross-Encoder Reranker**: `bge-reranker-v2-m3` rescores top-50 candidates down to top-10.
3. **Sandboxed Code Execution**:
   - Docker containers running as non-root `sandboxuser` with strict `seccomp` system call filtering.
   - Resource enforcement: 256MB RAM limit, 50% CPU quota, network egress disabled (`NetworkMode: 'none'`), 30-second timeout.
4. **Real-time Developer Interface**:
   - React dark mode UI with Server-Sent Events (SSE) streaming (<100ms Time To First Token).
   - Clickable inline citation badges opening source code viewer modals with exact line range anchors (`#L42-L65`).
   - Real-time **Agent Decision Trace Panel** showing node transitions, step execution times, and reasoning outputs.

---

## 🏗️ System Architecture

```
                                    ┌────────────────────────┐
                                    │    React Web Client    │
                                    └───────────┬────────────┘
                                                │ SSE Stream / REST
                                                ▼
                                    ┌────────────────────────┐
                                    │   Express API Server   │
                                    └───────────┬────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
    ┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
    │ LangGraph Agent Engine │    │ Ingestion Pipeline     │    │ Ephemeral Docker Run   │
    │ (Router/Critic/Gen)    │    │ (AST/Markdown/OpenAPI) │    │ (Python/Node/Shell)    │
    └────────────┬───────────┘    └─────────────┬──────────┘    └────────────────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
         ┌─────────────────────────────────────────────┐
         │          MongoDB Atlas & Vector Search      │
         │ (Document, Chunk, Session, Feedback, Repo)  │
         └─────────────────────────────────────────────┘
```

---

## 🔍 Comprehensive Walkthrough Example

### Scenario: Querying an E-Commerce Codebase
A software engineer asks:
> *"How does our checkout service process payments, and can you write a python test script to simulate a payment failure?"*

#### Step 1: Query Ingestion & Prompt Guard
- Express server receives request at `/api/v1/query` and validates input against prompt injection patterns.
- SSE stream headers are set and piped to the frontend.

#### Step 2: Router Agent Classification
- The `RouterAgent` evaluates the query and conversation history:
  - **Query Type**: `codegen` + `multi_hop`
  - **Sub-queries Generated**:
    1. `"checkout service payment processing logic"`
    2. `"payment failure handling exception response"`

#### Step 3: Hybrid Retrieval & Reranking
- The `RetrievalAgent` runs parallel retrieval for both sub-queries:
  1. Vector Similarity Search over 1024-dim BGE-M3 embeddings in MongoDB Atlas Vector Search.
  2. Full-text BM25 search over Mongo `chunks` collection.
  3. Reciprocal Rank Fusion (RRF) computes combined score:
     $$RRF(d) = 0.4 \cdot \frac{1}{60 + r_{BM25}(d)} + 0.6 \cdot \frac{1}{60 + r_{Vector}(d)}$$
  4. Top-50 candidates are submitted to the TEI Cross-Encoder reranker, selecting the top-10 chunks.

#### Step 4: Grounded Generation
- The `GenerationAgent` produces a structured answer explaining the payment pipeline step-by-step, appending inline citation tags `[1]` referencing `services/checkout.ts#L45-L89` and `[2]` referencing `controllers/payment.ts#L12-L40`.

#### Step 5: Verification & Claim Audit
- The `CriticAgent` audits all generated claims against the retrieved chunks.
- If all assertions are grounded in source text, the response is marked `verified`.

#### Step 6: Code Execution Sandbox
- The `CodeExecutionAgent` extracts the generated Python test snippet and executes it inside an isolated `agentic-sandbox-python` Docker container (`NetworkMode: 'none'`, 256MB RAM).
- stdout and stderr are captured and streamed back via SSE to the user.

---

## 🛠️ Technical Implementation Details

### Tech Stack
- **Backend**: Node.js, Express.js, Mongoose, LangGraph (`@langchain/langgraph`), Dockerode
- **Database & Search**: MongoDB 7.0 (Atlas Vector Search + Text Index), Redis 7.2
- **AI Models & Embeddings**: BGE-M3 (1024-dim), BGE-Reranker-v2-m3, OpenRouter / Anthropic Claude API
- **Frontend**: React 18, Vite, Tailwind CSS, Server-Sent Events (`EventSource`)
- **Infrastructure**: Ephemeral Docker containers, Seccomp profiles, Cgroups

---

## ❓ Technical Interview Questions & Answers

### Q1: Why did you choose Reciprocal Rank Fusion (RRF) over simple weighted linear combination for hybrid search?
**Answer:**
Weighted linear combination requires normalizing vector cosine similarities (typically $0.0 - 1.0$) and BM25 scores (unbounded positive numbers, e.g., $0 - 50+$) to a common scale. Normalizing BM25 across arbitrary query sets introduces distortion when score distributions vary wildly.

Reciprocal Rank Fusion operates exclusively on *rank positions* rather than raw scores:
$$RRF(d) = \sum_{m \in M} \frac{w_m}{k + r_m(d)}$$
By using rank positions with constant $k=60$, RRF is invariant to raw score magnitudes and prevents high BM25 outliers from overwhelming high-quality semantic vector matches.

---

### Q2: How does the platform enforce zero-hallucination guarantees and prevent incorrect code suggestions?
**Answer:**
Zero-hallucination guarantees are enforced through a multi-tier verification architecture:
1. **Strict Context Prompting**: Generation prompts instruct the LLM to rely *strictly* on retrieved context chunks and explicitly decline to answer if context is missing.
2. **Critic Verification Loop**: After generation, the `CriticAgent` parses factual claims and cross-references them against retrieved chunk text. If claims are ungrounded, the system augments missing keywords and routes back to the `RetrievalAgent` (up to 3 retries).
3. **Sandboxed Code Execution**: Any code snippet produced by the LLM is executed inside an isolated Docker container with network disabled. The actual runtime output (stdout/stderr/exitCode) is attached to the response, proving execution correctness empirically.

---

### Q3: How is security maintained when executing arbitrary user or AI-generated code in Docker?
**Answer:**
Security is maintained through defense-in-depth container isolation:
- **Non-Root Execution**: Containers run under unprivileged user `sandboxuser` (UID 1000).
- **Network Egress Block**: `NetworkMode: 'none'` ensures containers cannot make external HTTP, DNS, or socket calls.
- **Resource Constraints**: Cgroup limits enforce 256MB max RAM (swap disabled), 50% CPU quota (`CpuQuota: 50000`), and a hard limit of 50 PIDs (`PidsLimit: 50`) to block fork bombs.
- **Seccomp Syscall Profile**: Custom Seccomp profile blocks dangerous Linux system calls (`clone`, `ptrace`, `syslog`, `mount`).
- **Read-Only Root Filesystem**: `ReadonlyRootfs: true` with a temporary 50MB `tmpfs` mounted at `/tmp`.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- Docker & Docker Compose
- MongoDB 7.0 instance (or MongoDB Atlas cluster)

### Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-org/agentic-codebase.git
   cd agentic-codebase
   ```

2. **Install Workspace Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env and supply OPENROUTER_API_KEY, MONGODB_URI, etc.
   ```

4. **Launch Local Services via Docker Compose**:
   ```bash
   docker-compose up -d
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 📜 License
MIT License. Built for enterprise engineering teams.
