/**
 * Custom Error Classes
 * 
 * Typed error hierarchy for structured error handling.
 * Each error class carries a `code` for programmatic matching
 * and an optional `cause` for error chaining.
 * 
 * @module lib/errors
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500, cause?: Error) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a required environment variable is missing or invalid */
export class ConfigurationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', 500, cause);
    this.name = 'ConfigurationError';
  }
}

/** Thrown when MongoDB operations fail */
export class DatabaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'DATABASE_ERROR', 503, cause);
    this.name = 'DatabaseError';
  }
}

/** Thrown when Nvidia NIM API calls fail */
export class NvidiaApiError extends AppError {
  public readonly retryable: boolean;

  constructor(message: string, statusCode: number = 502, retryable: boolean = false, cause?: Error) {
    super(message, 'NVIDIA_API_ERROR', statusCode, cause);
    this.name = 'NvidiaApiError';
    this.retryable = retryable;
  }
}

/** Thrown when rate limit (429) is hit on Nvidia API */
export class RateLimitError extends NvidiaApiError {
  public readonly retryAfterMs: number | null;

  constructor(retryAfterMs: number | null = null, cause?: Error) {
    super(
      `Rate limit exceeded. ${retryAfterMs ? `Retry after ${retryAfterMs}ms` : 'Please wait.'}`,
      429,
      true,
      cause
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** Thrown when embedding generation fails */
export class EmbeddingError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'EMBEDDING_ERROR', 502, cause);
    this.name = 'EmbeddingError';
  }
}

/** Thrown when vector search returns no results */
export class NoResultsError extends AppError {
  constructor(message: string = 'No matching products found for the given query.') {
    super(message, 'NO_RESULTS', 404);
    this.name = 'NoResultsError';
  }
}

/** Thrown when request validation fails */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/** Thrown when max retries are exhausted */
export class MaxRetriesExhaustedError extends AppError {
  public readonly attempts: number;

  constructor(attempts: number, cause?: Error) {
    super(
      `Operation failed after ${attempts} attempts. Last error: ${cause?.message ?? 'unknown'}`,
      'MAX_RETRIES_EXHAUSTED',
      503,
      cause
    );
    this.name = 'MaxRetriesExhaustedError';
    this.attempts = attempts;
  }
}

import { createLogger } from '@/lib/logger';
const log = createLogger('ErrorHandler');

export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    log.error(`${error.name}: ${error.message}`, { code: error.code, statusCode: error.statusCode });
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const err = error instanceof Error ? error : new Error(String(error));
  log.error('Unexpected error in chat route', { error: err.message, stack: err.stack });

  return new Response(JSON.stringify({ error: 'An internal server error occurred.', code: 'INTERNAL_ERROR' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
