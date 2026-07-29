// Centralized configuration — all env vars validated at startup

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Required env var missing: ${key}`);
  return val;
};

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;
const num = (key, defaultValue) => parseInt(process.env[key] ?? String(defaultValue), 10);

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: num('PORT', 3001),
  agentsUrl: optional('AGENTS_URL', 'http://localhost:3002'),

  // CORS
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map(o => o.trim()),

  // MongoDB
  mongodbUri: optional('MONGODB_URI', 'mongodb://localhost:27017/agentic'),
  mongodbDbName: optional('MONGODB_DB_NAME', 'agentic'),

  // Redis
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),

  // Auth
  apiKeySecret: optional('API_KEY_SECRET', 'dev-secret-change-in-production-min-32-chars'),

  // Rate limiting
  rateLimitWindowMs: num('RATE_LIMIT_WINDOW_MS', 60000),
  rateLimitMaxQuery: num('RATE_LIMIT_MAX_QUERY', 30),
  rateLimitMaxGeneral: num('RATE_LIMIT_MAX_GENERAL', 120),
  rateLimitMaxAdmin: num('RATE_LIMIT_MAX_ADMIN', 10),

  // Session
  sessionTtlSeconds: num('SESSION_TTL_SECONDS', 86400),

  // Logging
  logLevel: optional('LOG_LEVEL', 'info'),
  logFormat: optional('LOG_FORMAT', 'json'),

  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
};

// Validate in production
if (config.isProduction) {
  required('MONGODB_URI');
  required('API_KEY_SECRET');
}
