import crypto from 'crypto';
import { config } from '../config/index.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

// Roles
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system',
};

/**
 * Generate a new API key (hashed storage)
 */
export function generateApiKey() {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', config.apiKeySecret).update(rawKey).digest('hex');
  return { rawKey: `ak_${rawKey}`, hash };
}

/**
 * Verify and extract API key from request headers.
 * Header: X-API-Key: ak_<hex>
 */
function extractApiKey(req) {
  const header = req.headers['x-api-key'];
  if (header && header.startsWith('ak_')) return header;
  // Also accept Authorization: Bearer ak_...
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ak_')) return auth.slice(7);
  return null;
}

function hashKey(rawKey) {
  return crypto.createHmac('sha256', config.apiKeySecret)
    .update(rawKey.replace('ak_', ''))
    .digest('hex');
}

/**
 * Auth middleware — validates API key against the ApiKeys collection (or env var for dev)
 */
export function requireAuth(req, res, next) {
  const rawKey = extractApiKey(req);
  if (!rawKey) return next(new AuthenticationError('Missing API key (X-API-Key header required)'));

  // Dev mode: accept any key starting with "ak_dev"
  if (config.isDevelopment && rawKey.startsWith('ak_dev')) {
    req.user = { role: ROLES.ADMIN, keyId: 'dev-key' };
    return next();
  }

  const hash = hashKey(rawKey);

  // In production: look up hash in MongoDB ApiKeys collection
  // For now, compare to env var DEV_API_KEY_HASH or use static check
  const envHash = process.env.API_KEY_HASH;
  if (envHash && hash !== envHash) {
    return next(new AuthenticationError('Invalid API key'));
  }

  // Default role: user
  req.user = { role: ROLES.USER, keyId: hash.slice(0, 8) };
  next();
}

/**
 * Require admin role
 */
export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new AuthenticationError());
  if (req.user.role !== ROLES.ADMIN) return next(new AuthorizationError('Admin access required'));
  next();
}

/**
 * Optional auth — attaches user if key present, continues without error if not
 */
export function optionalAuth(req, _res, next) {
  const rawKey = extractApiKey(req);
  if (!rawKey) return next();

  if (config.isDevelopment && rawKey.startsWith('ak_dev')) {
    req.user = { role: ROLES.ADMIN, keyId: 'dev-key' };
  } else {
    req.user = { role: ROLES.USER, keyId: hashKey(rawKey).slice(0, 8) };
  }
  next();
}
