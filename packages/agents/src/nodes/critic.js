import { createLLMClient } from '../utils/llmClient.js';
import { withRetry } from '../utils/retryStrategy.js';
import { logger } from '../utils/logger.js';
import { CRITIC_PROMPT, buildCriticUserPrompt } from '../prompts/critic.prompt.js';

/**
 * CriticAgent node — verifies that each factual claim in the response
 * is supported by retrieved chunks. Triggers re-retrieval if ungrounded.
 */
export async function criticNode(state) {
  const start = Date.now();
  const { response, citations, retrievedChunks, sessionId, reRetrievalCount } = state;
  const log = logger.child({ node: 'critic', sessionId });

  // Skip heavy verification if no chunks were retrieved (already fallback path)
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return { verificationVerdict: 'ungrounded', ungroundedClaims: [] };
  }

  try {
    const llm = createLLMClient({ model: 'generation', responseFormat: 'json_object' });

    const userPrompt = buildCriticUserPrompt({ response, chunks: retrievedChunks, citations });

    const result = await withRetry(() =>
      llm.invoke([
        { role: 'system', content: CRITIC_PROMPT },
        { role: 'user', content: userPrompt },
      ])
    );

    let parsed;
    try {
      const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      parsed = JSON.parse(content);
    } catch {
      log.warn('Critic JSON parse failed, defaulting to grounded');
      parsed = { verdict: 'grounded', ungrounded_claims: [], confidence: 0.8 };
    }

    const verdict = parsed.verdict ?? 'grounded';
    const ungroundedClaims = parsed.ungrounded_claims ?? [];
    const duration = Date.now() - start;

    log.info({ verdict, ungroundedClaims: ungroundedClaims.length, reRetrievalCount, duration }, 'Verification complete');

    // Increment re-retrieval count only when we're sending back for retry
    const newRetryCount = verdict === 'ungrounded' ? reRetrievalCount + 1 : reRetrievalCount;

    return {
      verificationVerdict: verdict,
      ungroundedClaims,
      reRetrievalCount: newRetryCount,
      currentNode: 'critic',
      trace: [{
        step: 'verify',
        agent: 'CriticAgent',
        durationMs: duration,
        inputSummary: `${response.length} chars, ${citations.length} citations`,
        outputSummary: `verdict=${verdict}, ungrounded=${ungroundedClaims.length}`,
        metadata: { verdict, ungroundedClaims, confidence: parsed.confidence },
      }],
    };
  } catch (err) {
    log.error({ err }, 'Critic node failed — defaulting to partially_grounded');
    return {
      verificationVerdict: 'partially_grounded',
      ungroundedClaims: [],
      trace: [{ step: 'verify', agent: 'CriticAgent', durationMs: Date.now() - start, outputSummary: `Error: ${err.message}` }],
    };
  }
}
