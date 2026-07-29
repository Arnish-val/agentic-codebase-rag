import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export function requestLogger(req, res, next) {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, 'Request completed');
  });

  next();
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;

  if (err instanceof AppError && err.isOperational) {
    logger.warn({ err, requestId }, 'Operational error');
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    logger.warn({ err: err.message, requestId }, 'Mongoose validation error');
    return res.status(400).json({
      error: 'ValidationError',
      code: 'VALIDATION_ERROR',
      message: 'Data validation failed',
      details,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0];
    logger.warn({ err: err.message, requestId }, 'Duplicate key error');
    return res.status(409).json({
      error: 'ConflictError',
      code: 'CONFLICT',
      message: `Duplicate value for field: ${field}`,
    });
  }

  // Express body-parser error
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'PayloadTooLarge', code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' });
  }

  // Unexpected / programming error — don't leak details
  logger.error({ err, requestId, stack: err.stack }, 'Unexpected error');
  return res.status(500).json({
    error: 'InternalServerError',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
    requestId,
  });
}
