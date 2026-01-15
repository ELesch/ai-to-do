/**
 * AI Context API Route
 * Manages AI-generated context (research, drafts, summaries, etc.) for tasks
 *
 * GET /api/ai/context - Retrieve context for a task
 * POST /api/ai/context - Save/update context for a task
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { aiContext, tasks } from '@/lib/db/schema'
import {
  aiContextQuerySchema,
  createAIContextSchema,
  type AIContextResponse,
} from '@/types/ai'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Verify that a task belongs to the user
 */
async function verifyTaskOwnership(taskId: string, userId: string): Promise<boolean> {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    columns: { id: true },
  })
  return !!task
}

/**
 * Transform database context to API response format
 */
function transformContext(ctx: typeof aiContext.$inferSelect): AIContextResponse {
  return {
    id: ctx.id,
    taskId: ctx.taskId,
    conversationId: ctx.conversationId,
    type: ctx.type,
    title: ctx.title,
    content: ctx.content,
    version: ctx.version ?? 1,
    isCurrent: ctx.isCurrent ?? true,
    metadata: ctx.metadata as AIContextResponse['metadata'],
    createdAt: ctx.createdAt.toISOString(),
    updatedAt: ctx.updatedAt.toISOString(),
  }
}

// =============================================================================
// GET /api/ai/context - Retrieve context for a task
// =============================================================================

/**
 * GET /api/ai/context - Retrieve AI context for a task
 *
 * Query Parameters:
 * - taskId: string (required) - UUID of the task
 * - type: string (optional) - Filter by context type (research, draft, etc.)
 * - currentOnly: boolean (optional, default true) - Only return current versions
 *
 * Response:
 * - { success: true, data: { contexts: AIContextResponse[] } }
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

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const rawQuery: Record<string, unknown> = {}

    const taskId = searchParams.get('taskId')
    if (taskId) rawQuery.taskId = taskId

    const type = searchParams.get('type')
    if (type) rawQuery.type = type

    const currentOnly = searchParams.get('currentOnly')
    if (currentOnly !== null) rawQuery.currentOnly = currentOnly

    const validatedQuery = aiContextQuerySchema.parse(rawQuery)

    // Verify task ownership
    const isOwner = await verifyTaskOwnership(validatedQuery.taskId, user.id)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Build query conditions
    const conditions = [eq(aiContext.taskId, validatedQuery.taskId)]

    if (validatedQuery.type) {
      conditions.push(eq(aiContext.type, validatedQuery.type))
    }

    if (validatedQuery.currentOnly) {
      conditions.push(eq(aiContext.isCurrent, true))
    }

    // Fetch contexts
    const contexts = await db
      .select()
      .from(aiContext)
      .where(and(...conditions))
      .orderBy(desc(aiContext.updatedAt))

    return NextResponse.json({
      success: true,
      data: {
        contexts: contexts.map(transformContext),
      },
    })
  } catch (error) {
    console.error('Error fetching AI context:', error)

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

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/ai/context - Save/update context for a task
// =============================================================================

/**
 * POST /api/ai/context - Save or update AI context for a task
 *
 * Request Body:
 * - taskId: string (required) - UUID of the task
 * - conversationId: string (optional) - UUID of related conversation
 * - type: string (required) - Context type (research, draft, outline, etc.)
 * - title: string (optional) - Title for the context
 * - content: string (required) - The context content
 * - metadata: object (optional) - Additional metadata
 *
 * Response:
 * - { success: true, data: { context: AIContextResponse } }
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createAIContextSchema.parse(body)

    const { taskId, conversationId, type, title, content, metadata } = validatedData

    // Verify task ownership
    const isOwner = await verifyTaskOwnership(taskId, user.id)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Check for existing current context of the same type
    const existingContext = await db.query.aiContext.findFirst({
      where: and(
        eq(aiContext.taskId, taskId),
        eq(aiContext.type, type),
        eq(aiContext.isCurrent, true)
      ),
    })

    let newContext: typeof aiContext.$inferSelect

    if (existingContext) {
      // Mark existing context as not current
      await db
        .update(aiContext)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(eq(aiContext.id, existingContext.id))

      // Create new version
      const [created] = await db
        .insert(aiContext)
        .values({
          taskId,
          conversationId: conversationId || null,
          type,
          title: title || null,
          content,
          version: (existingContext.version ?? 1) + 1,
          isCurrent: true,
          metadata: metadata || {},
        })
        .returning()

      newContext = created
    } else {
      // Create first version
      const [created] = await db
        .insert(aiContext)
        .values({
          taskId,
          conversationId: conversationId || null,
          type,
          title: title || null,
          content,
          version: 1,
          isCurrent: true,
          metadata: metadata || {},
        })
        .returning()

      newContext = created
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          context: transformContext(newContext),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving AI context:', error)

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

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
