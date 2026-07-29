import 'dotenv/config';
import express from 'express';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { agentRouter } from './api/agentRouter.js';
import { ingestRouter } from './api/ingestRouter.js';

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'agentic-agents' }));
app.use('/api/v1/run', agentRouter);
app.use('/api/v1/ingest', ingestRouter);

app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Agent service error');
  res.status(500).json({ error: err.message });
});

const PORT = process.env.AGENTS_PORT ?? process.env.PORT ?? 3002;

async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, () => logger.info({ port: PORT }, 'Agent service started'));
  } catch (err) {
    logger.error({ err }, 'Failed to start agent service');
    process.exit(1);
  }
}

start();
