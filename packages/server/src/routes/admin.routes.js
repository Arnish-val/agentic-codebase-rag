import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { adminRateLimiter } from '../middleware/rateLimiter.js';
import { Feedback } from '../models/Feedback.js';
import { Message } from '../models/Message.js';
import { Session } from '../models/Session.js';

const router = Router();
router.use(requireAuth, requireAdmin, adminRateLimiter);

/** GET /api/v1/admin/metrics — Aggregate feedback metrics */
router.get('/metrics', async (_req, res, next) => {
  try {
    const [feedbackBreakdown, totalMessages, totalSessions, recentFeedback] = await Promise.all([
      Feedback.aggregate([
        { $group: { _id: '$feedbackType', count: { $sum: 1 } } },
      ]),
      Message.countDocuments({ role: 'user' }),
      Session.countDocuments(),
      Feedback.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const breakdown = {};
    for (const item of feedbackBreakdown) {
      breakdown[item._id] = item.count;
    }

    const totalFeedback = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const positiveRate = totalFeedback > 0
      ? ((breakdown.thumbs_up ?? 0) / totalFeedback * 100).toFixed(1)
      : null;

    res.json({
      totalMessages,
      totalSessions,
      totalFeedback,
      positiveRate: positiveRate ? `${positiveRate}%` : 'N/A',
      breakdown,
      recentFeedback,
    });
  } catch (err) { next(err); }
});

/** GET /api/v1/admin/health */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
