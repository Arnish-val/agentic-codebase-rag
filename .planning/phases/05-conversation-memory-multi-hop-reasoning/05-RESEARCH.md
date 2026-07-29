# Phase 5 Research: Conversation Memory & Multi-Hop Reasoning

## 1. Multi-Hop Query Decomposition
- `RouterAgent` identifies `multi_hop` queries and breaks them down into ordered `sub_queries`.
- `RetrievalAgent` executes parallel retrieval for each sub-query, deduplicates candidates by chunk ID, and merges results before cross-encoder reranking.

## 2. Conversation Memory & Anaphoric Resolution
- `RouterAgent` incorporates recent conversation history (last 4 turns) to resolve pronoun references ("it", "the auth file").
- `MemoryAgent` updates session turn counts and persists messages to MongoDB with TTL expiration.
