import { StateGraph, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { routerNode } from '../nodes/router.js';
import { retrievalNode } from '../nodes/retrieval.js';
import { generationNode } from '../nodes/generation.js';
import { criticNode } from '../nodes/critic.js';
import { codeExecutionNode } from '../nodes/codeExecution.js';
import { memoryNode } from '../nodes/memory.js';
import { clarificationNode } from '../nodes/clarification.js';
import { getTransitionEdge, shouldRetrieve, shouldExecute, shouldVerify, shouldRetry } from './transitions.js';

let _graph = null;

/**
 * Build and compile the LangGraph state graph.
 * Singleton — compiled once, reused for all queries.
 */
export function buildGraph() {
  if (_graph) return _graph;

  const graph = new StateGraph(AgentStateAnnotation);

  // ── Nodes ──────────────────────────────────────────────────────────────
  graph.addNode('router', routerNode);
  graph.addNode('retrieval', retrievalNode);
  graph.addNode('generation', generationNode);
  graph.addNode('critic', criticNode);
  graph.addNode('codeExecution', codeExecutionNode);
  graph.addNode('memory', memoryNode);
  graph.addNode('clarification', clarificationNode);
  graph.addNode('fallback', fallbackNode);

  // ── Entry point ────────────────────────────────────────────────────────
  graph.setEntryPoint('router');

  // ── Edges from router ──────────────────────────────────────────────────
  graph.addConditionalEdges('router', getTransitionEdge, {
    retrieval: 'retrieval',
    clarification: 'clarification',
    fallback: 'fallback',
  });

  // ── Retrieval → Generation ─────────────────────────────────────────────
  graph.addEdge('retrieval', 'generation');

  // ── Generation → Code execution or critic ─────────────────────────────
  graph.addConditionalEdges('generation', shouldExecute, {
    codeExecution: 'codeExecution',
    critic: 'critic',
  });

  // ── Code execution → critic ────────────────────────────────────────────
  graph.addEdge('codeExecution', 'critic');

  // ── Critic → retry retrieval or memory (done) ──────────────────────────
  graph.addConditionalEdges('critic', shouldRetry, {
    retrieval: 'retrieval',  // Re-retrieve if ungrounded and retries remain
    memory: 'memory',        // Done — update memory and finish
    fallback: 'fallback',    // Max retries exceeded
  });

  // ── Clarification → END (user must re-submit) ──────────────────────────
  graph.addEdge('clarification', 'memory');

  // ── Memory → END ──────────────────────────────────────────────────────
  graph.addEdge('memory', END);
  graph.addEdge('fallback', END);

  _graph = graph.compile();
  return _graph;
}

// Fallback node — responds gracefully when retries exhausted or retrieval empty
async function fallbackNode(state) {
  const { streamCallback, reRetrievalCount } = state;
  const message = reRetrievalCount >= 3
    ? 'I was unable to find sufficiently grounded information to answer your query after multiple retrieval attempts. Please try rephrasing or providing more context.'
    : 'I could not find relevant information in the indexed repositories to answer your query.';

  if (streamCallback) {
    streamCallback('chunk', { token: message, index: 0 });
    streamCallback('done', {});
  }

  return {
    response: message,
    citations: [],
    verificationVerdict: 'ungrounded',
    done: true,
  };
}
