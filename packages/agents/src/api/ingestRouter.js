import { Router } from 'express';
import { logger } from '../utils/logger.js';

export const ingestRouter = Router();

ingestRouter.post('/', async (req, res) => {
  const { repositoryId, cloneUrl, branch, mode } = req.body;
  logger.info({ repositoryId, cloneUrl, mode }, 'Ingestion request received in agent service');

  // Trigger ingestion asynchronously (or delegate to ingestion worker process)
  res.status(202).json({ status: 'accepted', repositoryId, mode });
});
