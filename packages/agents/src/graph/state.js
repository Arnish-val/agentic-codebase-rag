import { Annotation } from '@langchain/langgraph';

/**
 * LangGraph state schema for the Agentic query pipeline.
 * All agent nodes read from and write to this shared state.
 */
export const AgentStateAnnotation = Annotation.Root({
  // ── Input ────────────────────────────────────────────────────────────
  query: Annotation({ reducer: (_, b) => b }),
  sessionId: Annotation({ reducer: (_, b) => b }),
  messageId: Annotation({ reducer: (_, b) => b }),
  userMessageId: Annotation({ reducer: (_, b) => b }),
  conversationHistory: Annotation({ reducer: (_, b) => b, default: () => [] }),
  requestId: Annotation({ reducer: (_, b) => b }),
  options: Annotation({ reducer: (_, b) => b, default: () => ({}) }),

  // ── Router output ─────────────────────────────────────────────────────
  queryType: Annotation({ reducer: (_, b) => b }),
  // "factual" | "multi_hop" | "codegen" | "comparison" | "ambiguous"
  classificationConfidence: Annotation({ reducer: (_, b) => b }),
  reformulatedQuery: Annotation({ reducer: (_, b) => b }),
  subQueries: Annotation({ reducer: (_, b) => b, default: () => [] }),  // For multi-hop

  // ── Retrieval output ──────────────────────────────────────────────────
  retrievedChunks: Annotation({ reducer: (_, b) => b, default: () => [] }),
  retrievalMetadata: Annotation({ reducer: (_, b) => b, default: () => ({}) }),

  // ── Generation output ─────────────────────────────────────────────────
  response: Annotation({ reducer: (_, b) => b, default: () => '' }),
  citations: Annotation({ reducer: (_, b) => b, default: () => [] }),
  codeBlocks: Annotation({ reducer: (_, b) => b, default: () => [] }),
  streamCallback: Annotation({ reducer: (_, b) => b }),  // SSE write function

  // ── Verification output ───────────────────────────────────────────────
  verificationVerdict: Annotation({ reducer: (_, b) => b }),
  // "grounded" | "partially_grounded" | "ungrounded"
  ungroundedClaims: Annotation({ reducer: (_, b) => b, default: () => [] }),
  reRetrievalCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),

  // ── Code execution output ─────────────────────────────────────────────
  executionResults: Annotation({ reducer: (_, b) => b, default: () => [] }),

  // ── Memory output ─────────────────────────────────────────────────────
  sessionUpdate: Annotation({ reducer: (_, b) => b }),
  extractedEntities: Annotation({ reducer: (_, b) => b, default: () => [] }),

  // ── Trace ─────────────────────────────────────────────────────────────
  trace: Annotation({
    reducer: (existing, newStep) => {
      if (Array.isArray(newStep)) return [...(existing ?? []), ...newStep];
      return [...(existing ?? []), newStep];
    },
    default: () => [],
  }),

  // ── Control flow ──────────────────────────────────────────────────────
  currentNode: Annotation({ reducer: (_, b) => b }),
  error: Annotation({ reducer: (_, b) => b, default: () => null }),
  shouldStream: Annotation({ reducer: (_, b) => b, default: () => true }),
  done: Annotation({ reducer: (_, b) => b, default: () => false }),
});
