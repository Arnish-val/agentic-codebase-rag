import { logger } from '../utils/logger.js';

/**
 * MemoryAgent node — persists the completed conversation turn to MongoDB
 * and extracts key entities for future follow-up queries.
 */
export async function memoryNode(state) {
  const {
    sessionId, messageId, query, response, citations, executionResults,
    trace, queryType, classificationConfidence, verificationVerdict,
  } = state;
  const log = logger.child({ node: 'memory', sessionId });

  try {
    // Dynamic import to avoid circular deps between packages
    const { Message } = await import('../../../server/src/models/Message.js');

    // Find the user message to get its index
    const lastUserMsg = await Message.findOne({ sessionId, role: 'user' })
      .sort({ messageIndex: -1 })
      .select('messageIndex');

    const messageIndex = (lastUserMsg?.messageIndex ?? -1) + 1;

    // Upsert assistant message
    await Message.findOneAndUpdate(
      { sessionId, role: 'assistant', messageIndex },
      {
        sessionId,
        messageIndex,
        role: 'assistant',
        content: response,
        queryType,
        classificationConfidence,
        citations: citations?.slice(0, 20),
        executionResults: executionResults?.slice(0, 5),
        trace: trace?.slice(0, 20),
        verificationVerdict,
      },
      { upsert: true, new: true }
    );

    log.info({ sessionId, citations: citations?.length }, 'Session memory updated');

    // Stream final citation events
    if (citations?.length > 0) {
      state.streamCallback?.('citations', citations.slice(0, 20));
    }

    // Stream trace
    state.streamCallback?.('trace', { steps: trace });

    // Done
    state.streamCallback?.('done', {
      verificationVerdict,
      citationCount: citations?.length ?? 0,
    });

    return {
      done: true,
      currentNode: 'memory',
    };
  } catch (err) {
    log.error({ err }, 'Memory node failed');
    state.streamCallback?.('done', {});
    return { done: true };
  }
}
