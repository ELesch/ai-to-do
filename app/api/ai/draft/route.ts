/**
 * AI Draft API Route
 * Handles AI-assisted content drafting operations
 *
 * POST /api/ai/draft - Generate, improve, expand, or summarize content
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { aiContext, tasks } from '@/lib/db/schema'
import { aiService } from '@/services/ai.service'
import { eq, and, desc } from 'drizzle-orm'
import {
  AIConfigError,
  AIServiceError,
  AIRateLimitError,
} from '@/lib/ai/providers/anthropic'

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const draftActionSchema = z.enum(['generate', 'improve', 'expand', 'summarize'])

const taskContextSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
})

const draftRequestSchema = z.object({
  action: draftActionSchema,
  taskId: z.string().uuid(),
  taskContext: taskContextSchema.optional(),
  content: z.string().optional(),
  selectedText: z.string().optional(),
})

export type DraftRequest = z.infer<typeof draftRequestSchema>

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Verify that a task belongs to the user
 */
async function verifyTaskOwnership(
  taskId: string,
  userId: string
): Promise<boolean> {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    columns: { id: true },
  })
  return !!task
}

/**
 * Get task details for context
 */
async function getTaskDetails(taskId: string, userId: string) {
  return db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    columns: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      dueDate: true,
    },
  })
}

/**
 * Save the draft to ai_context table
 */
async function saveDraftToContext(
  taskId: string,
  content: string,
  action: string,
  version?: number
): Promise<void> {
  // Check for existing current draft
  const existingDraft = await db.query.aiContext.findFirst({
    where: and(
      eq(aiContext.taskId, taskId),
      eq(aiContext.type, 'draft'),
      eq(aiContext.isCurrent, true)
    ),
  })

  if (existingDraft) {
    // Mark existing as not current
    await db
      .update(aiContext)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(aiContext.id, existingDraft.id))

    // Create new version
    await db.insert(aiContext).values({
      taskId,
      type: 'draft',
      title: `AI Draft (${action})`,
      content,
      version: (existingDraft.version ?? 1) + 1,
      isCurrent: true,
      metadata: {
        draftType: 'general',
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
    })
  } else {
    // Create first version
    await db.insert(aiContext).values({
      taskId,
      type: 'draft',
      title: `AI Draft (${action})`,
      content,
      version: 1,
      isCurrent: true,
      metadata: {
        draftType: 'general',
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
    })
  }
}

/**
 * Generate prompt for each action type
 */
function buildPrompt(
  action: string,
  taskContext: { title?: string; description?: string } | undefined,
  content: string | undefined,
  selectedText: string | undefined
): string {
  const taskInfo = taskContext
    ? `Task: ${taskContext.title || 'Untitled'}\nDescription: ${taskContext.description || 'No description'}`
    : ''

  switch (action) {
    case 'generate':
      return `Create a comprehensive draft document for the following task. The draft should be well-structured, professional, and actionable.

${taskInfo}

Please generate a complete draft that addresses this task. Include:
- Clear structure with sections if appropriate
- Actionable content
- Professional tone
- Relevant details based on the task context`

    case 'improve':
      const textToImprove = selectedText || content || ''
      return `Improve the following text to make it clearer, more professional, and more effective. Maintain the original meaning and intent.

${taskInfo}

Text to improve:
"""
${textToImprove}
"""

Please provide an improved version that:
- Enhances clarity and readability
- Improves grammar and style
- Maintains the original intent
- Uses more professional language where appropriate`

    case 'expand':
      const textToExpand = selectedText || content || ''
      return `Expand and elaborate on the following text, adding more detail, examples, and depth while maintaining the core message.

${taskInfo}

Text to expand:
"""
${textToExpand}
"""

Please provide an expanded version that:
- Adds relevant details and examples
- Elaborates on key points
- Provides additional context
- Maintains coherent flow with the original`

    case 'summarize':
      const textToSummarize = selectedText || content || ''
      return `Summarize the following content into a concise, clear version that captures the essential information.

${taskInfo}

Content to summarize:
"""
${textToSummarize}
"""

Please provide a summary that:
- Captures the key points
- Is significantly shorter than the original
- Maintains accuracy
- Is easy to scan and understand`

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// =============================================================================
// POST /api/ai/draft
// =============================================================================

/**
 * POST /api/ai/draft - Perform AI drafting operations
 *
 * Request Body:
 * - action: 'generate' | 'improve' | 'expand' | 'summarize'
 * - taskId: string (required) - UUID of the task
 * - taskContext: { title?: string, description?: string } (optional)
 * - content: string (optional) - Current editor content
 * - selectedText: string (optional) - Selected text to operate on
 *
 * Response:
 * - { success: true, data: { content: string, action: string } }
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
    const validatedData = draftRequestSchema.parse(body)

    const { action, taskId, taskContext, content, selectedText } = validatedData

    // Verify task ownership
    const isOwner = await verifyTaskOwnership(taskId, user.id)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    // Get full task context if not provided
    let fullTaskContext = taskContext
    if (!fullTaskContext?.title) {
      const task = await getTaskDetails(taskId, user.id)
      if (task) {
        fullTaskContext = {
          title: task.title,
          description: task.description ?? undefined,
        }
      }
    }

    // Build the prompt based on action
    const prompt = buildPrompt(action, fullTaskContext, content, selectedText)

    // Call AI service to generate content
    const draftType = action === 'generate' ? 'general' : 'general'
    const result = await aiService.draft(user.id, taskId, draftType, prompt)

    if (!result.draft) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate draft content' },
        { status: 500 }
      )
    }

    // Save the generated content to ai_context with versioning
    await saveDraftToContext(taskId, result.draft, action)

    return NextResponse.json({
      success: true,
      data: {
        content: result.draft,
        action,
        suggestions: result.suggestions,
      },
    })
  } catch (error) {
    console.error('Error in AI draft endpoint:', error)

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

    if (error instanceof AIConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please check your API keys.',
        },
        { status: 503 }
      )
    }

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      )
    }

    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { success: false, error: `AI service error: ${error.message}` },
        { status: error.statusCode ?? 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
