/**
 * Custom Error Classes and Error Handling Utilities
 * Provides structured error handling across the application
 */

/**
 * Error codes for categorizing errors
 */
export enum ErrorCode {
  // General errors
  UNKNOWN = 'UNKNOWN',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation errors
  VALIDATION = 'VALIDATION',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD = 'REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Server errors
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Interface for error context
 */
export interface ErrorContext {
  code: ErrorCode
  severity: ErrorSeverity
  timestamp: Date
  path?: string
  userId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly timestamp: Date
  public readonly isOperational: boolean
  public readonly context?: Partial<ErrorContext>

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational = true,
    context?: Partial<ErrorContext>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.severity = severity
    this.timestamp = new Date()
    this.isOperational = isOperational
    this.context = context

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return this.message
  }

  /**
   * Serialize error for logging/transmission
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Validation error for form and input validation failures
 */
export class ValidationError extends AppError {
  public readonly field?: string
  public readonly errors: Record<string, string[]>

  constructor(
    message: string,
    errors: Record<string, string[]> = {},
    field?: string
  ) {
    super(message, ErrorCode.VALIDATION, ErrorSeverity.LOW, true)
    this.field = field
    this.errors = errors
  }

  getUserMessage(): string {
    if (this.field) {
      return `Invalid ${this.field}: ${this.message}`
    }
    return this.message
  }
}

/**
 * Authentication error for auth-related failures
 */
export class AuthError extends AppError {
  constructor(
    message = 'Authentication required',
    code: ErrorCode = ErrorCode.UNAUTHORIZED
  ) {
    super(message, code, ErrorSeverity.MEDIUM, true)
  }

  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.SESSION_EXPIRED:
        return 'Your session has expired. Please sign in again.'
      case ErrorCode.INVALID_CREDENTIALS:
        return 'Invalid email or password.'
      case ErrorCode.FORBIDDEN:
        return 'You do not have permission to perform this action.'
      default:
        return 'Please sign in to continue.'
    }
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  public readonly resource: string

  constructor(resource = 'Resource', message?: string) {
    super(
      message || `${resource} not found`,
      ErrorCode.NOT_FOUND,
      ErrorSeverity.LOW,
      true
    )
    this.resource = resource
  }

  getUserMessage(): string {
    return `The ${this.resource.toLowerCase()} you're looking for doesn't exist or has been removed.`
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends AppError {
  constructor(message = 'Network error occurred') {
    super(message, ErrorCode.NETWORK, ErrorSeverity.MEDIUM, true)
  }

  getUserMessage(): string {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }
}

/**
 * Server error for internal server failures
 */
export class ServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, ErrorCode.INTERNAL_SERVER, ErrorSeverity.HIGH, false)
  }

  getUserMessage(): string {
    return 'Something went wrong on our end. Please try again later.'
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, ErrorSeverity.MEDIUM, true)
  }

  getUserMessage(): string {
    return this.message
  }
}

/**
 * Timeout error for request timeouts
 */
export class TimeoutError extends AppError {
  constructor(message = 'Request timed out') {
    super(message, ErrorCode.TIMEOUT, ErrorSeverity.MEDIUM, true)
  }

  getUserMessage(): string {
    return 'The request took too long to complete. Please try again.'
  }
}

// ============================================================================
// Error Formatting Utilities
// ============================================================================

/**
 * Check if error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Get a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.getUserMessage()
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}

/**
 * Get the error code from any error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (isAppError(error)) {
    return error.code
  }
  return ErrorCode.UNKNOWN
}

/**
 * Format error for API response
 */
export function formatApiError(error: unknown): {
  error: string
  code: ErrorCode
  details?: Record<string, string[]>
} {
  if (error instanceof ValidationError) {
    return {
      error: error.getUserMessage(),
      code: error.code,
      details: error.errors,
    }
  }

  if (isAppError(error)) {
    return {
      error: error.getUserMessage(),
      code: error.code,
    }
  }

  return {
    error: 'An unexpected error occurred',
    code: ErrorCode.UNKNOWN,
  }
}

/**
 * Convert HTTP status code to ErrorCode
 */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_INPUT
    case 401:
      return ErrorCode.UNAUTHORIZED
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.NOT_FOUND
    case 408:
      return ErrorCode.TIMEOUT
    case 409:
      return ErrorCode.CONFLICT
    case 422:
      return ErrorCode.VALIDATION
    case 500:
      return ErrorCode.INTERNAL_SERVER
    case 503:
      return ErrorCode.SERVICE_UNAVAILABLE
    default:
      return ErrorCode.UNKNOWN
  }
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(
  status: number,
  message?: string
): AppError {
  const code = httpStatusToErrorCode(status)

  switch (code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
      return new AuthError(message, code)
    case ErrorCode.NOT_FOUND:
      return new NotFoundError('Resource', message)
    case ErrorCode.VALIDATION:
    case ErrorCode.INVALID_INPUT:
      return new ValidationError(message || 'Validation failed')
    case ErrorCode.TIMEOUT:
      return new TimeoutError(message)
    case ErrorCode.INTERNAL_SERVER:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return new ServerError(message)
    default:
      return new AppError(message || 'An error occurred', code)
  }
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Determine if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Log error to console with appropriate formatting
 * Only logs in development mode by default
 */
export function logError(
  error: unknown,
  context?: Partial<ErrorContext>,
  forceLog = false
): void {
  if (!isDevelopment && !forceLog) {
    return
  }

  const timestamp = new Date().toISOString()
  const errorData = isAppError(error) ? error.toJSON() : { error }

  console.group(`[${timestamp}] Error`)
  console.error('Error:', errorData)
  if (context) {
    console.error('Context:', context)
  }
  if (error instanceof Error && error.stack) {
    console.error('Stack:', error.stack)
  }
  console.groupEnd()
}

/**
 * Log error and return a sanitized version for the client
 */
export function handleError(
  error: unknown,
  context?: Partial<ErrorContext>
): { message: string; code: ErrorCode } {
  logError(error, context)

  return {
    message: getErrorMessage(error),
    code: getErrorCode(error),
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  onError?: (error: unknown) => void
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(error)
      onError?.(error)
      throw error
    }
  }
}

/**
 * Report error to external service (placeholder for future implementation)
 */
export function reportError(
  error: unknown,
  context?: Partial<ErrorContext>
): void {
  // Log the error locally
  logError(error, context, true)

  // TODO: Implement external error reporting service integration
  // Examples: Sentry, Bugsnag, LogRocket, etc.
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }

  if (!isDevelopment) {
    console.warn('Error reporting service not configured')
  }
}
