/**
 * Security Utilities
 * Provides input sanitization, CSRF protection, rate limiting, and request validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * HTML entities to escape for preventing XSS
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Sanitize text by escaping HTML entities
 * Use this for plain text that will be displayed
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitize HTML by removing dangerous tags and attributes
 * This is a basic sanitizer - for rich HTML content, consider using DOMPurify
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, '')

  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove style tags (can contain expressions)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'link', 'meta', 'base', 'form']
  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi')
    sanitized = sanitized.replace(regex, '')
    // Also handle self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    sanitized = sanitized.replace(selfClosingRegex, '')
  })

  return sanitized
}

/**
 * Sanitize a string for use in SQL LIKE patterns
 * Escapes special characters that could be used for SQL injection
 */
export function sanitizeLikePattern(input: string): string {
  if (typeof input !== 'string') return ''
  // Escape SQL LIKE special characters
  return input.replace(/[%_\\]/g, (char) => `\\${char}`)
}

/**
 * Normalize and sanitize email addresses
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') return ''
  return input.toLowerCase().trim()
}

/**
 * Sanitize a URL, ensuring it's safe to use
 * Returns null if the URL is potentially dangerous
 */
export function sanitizeUrl(input: string): string | null {
  if (typeof input !== 'string') return null

  try {
    const url = new URL(input)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

// =============================================================================
// CSRF TOKEN VALIDATION
// =============================================================================

/**
 * Generate a cryptographically secure CSRF token
 */
export async function generateCsrfToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate a CSRF token against the expected value
 * Uses constant-time comparison to prevent timing attacks
 */
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  if (typeof token !== 'string' || typeof expectedToken !== 'string') {
    return false
  }

  if (token.length !== expectedToken.length) {
    return false
  }

  // Constant-time comparison
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i)
  }
  return result === 0
}

/**
 * CSRF validation helper for API routes
 * Checks the CSRF token from headers against session
 */
export function validateCsrfFromRequest(
  request: NextRequest,
  sessionToken: string | undefined
): boolean {
  if (!sessionToken) return false

  const headerToken = request.headers.get('x-csrf-token')
  if (!headerToken) return false

  return validateCsrfToken(headerToken, sessionToken)
}

// =============================================================================
// RATE LIMITER
// =============================================================================

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Custom key generator function */
  keyGenerator?: (request: NextRequest) => string
  /** Skip rate limiting for certain requests */
  skip?: (request: NextRequest) => boolean
}

interface RateLimitEntry {
  count: number
  windowStart: number
  blocked: boolean
  blockedUntil?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
  retryAfter?: number
}

/**
 * In-memory rate limiter with sliding window
 * For production, consider using Redis-based rate limiting
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private config: Required<RateLimitConfig>
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skip: config.skip || (() => false),
    }

    // Clean up old entries periodically
    this.startCleanup()
  }

  /**
   * Default key generator uses IP address
   */
  private defaultKeyGenerator(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    return ip
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.store.entries()) {
        // Remove entries older than 2x the window
        if (now - entry.windowStart >= this.config.windowMs * 2) {
          this.store.delete(key)
        }
      }
    }, 5 * 60 * 1000)

    // Allow Node to exit even if interval is running
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Check if a request should be rate limited
   */
  check(request: NextRequest): RateLimitResult {
    // Skip if configured
    if (this.config.skip(request)) {
      return { allowed: true, remaining: this.config.maxRequests, resetIn: 0 }
    }

    const key = this.config.keyGenerator(request)
    const now = Date.now()
    const entry = this.store.get(key)

    // No existing entry - create new
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.store.set(key, { count: 1, windowStart: now, blocked: false })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetIn: this.config.windowMs,
      }
    }

    // Check if blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.blockedUntil - now,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      }
    }

    // Increment count
    entry.count++
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const resetIn = this.config.windowMs - (now - entry.windowStart)

    // Check if rate limited
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true
      entry.blockedUntil = entry.windowStart + this.config.windowMs
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        retryAfter: Math.ceil(resetIn / 1000),
      }
    }

    return { allowed: true, remaining, resetIn }
  }

  /**
   * Apply rate limiting to a request and return appropriate response if limited
   */
  limit(request: NextRequest): NextResponse | null {
    const result = this.check(request)

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Limit': String(this.config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + result.resetIn),
          },
        }
      )
    }

    return null
  }

  /**
   * Get rate limit headers for a successful request
   */
  getHeaders(request: NextRequest): Record<string, string> {
    const result = this.check(request)
    // Decrement count since check() incremented it
    const key = this.config.keyGenerator(request)
    const entry = this.store.get(key)
    if (entry) entry.count--

    return {
      'X-RateLimit-Limit': String(this.config.maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Date.now() + result.resetIn),
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): { totalKeys: number; blockedKeys: number } {
    let blockedKeys = 0
    for (const entry of this.store.values()) {
      if (entry.blocked) blockedKeys++
    }
    return { totalKeys: this.store.size, blockedKeys }
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  /** Standard API rate limiter: 100 requests per minute */
  api: new RateLimiter({ maxRequests: 100, windowMs: 60 * 1000 }),

  /** Auth rate limiter: 10 attempts per 15 minutes */
  auth: new RateLimiter({ maxRequests: 10, windowMs: 15 * 60 * 1000 }),

  /** AI rate limiter: 20 requests per minute */
  ai: new RateLimiter({ maxRequests: 20, windowMs: 60 * 1000 }),

  /** Strict rate limiter: 5 requests per minute (for sensitive operations) */
  strict: new RateLimiter({ maxRequests: 5, windowMs: 60 * 1000 }),
}

// =============================================================================
// REQUEST VALIDATION HELPERS
// =============================================================================

/**
 * Validate and parse JSON body from request
 * Returns null if body is invalid
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON body',
        },
      ]),
    }
  }
}

/**
 * Validate query parameters from request
 */
export function parseQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const searchParams = request.nextUrl.searchParams
  const params: Record<string, string | string[]> = {}

  for (const [key, value] of searchParams.entries()) {
    const existing = params[key]
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  }

  const result = schema.safeParse(params)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Create a standardized validation error response
 */
export function validationErrorResponse(error: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation error',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    },
    { status: 400 }
  )
}

/**
 * Validate that a string is a valid UUID
 */
export function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Validate content length doesn't exceed maximum
 */
export function validateContentLength(
  request: NextRequest,
  maxBytes: number
): boolean {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) return true // Let body parsing handle it
  return parseInt(contentLength, 10) <= maxBytes
}

/**
 * Check if request has required headers
 */
export function hasRequiredHeaders(
  request: NextRequest,
  requiredHeaders: string[]
): boolean {
  return requiredHeaders.every((header) => request.headers.has(header))
}

/**
 * Validate origin for CORS
 */
export function isAllowedOrigin(
  request: NextRequest,
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true // Same-origin requests don't have origin header
  return allowedOrigins.includes(origin)
}
