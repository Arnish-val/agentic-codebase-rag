import { createLLMClient } from '../utils/llmClient.js';
import { withRetry } from '../utils/retryStrategy.js';
import { logger } from '../utils/logger.js';
import { GENERATION_SYSTEM_PROMPT, buildGenerationUserPrompt } from '../prompts/generation.prompt.js';

/**
 * GenerationAgent node — produces grounded response with inline citations.
 * Streams tokens via streamCallback.
 */
export async function generationNode(state) {
  const start = Date.now();
  const {
    query, reformulatedQuery, retrievedChunks, conversationHistory,
    queryType, streamCallback, sessionId, reRetrievalCount,
  } = state;
  const log = logger.child({ node: 'generation', sessionId });

  if (!retrievedChunks || retrievedChunks.length === 0) {
    log.warn('No chunks available for generation — using fallback');
    const fallback = 'I could not find relevant information to answer your query. Please try rephrasing or check that the relevant repository has been indexed.';
    streamCallback?.('chunk', { token: fallback, index: 0 });
    return { response: fallback, citations: [], codeBlocks: [] };
  }

  state.streamCallback?.('status', { step: 'generating', message: 'Generating answer…' });

  try {
    const llm = createLLMClient({ model: 'generation', streaming: true });

    const userPrompt = buildGenerationUserPrompt({
      query: reformulatedQuery ?? query,
      chunks: retrievedChunks,
      history: conversationHistory.slice(-6),
      queryType,
      isRetry: reRetrievalCount > 0,
    });

    let fullResponse = '';
    let tokenIndex = 0;
    let firstTokenMs = null;

    const stream = await withRetry(() =>
      llm.stream([
        { role: 'system', content: GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ])
    );

    for await (const chunk of stream) {
      const token = chunk.content;
      if (!token) continue;

      if (!firstTokenMs) firstTokenMs = Date.now() - start;

      fullResponse += token;
      streamCallback?.('chunk', { token, index: tokenIndex++ });
    }

    // Parse citations from response — look for [N] references
    const { citations, cleanResponse, codeBlocks } = parseResponseCitations(fullResponse, retrievedChunks);

    const duration = Date.now() - start;
    log.info({ responseLength: fullResponse.length, citations: citations.length, duration, firstTokenMs }, 'Generation complete');

    return {
      response: cleanResponse,
      citations,
      codeBlocks,
      currentNode: 'generation',
      trace: [{
        step: 'generate',
        agent: 'GenerationAgent',
        durationMs: duration,
        inputSummary: `${retrievedChunks.length} chunks, query="${query.slice(0, 80)}"`,
        outputSummary: `${fullResponse.length} chars, ${citations.length} citations`,
        metadata: { firstTokenMs, tokenCount: tokenIndex },
      }],
    };
  } catch (err) {
    log.error({ err }, 'Generation node failed');
    return { response: 'I encountered an error generating a response. Please try again.', citations: [], codeBlocks: [], error: err };
  }
}

/**
 * Parse [1], [2]... citation markers from response and map to retrieved chunks.
 * Also extract ```code``` blocks for execution.
 */
function parseResponseCitations(response, chunks) {
  const citationRegex = /\[(\d+)\]/g;
  const usedIndices = new Set();
  let match;
  while ((match = citationRegex.exec(response)) !== null) {
    usedIndices.add(parseInt(match[1], 10));
  }

  const citations = [];
  for (const idx of [...usedIndices].sort((a, b) => a - b)) {
    const chunk = chunks[idx - 1]; // 1-indexed in response
    if (chunk) {
      citations.push({
        index: idx,
        chunkId: chunk._id,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        relevanceScore: chunk._score ?? chunk.rrfScore ?? 0,
        snippet: chunk.content?.slice(0, 200),
      });
    }
  }

  // Extract code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(response)) !== null) {
    const language = codeMatch[1] || 'text';
    const code = codeMatch[2].trim();
    if (['python', 'javascript', 'js', 'shell', 'bash', 'sh'].includes(language.toLowerCase())) {
      codeBlocks.push({ language: language.toLowerCase(), code });
    }
  }

  return { citations, cleanResponse: response, codeBlocks };
}
