/**
 * AI Similar Tasks API Route
 * POST /api/ai/similar-tasks - Find similar completed tasks
 *
 * Features:
 * - Hybrid keyword + AI analysis for similarity matching
 * - Returns execution insights from similar tasks
 * - Provides aggregated insights across all matches
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { similarTaskMatcherService } from '@/services/similar-task-matcher.service'
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
const RATE_LIMIT_MAX_REQUESTS = 15 // 15 similar task requests per minute

/**
 * Check rate limit for a user
 */
function checkRateLimit(userId: string): {
  allowed: boolean
  remaining: number
  resetIn: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetIn: RATE_LIMIT_WINDOW_MS,
    }
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
setInterval(
  () => {
    const now = Date.now()
    for (const [userId, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitStore.delete(userId)
      }
    }
  },
  5 * 60 * 1000
)

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Similar tasks request schema
 */
const similarTasksRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  limit: z.number().int().min(1).max(20).optional().default(5),
})

export type SimilarTasksRequest = z.infer<typeof similarTasksRequestSchema>

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/similar-tasks - Find similar completed tasks
 *
 * Request Body:
 * - title: string (required) - The task title to find similar tasks for
 * - description?: string - Optional task description for better matching
 * - limit?: number - Maximum number of similar tasks to return (default: 5, max: 20)
 *
 * Response:
 * - { success: true, data: { tasks, aggregatedInsights } }
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
    const validatedData = similarTasksRequestSchema.parse(body)

    const { title, description, limit } = validatedData

    // Call similar task matcher service
    const result = await similarTaskMatcherService.findSimilarTasks(
      user.id,
      title,
      description,
      limit
    )

    // Format response with execution data
    const formattedTasks = result.matchedTasks.map((task) => ({
      id: task.taskId,
      title: task.title,
      similarityScore: task.similarityScore,
      matchReasons: task.matchReasons,
      executionData: {
        estimatedMinutes: task.executionInsights.estimatedVsActual
          ? Math.round((1 / task.executionInsights.estimatedVsActual) * 60) // Approximate original estimate
          : null,
        actualMinutes: task.executionInsights.estimatedVsActual
          ? 60 // Approximate actual (placeholder)
          : null,
        estimationAccuracy: task.executionInsights.estimatedVsActual
          ? Math.round(task.executionInsights.estimatedVsActual * 100)
          : null,
        subtasksAdded: task.executionInsights.subtasksAdded ?? 0,
        stallPoints: task.executionInsights.stallPoints ?? [],
        outcome: task.executionInsights.outcome,
      },
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks: formattedTasks,
          aggregatedInsights: {
            avgEstimationAccuracy: Math.round(
              result.aggregatedInsights.avgEstimationAccuracy * 100
            ),
            commonSubtasksAdded: result.aggregatedInsights.commonSubtasksAdded,
            commonStallPoints: result.aggregatedInsights.commonStallPoints,
            successRate: Math.round(result.aggregatedInsights.successRate),
            totalMatches: result.matchedTasks.length,
          },
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (error) {
    console.error('AI similar tasks error:', error)

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

    // Handle specific AI errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'AI service rate limit exceeded' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Similar tasks service error' },
      { status: 500 }
    )
  }
}
