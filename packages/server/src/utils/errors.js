// Typed error hierarchy for the Agentic platform

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class LLMError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'LLM_ERROR', details);
  }
}

export class RetrievalError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'RETRIEVAL_ERROR', details);
  }
}

export class SandboxError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'SANDBOX_ERROR', details);
  }
}

export class EmbeddingError extends AppError {
  constructor(message) {
    super(message, 502, 'EMBEDDING_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message) {
    super(message, 503, 'DATABASE_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}
