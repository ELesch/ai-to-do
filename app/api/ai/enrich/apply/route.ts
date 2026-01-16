/**
 * AI Enrichment Apply API Route
 * POST /api/ai/enrich/apply - Apply AI-generated enrichment to a task
 *
 * Features:
 * - Applies accepted enrichment fields to an existing task
 * - Supports user modifications to proposed values
 * - Creates suggested subtasks if accepted
 * - Updates proposal status tracking
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskEnrichmentService } from '@/services/task-enrichment.service'
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
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 apply requests per minute

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
 * Valid fields that can be accepted from an enrichment proposal
 */
const VALID_ACCEPTED_FIELDS = [
  'title',
  'description',
  'dueDate',
  'estimatedMinutes',
  'priority',
  'subtasks',
] as const

/**
 * Apply enrichment request schema
 */
const applyEnrichmentRequestSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
  proposalId: z.string().uuid('Invalid proposal ID format'),
  acceptedFields: z
    .array(z.enum(VALID_ACCEPTED_FIELDS))
    .min(0, 'acceptedFields must be an array'),
  modifications: z
    .object({
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(5000).optional(),
      dueDate: z.string().datetime().optional(),
      estimatedMinutes: z.number().int().positive().optional(),
      priority: z.enum(['high', 'medium', 'low', 'none']).optional(),
    })
    .optional(),
})

export type ApplyEnrichmentRequest = z.infer<
  typeof applyEnrichmentRequestSchema
>

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/enrich/apply - Apply enrichment proposal to a task
 *
 * Request Body:
 * - taskId: string (required) - UUID of the task to enrich
 * - proposalId: string (required) - UUID of the enrichment proposal
 * - acceptedFields: string[] (required) - Array of field names to accept
 * - modifications?: object - Optional user modifications to proposed values
 *   - title?: string
 *   - description?: string
 *   - dueDate?: string (ISO datetime)
 *   - estimatedMinutes?: number
 *   - priority?: 'high' | 'medium' | 'low' | 'none'
 *
 * Response:
 * - { success: true, data: { task } }
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
    const validatedData = applyEnrichmentRequestSchema.parse(body)

    const { taskId, proposalId, acceptedFields, modifications } = validatedData

    // Call task enrichment service to apply the enrichment
    const updatedTask = await taskEnrichmentService.applyEnrichment(
      user.id,
      taskId,
      proposalId,
      acceptedFields,
      modifications
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          task: {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            status: updatedTask.status,
            priority: updatedTask.priority,
            dueDate: updatedTask.dueDate?.toISOString() ?? null,
            estimatedMinutes: updatedTask.estimatedMinutes,
            projectId: updatedTask.projectId,
            updatedAt: updatedTask.updatedAt.toISOString(),
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
    console.error('AI apply enrichment error:', error)

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

      if (error.message === 'Enrichment proposal not found') {
        return NextResponse.json(
          { success: false, error: 'Enrichment proposal not found' },
          { status: 404 }
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
      { success: false, error: 'Failed to apply enrichment' },
      { status: 500 }
    )
  }
}
