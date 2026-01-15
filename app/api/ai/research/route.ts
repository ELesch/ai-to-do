/**
 * AI Research API Route
 * POST /api/ai/research - Perform AI research on a topic related to a task
 *
 * Features:
 * - Task-context aware research
 * - Rate limiting per user
 * - Saves research to ai_context table
 * - Structured research response
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { aiContext, tasks } from '@/lib/db/schema'
import { aiService } from '@/services/ai.service'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Research request schema
 */
const researchRequestSchema = z.object({
  taskId: z.string().uuid(),
  query: z.string().min(1).max(2000),
  saveToContext: z.boolean().optional().default(false),
})

export type ResearchRequest = z.infer<typeof researchRequestSchema>

// =============================================================================
// RATE LIMITING (Basic in-memory implementation)
// =============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 research requests per minute (more expensive)

/**
 * Check rate limit for a user
 * Returns true if request is allowed, false if rate limited
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // Start new window
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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Verify that a task belongs to the user
 */
async function verifyTaskOwnership(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, taskId),
      eq(tasks.userId, userId),
      isNull(tasks.deletedAt)
    ),
  })
  return task
}

/**
 * Save research findings to ai_context table
 */
async function saveResearchToContext(
  taskId: string,
  query: string,
  findings: string,
  sources: string[]
) {
  // Check for existing research context and get next version
  const existingContext = await db.query.aiContext.findFirst({
    where: and(
      eq(aiContext.taskId, taskId),
      eq(aiContext.type, 'research'),
      eq(aiContext.isCurrent, true)
    ),
  })

  if (existingContext) {
    // Mark existing as not current
    await db
      .update(aiContext)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(aiContext.id, existingContext.id))
  }

  // Create new research context
  const [newContext] = await db
    .insert(aiContext)
    .values({
      taskId,
      type: 'research',
      title: `Research: ${query.slice(0, 100)}`,
      content: findings,
      version: existingContext ? (existingContext.version ?? 1) + 1 : 1,
      isCurrent: true,
      metadata: {
        sources: sources.map((source) => ({
          url: source.startsWith('http') ? source : undefined,
          title: source,
        })),
      },
    })
    .returning()

  return newContext
}

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/research - Perform AI research on a topic
 *
 * Request Body:
 * - taskId: string (required) - UUID of the task for context
 * - query: string (required) - The research question/topic
 * - saveToContext: boolean (optional) - Whether to auto-save to context
 *
 * Response:
 * - { success: true, data: { findings, sources, contextId? } }
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
          error: 'Rate limit exceeded. Research requests are limited to prevent abuse.',
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
    const validatedData = researchRequestSchema.parse(body)

    const { taskId, query, saveToContext } = validatedData

    // Verify task belongs to user
    const task = await verifyTaskOwnership(taskId, user.id)
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Perform research using AI service
    const researchResult = await aiService.research(user.id, taskId, query)

    // Optionally save to context
    let contextId: string | undefined
    if (saveToContext && researchResult.findings) {
      const savedContext = await saveResearchToContext(
        taskId,
        query,
        researchResult.findings,
        researchResult.sources
      )
      contextId = savedContext.id
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          findings: researchResult.findings,
          sources: researchResult.sources,
          contextId,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (error) {
    console.error('AI research error:', error)

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
      { success: false, error: 'Research service error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/research - Get research history for a task
 *
 * Query Parameters:
 * - taskId: string (required) - UUID of the task
 * - currentOnly: boolean (optional) - Only return current version
 *
 * Response:
 * - { success: true, data: { researches: AIContextResponse[] } }
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')
    const currentOnly = searchParams.get('currentOnly') !== 'false'

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'taskId is required' },
        { status: 400 }
      )
    }

    // Verify task belongs to user
    const task = await verifyTaskOwnership(taskId, user.id)
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Fetch research contexts
    const conditions = [
      eq(aiContext.taskId, taskId),
      eq(aiContext.type, 'research'),
    ]

    if (currentOnly) {
      conditions.push(eq(aiContext.isCurrent, true))
    }

    const researches = await db.query.aiContext.findMany({
      where: and(...conditions),
      orderBy: (aiContext, { desc }) => [desc(aiContext.updatedAt)],
    })

    return NextResponse.json({
      success: true,
      data: {
        researches: researches.map((r) => ({
          id: r.id,
          taskId: r.taskId,
          type: r.type,
          title: r.title,
          content: r.content,
          version: r.version ?? 1,
          isCurrent: r.isCurrent ?? true,
          metadata: r.metadata,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching research history:', error)

    return NextResponse.json(
      { success: false, error: 'Failed to fetch research history' },
      { status: 500 }
    )
  }
}
