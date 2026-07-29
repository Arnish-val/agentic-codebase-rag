# Agentic Codebase RAG Platform: Deep-Dive Explanation & Interview Guide


This document contains a comprehensive explanation of how the platform operates end-to-end, a realistic e-commerce walkthrough example, and technical interview questions with architectural answers.

---

## 🔍 Detailed Walkthrough Example: Querying an E-Commerce Codebase

### Scenario
A senior software engineer asks the platform:
> *"How does our checkout service process payments, and can you write a python test script to simulate a payment failure?"*

### End-to-End Processing Steps

#### Step 1: Input Validation & Security Guard
- The user request hits `/api/v1/query`.
- Express input validators check the request body and verify that prompt injection attacks (such as system prompt overrides or delimiters like `<system>`) are rejected immediately.
- Server-Sent Event (SSE) headers are established (`Content-Type: text/event-stream`).

#### Step 2: Router Agent Classification & Decomposition
- The `RouterAgent` evaluates the query alongside recent session history:
  - **Classification**: `codegen` + `multi_hop`
  - **Sub-Queries Generated**:
    1. `"checkout service payment processing logic"`
    2. `"payment failure handling exception response"`

#### Step 3: Hybrid Search & Cross-Encoder Reranking
- The `RetrievalAgent` executes parallel queries across both sub-queries:
  1. Dense vector similarity search via MongoDB Atlas Vector Search (1024-dim BGE-M3 embeddings).
  2. Full-text BM25 search over Mongo `chunks` collection.
  3. Reciprocal Rank Fusion (RRF) combines scores:
     $$RRF(d) = 0.4 \cdot \frac{1}{60 + r_{BM25}(d)} + 0.6 \cdot \frac{1}{60 + r_{Vector}(d)}$$
  4. Top-50 candidates are submitted to the TEI Cross-Encoder reranker (`bge-reranker-v2-m3`), which selects the top-10 chunks.

#### Step 4: Grounded Answer Generation
- The `GenerationAgent` formats the retrieved code chunks into system context.
- It streams the response token-by-token, appending inline citations `[1]` referencing `services/checkout.ts#L45-L89` and `[2]` referencing `controllers/payment.ts#L12-L40`.

#### Step 5: Critic Audit & Verification Loop
- The `CriticAgent` audits every factual assertion in the generated answer against the source chunks.
- If all claims are grounded, the claim status is verified. If ungrounded assertions exist, the agent augments missing query keywords and triggers a re-retrieval loop (up to 3 retries).

#### Step 6: Sandboxed Code Execution
- The `CodeExecutionAgent` extracts the generated Python snippet.
- It launches an ephemeral `agentic-sandbox-python` Docker container with `NetworkMode: 'none'` and 256MB RAM.
- The captured stdout, stderr, and exit code are streamed back to the client UI.

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

### Q4: How does the platform handle incremental codebase updates without re-indexing the entire repository?
**Answer:**
The platform features a Git diff-based incremental detector (`incrementalDetector.js`):
1. **Commit Tracking**: Stores the `lastCommitSha` on the `Repository` document.
2. **Git Diff Summary**: Executes `git diff <lastCommitSha>..HEAD` to classify `added`, `modified`, and `deleted` files.
3. **Targeted Purge & Upsert**:
   - **Deleted Files**: Immediately deletes the document and all associated chunks from MongoDB.
   - **Modified Files**: Purges existing chunks, re-chunks and re-embeds the updated source file, and upserts new chunks into MongoDB Atlas Vector Search.
   - **Added Files**: Processes new files through the standard chunking and embedding pipeline.
