/**
 * AI Do Work API Route
 * POST /api/ai/do-work - Have AI perform work on a subtask
 *
 * Features:
 * - Supports research, draft, plan, and outline work types
 * - Generates AI artifacts with content
 * - Saves artifacts for review and acceptance
 * - Provides suggested next steps
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { aiWorkService } from '@/services/ai-work.service'
import { doWorkRequestSchema } from '@/types/ai'
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
const RATE_LIMIT_MAX_REQUESTS = 5 // 5 do-work requests per minute (expensive operations)

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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate suggested next steps based on work type and content
 */
function generateSuggestedNextSteps(
  workType: string,
  content: string
): string[] {
  const suggestions: string[] = []

  switch (workType) {
    case 'research':
      suggestions.push('Review the research findings for accuracy')
      suggestions.push('Identify key action items from the research')
      if (content.includes('Recommended Next Steps')) {
        suggestions.push('Follow the recommended next steps in the research')
      }
      break
    case 'draft':
      suggestions.push('Review and edit the draft for tone and accuracy')
      suggestions.push('Personalize any placeholder content')
      suggestions.push('Send for feedback or final approval')
      break
    case 'plan':
      suggestions.push('Review the plan for feasibility')
      suggestions.push('Adjust time estimates based on your availability')
      suggestions.push('Begin with the first step in the plan')
      break
    case 'outline':
      suggestions.push('Review the outline structure')
      suggestions.push('Expand sections that need more detail')
      suggestions.push('Begin drafting content based on the outline')
      break
  }

  return suggestions
}

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/do-work - Have AI perform work on a subtask
 *
 * Request Body:
 * - taskId: string (required) - UUID of the parent task
 * - subtaskId: string (required) - UUID of the subtask to work on
 * - workType: 'research' | 'draft' | 'plan' | 'outline' (required) - Type of work to perform
 * - context?: string - Additional context for the work
 *
 * Response:
 * - { success: true, data: { artifactId, type, title, content, suggestedNextSteps } }
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
            'Rate limit exceeded. AI work requests are limited to prevent abuse.',
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
    const validatedData = doWorkRequestSchema.parse(body)

    const { taskId, subtaskId, workType, context } = validatedData

    // Check if the work type is supported
    if (!aiWorkService.canDoWork(workType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Work type '${workType}' is not supported. Supported types: research, draft, plan, outline`,
        },
        { status: 400 }
      )
    }

    // Call AI work service
    const artifact = await aiWorkService.doWork(
      user.id,
      taskId,
      subtaskId,
      workType,
      context
    )

    // Generate suggested next steps
    const suggestedNextSteps = generateSuggestedNextSteps(
      workType,
      artifact.content
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          artifactId: artifact.id,
          type: artifact.type,
          title: artifact.title,
          content: artifact.content,
          suggestedNextSteps,
          metadata: {
            aiModel: artifact.aiModel,
            aiProvider: artifact.aiProvider,
            createdAt: artifact.createdAt.toISOString(),
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
    console.error('AI do-work error:', error)

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

      if (error.message === 'Subtask not found') {
        return NextResponse.json(
          { success: false, error: 'Subtask not found' },
          { status: 404 }
        )
      }

      if (error.message.includes('Unsupported work type')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        )
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'AI service rate limit exceeded' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'AI work service error' },
      { status: 500 }
    )
  }
}
