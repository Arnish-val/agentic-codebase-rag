import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentic';
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'agentic',
  });
  logger.info('Agent service database connected');
}
