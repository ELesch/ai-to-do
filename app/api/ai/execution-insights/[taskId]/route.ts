/**
 * AI Execution Insights API Route
 * GET /api/ai/execution-insights/[taskId] - Get execution history and insights for a task
 *
 * Features:
 * - Returns execution history for a specific task
 * - Provides estimation accuracy metrics
 * - Lists subtasks added during execution
 * - Shows stall events and their reasons
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, taskExecutionHistory } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// =============================================================================
// RATE LIMITING (Basic in-memory implementation)
// =============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 read requests per minute

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
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Calculate derived insights from execution history
 */
function calculateInsights(
  history: typeof taskExecutionHistory.$inferSelect | null,
  task: typeof tasks.$inferSelect
) {
  if (!history) {
    return {
      hasHistory: false,
      estimationAccuracyPercentage: null,
      wasOverEstimate: null,
      wasUnderEstimate: null,
      additionalSubtasksNeeded: 0,
      totalStallTime: 0,
      wasOnTime:
        task.dueDate && task.completedAt
          ? task.completedAt <= task.dueDate
          : null,
      suggestions: [] as string[],
    }
  }

  const accuracyRatio = history.estimationAccuracyRatio
  const estimationAccuracyPercentage = accuracyRatio
    ? Math.round(Math.min(accuracyRatio, 1 / accuracyRatio) * 100)
    : null

  const wasOverEstimate = accuracyRatio ? accuracyRatio < 1 : null
  const wasUnderEstimate = accuracyRatio ? accuracyRatio > 1 : null

  // Generate suggestions based on insights
  const suggestions: string[] = []

  if (wasUnderEstimate && accuracyRatio && accuracyRatio > 1.5) {
    suggestions.push(
      `This task took ${Math.round((accuracyRatio - 1) * 100)}% longer than estimated. Consider adding buffer time for similar tasks.`
    )
  }

  if ((history.subtasksAddedMidExecution ?? 0) > 2) {
    suggestions.push(
      `${history.subtasksAddedMidExecution} subtasks were added during execution. Future similar tasks may benefit from more upfront planning.`
    )
  }

  if ((history.totalStallTimeMinutes ?? 0) > 30) {
    suggestions.push(
      `Significant stall time detected (${history.totalStallTimeMinutes} minutes). Review blockers for patterns.`
    )
  }

  if (history.daysOverdue && history.daysOverdue > 0) {
    suggestions.push(
      `Task was ${history.daysOverdue} day(s) overdue. Consider earlier starts or adjusted due dates for similar tasks.`
    )
  }

  return {
    hasHistory: true,
    estimationAccuracyPercentage,
    wasOverEstimate,
    wasUnderEstimate,
    additionalSubtasksNeeded: history.subtasksAddedMidExecution ?? 0,
    totalStallTime: history.totalStallTimeMinutes ?? 0,
    wasOnTime: history.daysOverdue !== null ? history.daysOverdue === 0 : null,
    suggestions,
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

interface RouteParams {
  params: Promise<{
    taskId: string
  }>
}

/**
 * GET /api/ai/execution-insights/[taskId] - Get execution insights for a task
 *
 * Path Parameters:
 * - taskId: string (required) - UUID of the task
 *
 * Response:
 * - { success: true, data: { task, executionHistory, insights } }
 */
export async function GET(request: NextRequest, context: RouteParams) {
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

    // Get taskId from params
    const { taskId } = await context.params

    // Validate taskId format
    if (!taskId || !isValidUUID(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, user.id),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Get execution history if exists
    const history = await db.query.taskExecutionHistory.findFirst({
      where: and(
        eq(taskExecutionHistory.taskId, taskId),
        eq(taskExecutionHistory.userId, user.id)
      ),
    })

    // Calculate derived insights
    const insights = calculateInsights(history ?? null, task)

    // Format response
    const response = {
      success: true,
      data: {
        task: {
          id: task.id,
          title: task.title,
          status: task.status,
          estimatedMinutes: task.estimatedMinutes,
          actualMinutes: task.actualMinutes,
          dueDate: task.dueDate?.toISOString() ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
        },
        executionHistory: history
          ? {
              id: history.id,
              originalEstimatedMinutes: history.originalEstimatedMinutes,
              finalActualMinutes: history.finalActualMinutes,
              estimationAccuracyRatio: history.estimationAccuracyRatio,
              originalSubtaskCount: history.originalSubtaskCount,
              subtasksAddedMidExecution: history.subtasksAddedMidExecution,
              addedSubtaskTitles: history.addedSubtaskTitles ?? [],
              stallEvents: history.stallEvents ?? [],
              totalStallTimeMinutes: history.totalStallTimeMinutes,
              outcome: history.outcome,
              completionDate: history.completionDate?.toISOString() ?? null,
              daysOverdue: history.daysOverdue,
              taskCategory: history.taskCategory,
              keywordFingerprint: history.keywordFingerprint ?? [],
              createdAt: history.createdAt.toISOString(),
              updatedAt: history.updatedAt.toISOString(),
            }
          : null,
        insights,
      },
    }

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    })
  } catch (error) {
    console.error('AI execution insights error:', error)

    return NextResponse.json(
      { success: false, error: 'Failed to fetch execution insights' },
      { status: 500 }
    )
  }
}
