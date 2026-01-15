/**
 * AI Task Decomposition API Route
 * POST /api/ai/decompose - Decompose a task into subtasks using AI
 *
 * Features:
 * - Task context-aware decomposition
 * - Returns suggested subtasks with reasoning
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { aiService } from '@/services/ai.service'
import { z } from 'zod'

// =============================================================================
// RATE LIMITING (Basic in-memory implementation)
// =============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 decompose requests per minute (lower than chat)

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS }
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, remaining: 0, resetIn }
  }

  entry.count++
  const remaining = RATE_LIMIT_MAX_REQUESTS - entry.count
  const resetIn = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
  return { allowed: true, remaining, resetIn }
}

// Clean up old rate limit entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [userId, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(userId)
    }
  }
}, 5 * 60 * 1000)

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

const decomposeRequestSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
})

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/decompose - Decompose a task into subtasks
 *
 * Request Body:
 * - taskId: string (required) - UUID of the task to decompose
 *
 * Response:
 * - { success: true, data: { subtasks: string[], reasoning: string } }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + rateLimit.resetIn),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { taskId } = decomposeRequestSchema.parse(body)

    // Call AI service to decompose task
    const result = await aiService.decomposeTask(user.id, taskId)

    return NextResponse.json(
      {
        success: true,
        data: {
          subtasks: result.subtasks,
          reasoning: result.reasoning,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (error) {
    console.error('AI decompose error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Task not found') {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'AI service error' },
      { status: 500 }
    )
  }
}
