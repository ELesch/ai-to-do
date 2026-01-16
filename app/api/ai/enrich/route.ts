/**
 * AI Task Enrichment API Route
 * POST /api/ai/enrich - Enrich a task with AI-generated suggestions
 *
 * Features:
 * - Generates refined title, description, duration estimates
 * - Proposes subtasks with time estimates and AI capability flags
 * - Finds similar completed tasks for context
 * - Provides insights and success predictions
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskEnrichmentService } from '@/services/task-enrichment.service'
import { enrichmentRequestSchema } from '@/types/ai'
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
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 enrichment requests per minute

/**
 * Check rate limit for a user
 * Returns true if request is allowed, false if rate limited
 */
function checkRateLimit(userId: string): {
  allowed: boolean
  remaining: number
  resetIn: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // Start new window
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
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/enrich - Enrich a task with AI suggestions
 *
 * Request Body:
 * - title: string (required) - The task title to enrich
 * - description?: string - Optional task description
 * - projectId?: string - Optional project ID for context
 * - existingTags?: string[] - Optional existing tags for context
 *
 * Response:
 * - { success: true, data: { proposalId, proposal, similarTasks, insights } }
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
          error:
            'Rate limit exceeded. Enrichment requests are limited to prevent abuse.',
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
    const validatedData = enrichmentRequestSchema.parse(body)

    const { title, description, projectId, existingTags } = validatedData

    // Call task enrichment service
    const result = await taskEnrichmentService.enrichTask(user.id, {
      title,
      description,
      projectId,
      existingTags,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          proposalId: result.proposalId,
          proposal: result.proposal,
          similarTasks: result.similarTasks,
          insights: result.insights,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (error) {
    console.error('AI enrichment error:', error)

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

      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Enrichment service error' },
      { status: 500 }
    )
  }
}
