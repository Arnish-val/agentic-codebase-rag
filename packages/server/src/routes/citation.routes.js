import { Router } from 'express';
import { param } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import { Chunk } from '../models/Chunk.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/v1/citations/:chunk_id
 * Resolve a citation to its source chunk with parent context
 */
router.get('/:chunkId', requireAuth, [
  param('chunkId').isMongoId().withMessage('Invalid chunk ID'),
], async (req, res, next) => {
  try {
    const chunk = await Chunk.findById(req.params.chunkId).lean();
    if (!chunk) throw new NotFoundError('Citation');

    let parentContent = null;
    if (chunk.parentChunkId) {
      const parent = await Chunk.findById(chunk.parentChunkId).select('content chunkType').lean();
      parentContent = parent?.content ?? null;
    }

    res.json({
      chunkId: chunk._id,
      filePath: chunk.filePath,
      language: chunk.language,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content,
      chunkType: chunk.chunkType,
      codeMetadata: chunk.codeMetadata,
      parentContent,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
