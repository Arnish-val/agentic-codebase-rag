import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';

/**
 * Create a rate limiter middleware with configurable options.
 * Falls back to in-memory store (no Redis dependency required).
 */
export function createRateLimiter({ max, windowMs, keyGenerator, skipFailedRequests = false } = {}) {
  return rateLimit({
    windowMs: windowMs ?? config.rateLimitWindowMs,
    max: max ?? config.rateLimitMaxGeneral,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests,
    keyGenerator: keyGenerator ?? ((req) => req.user?.keyId ?? req.ip),
    handler: (_req, _res, next) => {
      next(new RateLimitError('Rate limit exceeded. Please slow down your requests.'));
    },
  });
}

// Prebuilt limiters
export const queryRateLimiter = createRateLimiter({ max: config.rateLimitMaxQuery });
export const adminRateLimiter = createRateLimiter({ max: config.rateLimitMaxAdmin });
