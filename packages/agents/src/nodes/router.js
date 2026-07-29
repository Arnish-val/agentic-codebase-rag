import { createLLMClient } from '../utils/llmClient.js';
import { withRetry } from '../utils/retryStrategy.js';
import { logger } from '../utils/logger.js';
import { ROUTER_PROMPT } from '../prompts/router.prompt.js';

/**
 * RouterAgent node — classifies query into type and reformulates for retrieval.
 *
 * Output: queryType, classificationConfidence, reformulatedQuery, subQueries (for multi-hop)
 */
export async function routerNode(state) {
  const start = Date.now();
  const { query, conversationHistory, sessionId } = state;
  const log = logger.child({ node: 'router', sessionId });

  try {
    const llm = createLLMClient({ model: 'router', responseFormat: 'json_object' });

    const historyContext = conversationHistory
      .slice(-4) // Last 4 messages for context
      .map(m => `${m.role}: ${m.content?.slice(0, 200)}`)
      .join('\n');

    const response = await withRetry(() =>
      llm.invoke([
        { role: 'system', content: ROUTER_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            query,
            conversation_history: historyContext || 'None',
          }),
        },
      ])
    );

    let parsed;
    try {
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
      parsed = JSON.parse(content);
    } catch {
      log.warn('Failed to parse router JSON, defaulting to factual');
      parsed = { type: 'factual', confidence: 0.6, reformulated_query: query, sub_queries: [] };
    }

    const duration = Date.now() - start;
    log.info({ queryType: parsed.type, confidence: parsed.confidence, duration }, 'Query classified');

    // Emit status via stream callback
    state.streamCallback?.('status', { step: 'routing', message: `Query classified as ${parsed.type}` });

    return {
      queryType: parsed.type ?? 'factual',
      classificationConfidence: parsed.confidence ?? 0.7,
      reformulatedQuery: parsed.reformulated_query ?? query,
      subQueries: parsed.sub_queries ?? [],
      currentNode: 'router',
      trace: [{
        step: 'route',
        agent: 'RouterAgent',
        durationMs: duration,
        inputSummary: query.slice(0, 100),
        outputSummary: `type=${parsed.type}, confidence=${parsed.confidence}`,
        metadata: { type: parsed.type, confidence: parsed.confidence },
      }],
    };
  } catch (err) {
    log.error({ err }, 'Router node failed');
    return { error: err, queryType: 'factual', classificationConfidence: 0.5, reformulatedQuery: query };
  }
}
