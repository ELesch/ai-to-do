/**
 * API Type Definitions
 * Types for API requests and responses
 */

import { z } from 'zod'

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

/**
 * API error codes
 */
export enum APIErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
}

/**
 * API error response
 */
export interface APIError {
  code: APIErrorCode
  message: string
  details?: unknown
}

/**
 * Request ID header
 */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export type PaginationParams = z.infer<typeof paginationSchema>

/**
 * Sort parameters schema
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type SortParams = z.infer<typeof sortSchema>

/**
 * Common query parameters
 */
export interface QueryParams extends PaginationParams, SortParams {
  search?: string
}

/**
 * Batch operation request
 */
export interface BatchRequest<T> {
  operations: Array<{
    action: 'create' | 'update' | 'delete'
    id?: string
    data?: T
  }>
}

/**
 * Batch operation response
 */
export interface BatchResponse {
  results: Array<{
    success: boolean
    id?: string
    error?: string
  }>
  successCount: number
  errorCount: number
}

/**
 * WebSocket event types
 */
export type WebSocketEventType =
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'ai:message'
  | 'notification'

/**
 * WebSocket event
 */
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType
  payload: T
  timestamp: string
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: 'up' | 'down'
    redis: 'up' | 'down'
    ai: 'up' | 'down'
  }
  version: string
}
