import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';

// Routes
import queryRoutes from './routes/query.routes.js';
import citationRoutes from './routes/citation.routes.js';
import sessionRoutes from './routes/session.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import repositoryRoutes from './routes/repository.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SSE streaming compatibility
}));

app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept'],
  credentials: false,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Health check (no auth needed) ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agentic-server', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  // TODO: check DB and downstream services
  res.json({ status: 'ready' });
});

// ── API routes ────────────────────────────────────────────────────────────────
const apiRouter = express.Router();

// General rate limit on all /api routes
apiRouter.use(createRateLimiter({ max: config.rateLimitMaxGeneral }));

apiRouter.use('/query', queryRoutes);
apiRouter.use('/citations', citationRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/feedback', feedbackRoutes);
apiRouter.use('/repositories', repositoryRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api/v1', apiRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDatabase();
    logger.info('Database connected');

    const server = app.listen(config.port, () => {
      logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info({ signal }, 'Shutdown signal received');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error({ err }, 'Unhandled promise rejection');
    });

  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
