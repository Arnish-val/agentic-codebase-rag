import { Router } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { Feedback } from '../models/Feedback.js';
import { Message } from '../models/Message.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

const feedbackValidation = [
  body('message_id').isMongoId().withMessage('message_id must be a valid MongoDB ObjectId'),
  body('session_id').isUUID(4).withMessage('session_id must be a UUID v4'),
  body('type').isIn(['thumbs_up', 'thumbs_down', 'flag_hallucination', 'flag_citation'])
    .withMessage('Invalid feedback type'),
  body('comment').optional().isString().isLength({ max: 1000 }),
  body('flagged_citation_index').optional().isInt({ min: 0, max: 50 }),
];

/** POST /api/v1/feedback */
router.post('/', requireAuth, feedbackValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ValidationError('Invalid feedback data', errors.array()));

  try {
    const { message_id, session_id, type, comment, flagged_citation_index } = req.body;

    // Verify message belongs to session
    const message = await Message.findById(message_id)
      .select('sessionId content citations')
      .lean();
    if (!message || message.sessionId !== session_id) throw new NotFoundError('Message');

    const feedback = await Feedback.create({
      messageId: message_id,
      sessionId: session_id,
      feedbackType: type,
      comment: comment?.trim(),
      flaggedCitationIndex: flagged_citation_index ?? null,
      querySnapshot: message.content?.slice(0, 500),
      sourcesSnapshot: message.citations,
    });

    res.status(201).json({ feedbackId: feedback._id, acknowledged: true });
  } catch (err) { next(err); }
});

export default router;
