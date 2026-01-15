/**
 * Standardized API Response Helpers
 * Provides consistent response formatting and error handling for API routes
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { formatZodError } from '@/lib/validation'

// =============================================================================
// TYPES
// =============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: Array<{
    path: string
    message: string
    code: string
  }>
  retryAfter?: number
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    } satisfies ApiSuccessResponse<T>,
    { status }
  )
}

/**
 * Create a 201 Created response
 */
export function createdResponse<T>(data: T): NextResponse {
  return successResponse(data, 201)
}

/**
 * Create a 204 No Content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: ApiErrorResponse['details']
): NextResponse {
  const body: ApiErrorResponse = {
    success: false,
    error,
  }

  if (details) {
    body.details = details
  }

  return NextResponse.json(body, { status })
}

/**
 * 400 Bad Request
 */
export function badRequestResponse(
  message: string = 'Bad request',
  details?: ApiErrorResponse['details']
): NextResponse {
  return errorResponse(message, 400, details)
}

/**
 * 401 Unauthorized
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return errorResponse(message, 401)
}

/**
 * 403 Forbidden
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return errorResponse(message, 403)
}

/**
 * 404 Not Found
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404)
}

/**
 * 409 Conflict
 */
export function conflictResponse(message: string = 'Conflict'): NextResponse {
  return errorResponse(message, 409)
}

/**
 * 422 Unprocessable Entity
 */
export function unprocessableResponse(
  message: string = 'Unprocessable entity',
  details?: ApiErrorResponse['details']
): NextResponse {
  return errorResponse(message, 422, details)
}

/**
 * 429 Too Many Requests
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      retryAfter,
    } satisfies ApiErrorResponse,
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  )
}

/**
 * 500 Internal Server Error
 */
export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
  return errorResponse(message, 500)
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailableResponse(message: string = 'Service temporarily unavailable'): NextResponse {
  return errorResponse(message, 503)
}

// =============================================================================
// VALIDATION ERROR RESPONSE
// =============================================================================

/**
 * Create a validation error response from Zod error
 */
export function validationErrorResponse(error: z.ZodError): NextResponse {
  return badRequestResponse('Validation error', formatZodError(error))
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Known error messages and their corresponding responses
 */
const ERROR_HANDLERS: Record<string, (msg: string) => NextResponse> = {
  'Task not found': () => notFoundResponse('Task'),
  'Project not found': () => notFoundResponse('Project'),
  'User not found': () => notFoundResponse('User'),
  'Parent task not found': () => notFoundResponse('Parent task'),
  'Parent project not found': () => notFoundResponse('Parent project'),
  'Task cannot be its own parent': (msg) => badRequestResponse(msg),
  'Project cannot be its own parent': (msg) => badRequestResponse(msg),
  'Some tasks not found or do not belong to user': (msg) => badRequestResponse(msg),
  'Some projects not found or do not belong to user': (msg) => badRequestResponse(msg),
  'Unauthorized': () => unauthorizedResponse(),
  'Rate limit exceeded': () => rateLimitResponse(60),
  'AI rate limit exceeded': () => rateLimitResponse(60),
}

/**
 * Handle errors in a consistent way
 * Logs error and returns appropriate response
 */
export function handleApiError(error: unknown, context: string = 'API'): NextResponse {
  // Log the error
  console.error(`Error in ${context}:`, error)

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return validationErrorResponse(error)
  }

  // Handle known error messages
  if (error instanceof Error) {
    const handler = ERROR_HANDLERS[error.message]
    if (handler) {
      return handler(error.message)
    }
  }

  // Default to server error
  return serverErrorResponse()
}

// =============================================================================
// RESPONSE WITH HEADERS
// =============================================================================

/**
 * Add rate limit headers to a response
 */
export function withRateLimitHeaders(
  response: NextResponse,
  headers: {
    limit: number
    remaining: number
    reset: number
  }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(headers.limit))
  response.headers.set('X-RateLimit-Remaining', String(headers.remaining))
  response.headers.set('X-RateLimit-Reset', String(headers.reset))
  return response
}

/**
 * Add custom headers to a response
 */
export function withHeaders(
  response: NextResponse,
  headers: Record<string, string>
): NextResponse {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}
