import { Router } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { adminRateLimiter } from '../middleware/rateLimiter.js';
import { Repository } from '../models/Repository.js';
import { Chunk } from '../models/Chunk.js';
import { Document } from '../models/Document.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import { config } from '../config/index.js';

const router = Router();
router.use(requireAuth, requireAdmin, adminRateLimiter);

const repoValidation = [
  body('clone_url')
    .isURL({ protocols: ['https', 'ssh', 'git'] })
    .withMessage('clone_url must be a valid Git URL'),
  body('branch').optional().isString().isLength({ min: 1, max: 255 }),
];

/** POST /api/v1/repositories — Add and index a repository */
router.post('/', repoValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ValidationError('Invalid repository data', errors.array()));

  try {
    const { clone_url, branch = 'main' } = req.body;
    // Derive name from URL
    const name = clone_url.replace(/\.git$/, '').split('/').slice(-2).join('/');

    const repo = await Repository.create({ name, cloneUrl: clone_url, branch });
    logger.info({ repoId: repo._id, name }, 'Repository created');

    // Trigger ingestion asynchronously
    axios.post(`${config.agentsUrl}/api/v1/ingest`, {
      repositoryId: repo._id.toString(),
      cloneUrl: clone_url,
      branch,
      mode: 'full',
    }).catch(err => logger.error({ err }, 'Failed to trigger ingestion'));

    res.status(202).json({
      repositoryId: repo._id,
      name: repo.name,
      status: repo.indexStatus,
    });
  } catch (err) { next(err); }
});

/** GET /api/v1/repositories/:id/status */
router.get('/:id/status', [param('id').isMongoId()], async (req, res, next) => {
  try {
    const repo = await Repository.findById(req.params.id).lean();
    if (!repo) throw new NotFoundError('Repository');
    const chunkCount = await Chunk.countDocuments({ documentId: { $in: await Document.find({ repositoryId: repo._id }).distinct('_id') } });
    res.json({ repositoryId: repo._id, name: repo.name, status: repo.indexStatus, stats: repo.stats, chunkCount, lastIndexedAt: repo.lastIndexedAt });
  } catch (err) { next(err); }
});

/** POST /api/v1/repositories/:id/reindex — Trigger incremental reindex */
router.post('/:id/reindex', [param('id').isMongoId()], async (req, res, next) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) throw new NotFoundError('Repository');

    await Repository.updateOne({ _id: repo._id }, { indexStatus: 'pending' });
    axios.post(`${config.agentsUrl}/api/v1/ingest`, {
      repositoryId: repo._id.toString(),
      cloneUrl: repo.cloneUrl,
      branch: repo.branch,
      mode: 'incremental',
    }).catch(err => logger.error({ err }, 'Reindex trigger failed'));

    res.status(202).json({ repositoryId: repo._id, type: 'incremental', status: 'pending' });
  } catch (err) { next(err); }
});

/** GET /api/v1/repositories — List all */
router.get('/', async (_req, res, next) => {
  try {
    const repos = await Repository.find().select('-__v').lean();
    res.json({ repositories: repos, total: repos.length });
  } catch (err) { next(err); }
});

export default router;
