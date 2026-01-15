/**
 * AI Chat API Route
 * POST /api/ai/chat - Send message to AI assistant with streaming support
 *
 * Features:
 * - Task-context aware conversations
 * - Rate limiting per user (basic in-memory)
 * - Conversation history support
 * - Server-Sent Events streaming
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { aiConversations, aiMessages, tasks } from '@/lib/db/schema'
import { aiClient, AIRateLimitError } from '@/lib/ai/client'
import { getSystemPrompt } from '@/lib/ai/prompts'
import { chatRequestSchema, type StreamEvent } from '@/types/ai'
import { eq, and } from 'drizzle-orm'
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
const RATE_LIMIT_MAX_REQUESTS = 20 // 20 requests per minute

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
 * Create a Server-Sent Events encoder
 */
function createSSEEncoder() {
  const encoder = new TextEncoder()
  return {
    encode: (event: StreamEvent): Uint8Array => {
      const data = JSON.stringify(event)
      return encoder.encode(`data: ${data}\n\n`)
    },
    encodeError: (message: string): Uint8Array => {
      const event: StreamEvent = { type: 'error', error: message }
      const data = JSON.stringify(event)
      return encoder.encode(`data: ${data}\n\n`)
    },
  }
}

/**
 * Get or create a conversation for the chat
 */
async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
  taskId?: string,
  projectId?: string,
  conversationType: string = 'general'
) {
  // If conversationId provided, try to fetch it
  if (conversationId) {
    const existing = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      ),
    })
    if (existing) {
      return existing
    }
  }

  // Create new conversation
  const [newConversation] = await db
    .insert(aiConversations)
    .values({
      userId,
      taskId: taskId || null,
      projectId: projectId || null,
      type: conversationType as 'general' | 'decompose' | 'research' | 'draft' | 'planning' | 'coaching',
      title: null,
      messageCount: 0,
      totalTokens: 0,
    })
    .returning()

  return newConversation
}

/**
 * Get task context for the conversation
 */
async function getTaskContext(taskId: string, userId: string) {
  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    with: {
      subtasks: true,
    },
  })
  return task
}

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * POST /api/ai/chat - AI conversation with streaming support
 *
 * Request Body:
 * - message: string (required) - The user's message
 * - taskId?: string - UUID of task for context
 * - projectId?: string - UUID of project for context
 * - conversationId?: string - UUID of existing conversation to continue
 * - conversationType?: string - Type of conversation (general, decompose, etc.)
 * - conversationHistory?: array - Previous messages for context
 * - stream?: boolean - Whether to stream the response (default: true)
 *
 * Response (streaming):
 * - Server-Sent Events with StreamEvent objects
 *
 * Response (non-streaming):
 * - { success: true, data: { response, conversationId, usage } }
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
    const validatedData = chatRequestSchema.parse(body)

    const {
      message,
      taskId,
      projectId,
      conversationId,
      conversationType,
      conversationHistory,
      stream,
    } = validatedData

    // Verify task belongs to user if taskId provided
    let taskContext = null
    if (taskId) {
      taskContext = await getTaskContext(taskId, user.id)
      if (!taskContext) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      user.id,
      conversationId,
      taskId,
      projectId,
      conversationType
    )

    // Build system prompt with task context
    const systemPrompt = getSystemPrompt(
      taskContext
        ? {
            title: taskContext.title,
            description: taskContext.description ?? undefined,
            priority: taskContext.priority,
            dueDate: taskContext.dueDate ?? undefined,
            status: taskContext.status,
            subtasks: taskContext.subtasks?.map((s) => ({ title: s.title })),
          }
        : undefined
    )

    // Build messages array for AI
    const messages = [
      ...(conversationHistory || []),
      { role: 'user' as const, content: message },
    ]

    // Save user message to database
    await db.insert(aiMessages).values({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    })

    // Handle streaming response
    if (stream) {
      const sseEncoder = createSSEEncoder()

      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            // Send conversation start event
            const startEvent: StreamEvent = {
              type: 'message_start',
              conversationId: conversation.id,
            }
            controller.enqueue(sseEncoder.encode(startEvent))

            // Collect the full response for saving
            let fullResponse = ''
            let totalInputTokens = 0
            let totalOutputTokens = 0

            // Stream from AI client
            try {
              for await (const chunk of aiClient.streamChat(
                messages,
                systemPrompt,
                { userId: user.id, taskId, stream: true }
              )) {
                fullResponse += chunk
                const deltaEvent: StreamEvent = {
                  type: 'content_block_delta',
                  data: chunk,
                }
                controller.enqueue(sseEncoder.encode(deltaEvent))
              }
            } catch (aiError) {
              if (aiError instanceof AIRateLimitError) {
                controller.enqueue(sseEncoder.encodeError('AI rate limit exceeded. Please try again later.'))
              } else {
                controller.enqueue(sseEncoder.encodeError('AI service temporarily unavailable.'))
              }
              controller.close()
              return
            }

            // Save assistant message to database
            await db.insert(aiMessages).values({
              conversationId: conversation.id,
              role: 'assistant',
              content: fullResponse,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
            })

            // Update conversation stats
            await db
              .update(aiConversations)
              .set({
                messageCount: (conversation.messageCount ?? 0) + 2,
                totalTokens: (conversation.totalTokens ?? 0) + totalInputTokens + totalOutputTokens,
                lastMessageAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(aiConversations.id, conversation.id))

            // Send completion event
            const stopEvent: StreamEvent = {
              type: 'message_stop',
              usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
              },
              conversationId: conversation.id,
            }
            controller.enqueue(sseEncoder.encode(stopEvent))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.enqueue(sseEncoder.encodeError('An error occurred while processing your request.'))
            controller.close()
          }
        },
      })

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      })
    }

    // Handle non-streaming response
    const aiResponse = await aiClient.chat(messages, systemPrompt, {
      userId: user.id,
      taskId,
      stream: false,
    })

    // Save assistant message to database
    await db.insert(aiMessages).values({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse.content,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
    })

    // Update conversation stats
    const currentMessageCount = conversation.messageCount ?? 0
    const currentTotalTokens = conversation.totalTokens ?? 0
    await db
      .update(aiConversations)
      .set({
        messageCount: currentMessageCount + 2,
        totalTokens:
          currentTotalTokens +
          aiResponse.usage.inputTokens +
          aiResponse.usage.outputTokens,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conversation.id))

    return NextResponse.json(
      {
        success: true,
        data: {
          response: aiResponse.content,
          conversationId: conversation.id,
          usage: aiResponse.usage,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    )
  } catch (error) {
    console.error('AI chat error:', error)

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

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { success: false, error: 'AI rate limit exceeded' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'AI service error' },
      { status: 500 }
    )
  }
}
