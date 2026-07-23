import pRetry from 'p-retry';
import { logger } from './logger.js';

export async function withRetry(fn, options = {}) {
  const { retries = 3, minTimeout = 1000, factor = 2 } = options;

  return pRetry(fn, {
    retries,
    minTimeout,
    factor,
    onFailedAttempt: (error) => {
      logger.warn(
        { attempt: error.attemptNumber, retriesLeft: error.retriesLeft, err: error.message },
        'Retrying operation after failure'
      );
    },
  });
}
