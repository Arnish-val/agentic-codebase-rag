import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { requireAuth } from '../middleware/auth.js';
import { queryRateLimiter } from '../middleware/rateLimiter.js';
import { initSSE, sendSSEEvent, sendSession, sendStatus, sendDone, sendSSEError } from '../utils/sse.js';
import { ValidationError } from '../utils/errors.js';
import { Session } from '../models/Session.js';
import { Message } from '../models/Message.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation rules
const queryValidation = [
  body('query')
    .isString().withMessage('query must be a string')
    .trim()
    .isLength({ min: 1, max: 8000 }).withMessage('query must be 1–8000 characters')
    // Basic prompt injection mitigation — reject queries with embedded system instructions
    .not().matches(/^\s*<\s*(system|instructions?)\s*>/i).withMessage('Invalid query format'),
  body('session_id')
    .optional()
    .isUUID(4).withMessage('session_id must be a valid UUID v4'),
  body('options.execute_code')
    .optional()
    .isBoolean(),
  body('options.max_chunks')
    .optional()
    .isInt({ min: 1, max: 20 }),
  body('options.context_expansion')
    .optional()
    .isIn(['none', 'parent', 'siblings']),
];

/**
 * POST /api/v1/query
 * SSE streaming query endpoint
 */
router.post('/', requireAuth, queryRateLimiter, queryValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ValidationError', code: 'VALIDATION_ERROR', details: errors.array() });
  }

  const { query, options = {} } = req.body;
  let sessionId = req.body.session_id;
  const requestId = req.requestId;
  const log = logger.child({ requestId });

  // Initialize SSE
  initSSE(res);

  try {
    // Get or create session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.sessionTtlSeconds * 1000);

    let session;
    if (sessionId) {
      session = await Session.findOneAndUpdate(
        { sessionId },
        { lastActive: now, expiresAt },
        { new: true }
      );
      if (!session) {
        // Create new session with provided ID
        session = await Session.create({ sessionId, expiresAt, metadata: { ipHash: hashIp(req.ip) } });
      }
    } else {
      sessionId = uuidv4();
      session = await Session.create({
        sessionId,
        expiresAt,
        metadata: { userAgent: req.headers['user-agent']?.slice(0, 200), ipHash: hashIp(req.ip) },
      });
    }

    // Create placeholder message for this query
    const messageId = uuidv4();
    sendSession(res, sessionId, messageId);

    // Load conversation history
    const history = await Message.find({ sessionId })
      .sort({ messageIndex: 1 })
      .limit(20)
      .select('role content queryType createdAt')
      .lean();

    const userMessage = await Message.create({
      sessionId,
      messageIndex: history.length,
      role: 'user',
      content: query,
    });

    sendStatus(res, 'routing', 'Classifying your query…');

    // Forward to agent service via HTTP (agent service streams back)
    const agentPayload = {
      query,
      sessionId,
      messageId,
      userMessageId: userMessage._id.toString(),
      conversationHistory: history,
      options: {
        executeCode: options.execute_code ?? true,
        maxChunks: options.max_chunks ?? 10,
        contextExpansion: options.context_expansion ?? 'parent',
        stream: true,
      },
      requestId,
    };

    log.info({ sessionId, queryLength: query.length }, 'Forwarding query to agent service');

    // Stream agent response back through SSE
    const agentResponse = await axios.post(
      `${config.agentsUrl}/api/v1/run`,
      agentPayload,
      {
        responseType: 'stream',
        timeout: 120_000,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      }
    );

    // Pipe agent SSE events to client SSE
    agentResponse.data.on('data', (chunk) => {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    agentResponse.data.on('end', () => {
      if (!res.writableEnded) {
        res.end();
      }
    });

    agentResponse.data.on('error', (err) => {
      log.error({ err, sessionId }, 'Agent stream error');
      sendSSEError(res, 'AGENT_ERROR', 'Agent service encountered an error');
    });

  } catch (err) {
    log.error({ err }, 'Query route error');
    if (!res.writableEnded) {
      sendSSEError(res, 'INTERNAL_ERROR', err.message || 'Failed to process query');
    }
  }
});

function hashIp(ip) {
  if (!ip) return null;
  const { createHash } = await import('crypto').catch(() => ({ createHash: null }));
  if (!createHash) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export default router;
