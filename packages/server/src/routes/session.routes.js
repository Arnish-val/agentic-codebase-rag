import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { Session } from '../models/Session.js';
import { Message } from '../models/Message.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { config } from '../config/index.js';

const router = Router();

/** POST /api/v1/sessions — Create new session */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);
    const session = await Session.create({
      sessionId,
      expiresAt,
      metadata: { userAgent: req.headers['user-agent']?.slice(0, 200) },
    });
    res.status(201).json({ sessionId: session.sessionId, expiresAt: session.expiresAt, createdAt: session.createdAt });
  } catch (err) { next(err); }
});

/** GET /api/v1/sessions/:sessionId/messages — Get conversation history */
router.get('/:sessionId/messages', requireAuth, [
  param('sessionId').isUUID(4),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ValidationError('Invalid parameters', errors.array()));
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit ?? '50');
    const offset = parseInt(req.query.offset ?? '0');

    const session = await Session.findOne({ sessionId }).lean();
    if (!session) throw new NotFoundError('Session');

    const [messages, total] = await Promise.all([
      Message.find({ sessionId })
        .sort({ messageIndex: 1 })
        .skip(offset)
        .limit(limit)
        .select('-trace') // trace is large — load separately
        .lean(),
      Message.countDocuments({ sessionId }),
    ]);

    res.json({ sessionId, messages, total, limit, offset });
  } catch (err) { next(err); }
});

/** GET /api/v1/sessions/:sessionId/messages/:messageId/trace */
router.get('/:sessionId/messages/:messageId/trace', requireAuth, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId)
      .select('sessionId trace')
      .lean();
    if (!message || message.sessionId !== req.params.sessionId) throw new NotFoundError('Message');
    res.json({ messageId: req.params.messageId, trace: message.trace ?? [] });
  } catch (err) { next(err); }
});

/** DELETE /api/v1/sessions/:sessionId — End session */
router.delete('/:sessionId', requireAuth, [
  param('sessionId').isUUID(4),
], async (req, res, next) => {
  try {
    const result = await Session.deleteOne({ sessionId: req.params.sessionId });
    if (result.deletedCount === 0) throw new NotFoundError('Session');
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
