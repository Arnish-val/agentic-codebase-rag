import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export async function connectDatabase() {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      await mongoose.connect(config.mongodbUri, {
        dbName: config.mongodbDbName,
        maxPoolSize: 20,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
      });

      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting reconnect');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return mongoose.connection;
    } catch (err) {
      attempts++;
      logger.warn({ err: err.message, attempt: attempts, maxRetries: MAX_RETRIES }, 'MongoDB connection failed');
      if (attempts >= MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempts));
    }
  }
}

export function getConnection() {
  return mongoose.connection;
}
