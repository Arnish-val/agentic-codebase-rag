import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  simple(),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'agentic-server' },
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

// Child logger factory for request-scoped logging
export function createRequestLogger(requestId, sessionId) {
  return logger.child({ requestId, sessionId });
}
