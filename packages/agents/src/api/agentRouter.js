import { Router } from 'express';
import { buildGraph } from '../graph/builder.js';
import { logger } from '../utils/logger.js';

export const agentRouter = Router();

agentRouter.post('/', async (req, res) => {
  const { query, sessionId, messageId, userMessageId, conversationHistory, options } = req.body;
  const requestId = req.headers['x-request-id'] || 'req-agent-run';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const streamCallback = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const graph = buildGraph();

    const initialState = {
      query,
      sessionId,
      messageId,
      userMessageId,
      conversationHistory: conversationHistory || [],
      requestId,
      options: options || {},
      streamCallback,
      reRetrievalCount: 0,
      shouldStream: true,
      done: false,
    };

    logger.info({ sessionId, query }, 'Starting LangGraph execution');

    await graph.invoke(initialState);
  } catch (err) {
    logger.error({ err }, 'LangGraph execution error');
    if (!res.writableEnded) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    }
  }
});
