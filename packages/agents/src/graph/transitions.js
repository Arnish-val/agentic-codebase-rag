const MAX_RE_RETRIEVALS = 3;

/**
 * Router → next node based on query type and confidence
 */
export function getTransitionEdge(state) {
  const { queryType, classificationConfidence, error } = state;
  if (error) return 'fallback';
  if (queryType === 'ambiguous' || classificationConfidence < 0.55) return 'clarification';
  return 'retrieval';  // All concrete types go to retrieval first
}

/**
 * After generation: should we run code execution or go straight to critic?
 */
export function shouldExecute(state) {
  const { codeBlocks, options } = state;
  const hasCode = codeBlocks && codeBlocks.length > 0;
  const execEnabled = options?.executeCode !== false;
  return hasCode && execEnabled ? 'codeExecution' : 'critic';
}

/**
 * After critic: retry retrieval, finish (memory), or fallback?
 */
export function shouldRetry(state) {
  const { verificationVerdict, reRetrievalCount, error } = state;
  if (error) return 'fallback';
  if (verificationVerdict === 'grounded' || verificationVerdict === 'partially_grounded') return 'memory';
  if (reRetrievalCount >= MAX_RE_RETRIEVALS) return 'fallback';
  return 'retrieval';
}
