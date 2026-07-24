# Phase 2 Research: Ingestion Pipeline & Hybrid Retrieval Engine

## 1. AST Parsing & Chunking Strategy
- **Hierarchical Chunking**:
  - Level 0: Repository metadata
  - Level 1: File document record (SHA-256 hash, line count, language)
  - Level 2: Classes / Functions / Sections (parent chunks)
  - Level 3: Code blocks / Paragraphs (child chunks, max 500 tokens, 50-token overlap)
- **Metadata tagging**: Attach `filePath`, `startLine`, `endLine`, `functionName`, `className`, and `imports` to every chunk for precise citation resolution.

## 2. BGE-M3 & Vector Search
- Dense embeddings generated via HuggingFace TEI embedding container (1024-dim).
- MongoDB Atlas Vector Search index configured on `chunks.embedding` using cosine distance with 1024 dimensions.

## 3. Hybrid BM25 + Vector Fusion (RRF)
- Reciprocal Rank Fusion formula:
  $$RRF(d) = \alpha_{BM25} \cdot \frac{1}{k + r_{BM25}(d)} + \alpha_{Vector} \cdot \frac{1}{k + r_{Vector}(d)}$$
  where $k=60$, $\alpha_{BM25}=0.4$, $\alpha_{Vector}=0.6$.

## 4. Cross-Encoder Reranker
- `BAAI/bge-reranker-v2-m3` rescores the top-50 RRF candidates to select the final top-10 chunks.
