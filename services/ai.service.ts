/**
 * AI Service
 * Business logic for AI interactions and features
 */

import { db } from '@/lib/db'
import {
  aiConversations,
  aiMessages,
  aiUsage,
  tasks,
  conversationTypeEnum,
  type UsageByFeature,
} from '@/lib/db/schema'
import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import { aiClient, type MessageParam } from '@/lib/ai/client'
import {
  getSystemPrompt,
  getDecomposePrompt,
  getResearchPrompt,
  getDraftPrompt,
  TASK_ASSISTANT_PROMPT,
  type Task as PromptTask,
} from '@/lib/ai/prompts'
import type {
  ChatMessage,
  ChatResponse,
  Conversation,
  ConversationType as ConvType,
} from '@/types/ai'

// Type for conversation type enum values
type ConversationType = (typeof conversationTypeEnum.enumValues)[number]

// Use the Task type from prompts which has compatible types
type Task = PromptTask & { id: string }

interface AISuggestion {
  type: 'decompose' | 'research' | 'draft' | 'summarize'
  label: string
  description: string
}

type AIFeature = 'chat' | 'decompose' | 'research' | 'draft' | 'suggestions'

class AIService {
  // ============================================================================
  // CORE MESSAGING
  // ============================================================================

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(
    userId: string,
    message: string,
    options: {
      taskId?: string
      projectId?: string
      conversationId?: string
      conversationType?: ConvType
    } = {}
  ): Promise<ChatResponse> {
    const { taskId, projectId, conversationId, conversationType = 'general' } = options

    // Get or create conversation
    let conversation: { id: string; messages: ChatMessage[] }
    if (conversationId) {
      const history = await this.getConversationHistory(conversationId, userId)
      conversation = { id: conversationId, messages: history }
    } else {
      const newConv = await this.createConversation(userId, {
        taskId,
        projectId,
        type: conversationType,
        title: message.slice(0, 100),
      })
      conversation = { id: newConv.id, messages: [] }
    }

    // Get task context if taskId provided
    const task = taskId ? await this.getTaskContext(userId, taskId) : null

    // Build messages array from conversation history
    const messages: MessageParam[] = [
      ...conversation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt with task context
    const systemPrompt = getSystemPrompt(task ?? undefined)

    // Call AI
    const response = await aiClient.chat(messages, systemPrompt, {
      userId,
      taskId,
    })

    // Save user message
    await this.saveMessage(conversation.id, 'user', message)

    // Save assistant message with token usage
    await this.saveMessage(conversation.id, 'assistant', response.content, {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: 'claude-3-sonnet-20240229',
    })

    // Track usage
    await this.trackUsage(userId, 'chat', response.usage.inputTokens + response.usage.outputTokens)

    // Update conversation metadata
    await this.updateConversationMetadata(conversation.id, response.usage.inputTokens + response.usage.outputTokens)

    return {
      response: response.content,
      conversationId: conversation.id,
      usage: response.usage,
    }
  }

  /**
   * Stream a response from Claude
   */
  async *streamMessage(
    userId: string,
    message: string,
    options: {
      taskId?: string
      projectId?: string
      conversationId?: string
      conversationType?: ConvType
    } = {}
  ): AsyncGenerator<{ chunk: string; done: boolean; conversationId?: string }, void, unknown> {
    const { taskId, projectId, conversationId, conversationType = 'general' } = options

    // Get or create conversation
    let convId: string
    let conversationMessages: ChatMessage[] = []

    if (conversationId) {
      convId = conversationId
      conversationMessages = await this.getConversationHistory(conversationId, userId)
    } else {
      const newConv = await this.createConversation(userId, {
        taskId,
        projectId,
        type: conversationType,
        title: message.slice(0, 100),
      })
      convId = newConv.id
    }

    // Get task context if taskId provided
    const task = taskId ? await this.getTaskContext(userId, taskId) : null

    // Build messages array
    const messages: MessageParam[] = [
      ...conversationMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt
    const systemPrompt = getSystemPrompt(task ?? undefined)

    // Save user message
    await this.saveMessage(convId, 'user', message)

    // Stream response
    let fullResponse = ''
    for await (const chunk of aiClient.streamChat(messages, systemPrompt, {
      userId,
      taskId,
    })) {
      fullResponse += chunk
      yield { chunk, done: false, conversationId: convId }
    }

    // Save assistant message after streaming completes
    await this.saveMessage(convId, 'assistant', fullResponse, {
      model: 'claude-3-sonnet-20240229',
    })

    // Track usage (estimate tokens for streaming)
    const estimatedTokens = Math.ceil((message.length + fullResponse.length) / 4)
    await this.trackUsage(userId, 'chat', estimatedTokens)

    yield { chunk: '', done: true, conversationId: convId }
  }

  /**
   * General chat with task context (legacy method for backwards compatibility)
   */
  async chat(
    userId: string,
    taskId: string,
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<{ response: string; conversationId: string }> {
    // Get task context
    const task = await this.getTaskContext(userId, taskId)

    // Build messages array
    const messages: MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt with task context
    const systemPrompt = getSystemPrompt(task ?? undefined)

    // Call AI
    const response = await aiClient.chat(messages, systemPrompt, {
      userId,
      taskId,
    })

    // Create conversation and save messages
    const conversation = await this.saveConversation(userId, {
      taskId,
      type: 'general',
      title: message.slice(0, 100),
      messages: [
        ...conversationHistory,
        { id: crypto.randomUUID(), role: 'user', content: message, timestamp: new Date() },
        { id: crypto.randomUUID(), role: 'assistant', content: response.content, timestamp: new Date() },
      ],
    })

    // Track usage
    await this.trackUsage(userId, 'chat', response.usage.inputTokens + response.usage.outputTokens)

    return {
      response: response.content,
      conversationId: conversation.id,
    }
  }

  /**
   * Decompose task into subtasks
   */
  async decomposeTask(
    userId: string,
    taskId: string
  ): Promise<{ subtasks: string[]; reasoning: string }> {
    const task = await this.getTaskContext(userId, taskId)

    if (!task) {
      throw new Error('Task not found')
    }

    const systemPrompt = getDecomposePrompt()
    const userMessage = `Please break down this task into subtasks:

Title: ${task.title}
Description: ${task.description ?? 'No description provided'}
Due Date: ${task.dueDate ? task.dueDate.toISOString() : 'No due date'}

Provide 3-7 actionable subtasks.`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, temperature: 0.5 }
    )

    // Parse response to extract subtasks
    return this.parseDecomposeResponse(response.content)
  }

  /**
   * Research a topic
   */
  async research(
    userId: string,
    taskId: string,
    query: string
  ): Promise<{ findings: string; sources: string[] }> {
    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getResearchPrompt()
    const userMessage = `Research the following topic in the context of this task:

Task: ${task?.title ?? 'Unknown task'}
Research Query: ${query}

Provide a comprehensive summary with key findings.`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, maxTokens: 2048 }
    )

    return {
      findings: response.content,
      sources: [], // Would be populated with actual sources in production
    }
  }

  /**
   * Draft content
   */
  async draft(
    userId: string,
    taskId: string,
    draftType: 'email' | 'document' | 'outline' | 'general',
    instructions: string
  ): Promise<{ draft: string; suggestions: string[] }> {
    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getDraftPrompt(draftType)
    const userMessage = `Create a ${draftType} for this task:

Task: ${task?.title ?? 'Unknown task'}
Description: ${task?.description ?? ''}
Instructions: ${instructions}`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, maxTokens: 2048, temperature: 0.7 }
    )

    return {
      draft: response.content,
      suggestions: [],
    }
  }

  /**
   * Get smart suggestions for a task
   */
  async getSuggestions(
    userId: string,
    taskId: string
  ): Promise<{ suggestions: AISuggestion[] }> {
    const task = await this.getTaskContext(userId, taskId)

    if (!task) {
      return { suggestions: [] }
    }

    const suggestions: AISuggestion[] = []

    // Analyze task and generate contextual suggestions
    const titleLower = task.title.toLowerCase()

    if (
      titleLower.includes('email') ||
      titleLower.includes('write') ||
      titleLower.includes('draft')
    ) {
      suggestions.push({
        type: 'draft',
        label: 'Draft this content',
        description: 'I can help write a draft for you',
      })
    }

    if (
      titleLower.includes('research') ||
      titleLower.includes('find') ||
      titleLower.includes('learn') ||
      titleLower.includes('investigate')
    ) {
      suggestions.push({
        type: 'research',
        label: 'Research this topic',
        description: 'I can gather information for you',
      })
    }

    if (!task.subtasks || task.subtasks.length === 0) {
      suggestions.push({
        type: 'decompose',
        label: 'Break this down',
        description: 'I can suggest subtasks to make this more manageable',
      })
    }

    return { suggestions }
  }

  // ============================================================================
  // CONVERSATION PERSISTENCE
  // ============================================================================

  /**
   * Save a conversation to the database
   */
  async saveConversation(
    userId: string,
    data: {
      taskId?: string
      projectId?: string
      type: ConvType
      title?: string
      messages?: ChatMessage[]
    }
  ): Promise<{ id: string }> {
    const [conversation] = await db
      .insert(aiConversations)
      .values({
        userId,
        taskId: data.taskId ?? null,
        projectId: data.projectId ?? null,
        type: data.type as ConversationType,
        title: data.title ?? null,
        totalTokens: 0,
        messageCount: data.messages?.length ?? 0,
        lastMessageAt: new Date(),
      })
      .returning({ id: aiConversations.id })

    // Save messages if provided
    if (data.messages && data.messages.length > 0) {
      for (const msg of data.messages) {
        await this.saveMessage(conversation.id, msg.role, msg.content)
      }
    }

    return conversation
  }

  /**
   * Create a new conversation
   */
  private async createConversation(
    userId: string,
    data: {
      taskId?: string
      projectId?: string
      type: ConvType
      title?: string
    }
  ): Promise<{ id: string }> {
    const [conversation] = await db
      .insert(aiConversations)
      .values({
        userId,
        taskId: data.taskId ?? null,
        projectId: data.projectId ?? null,
        type: data.type as ConversationType,
        title: data.title ?? null,
        totalTokens: 0,
        messageCount: 0,
        lastMessageAt: new Date(),
      })
      .returning({ id: aiConversations.id })

    return conversation
  }

  /**
   * Save a message to a conversation
   */
  private async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      inputTokens?: number
      outputTokens?: number
      model?: string
    }
  ): Promise<void> {
    await db.insert(aiMessages).values({
      conversationId,
      role,
      content,
      inputTokens: metadata?.inputTokens ?? null,
      outputTokens: metadata?.outputTokens ?? null,
      model: metadata?.model ?? null,
      metadata: {},
    })

    // Update conversation message count
    await db
      .update(aiConversations)
      .set({
        messageCount: sql`${aiConversations.messageCount} + 1`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conversationId))
  }

  /**
   * Update conversation metadata after a response
   */
  private async updateConversationMetadata(
    conversationId: string,
    tokensUsed: number
  ): Promise<void> {
    await db
      .update(aiConversations)
      .set({
        totalTokens: sql`${aiConversations.totalTokens} + ${tokensUsed}`,
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conversationId))
  }

  /**
   * Get conversation history (retrieve past messages)
   */
  async getConversationHistory(
    conversationId: string,
    userId: string
  ): Promise<ChatMessage[]> {
    // First verify the conversation belongs to the user
    const conversation = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      ),
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Get all messages for this conversation
    const messages = await db.query.aiMessages.findMany({
      where: eq(aiMessages.conversationId, conversationId),
      orderBy: [desc(aiMessages.createdAt)],
    })

    // Reverse to get chronological order and map to ChatMessage format
    return messages.reverse().map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.createdAt,
      metadata: {
        tokensUsed: (msg.inputTokens ?? 0) + (msg.outputTokens ?? 0),
        model: msg.model ?? undefined,
      },
    }))
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    options: {
      taskId?: string
      projectId?: string
      type?: ConvType
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const { taskId, projectId, type, limit = 20, offset = 0 } = options

    const conditions = [eq(aiConversations.userId, userId)]

    if (taskId) {
      conditions.push(eq(aiConversations.taskId, taskId))
    }
    if (projectId) {
      conditions.push(eq(aiConversations.projectId, projectId))
    }
    if (type) {
      conditions.push(eq(aiConversations.type, type as ConversationType))
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiConversations)
      .where(and(...conditions))

    const total = countResult[0]?.count ?? 0

    // Get conversations
    const conversationResults = await db.query.aiConversations.findMany({
      where: and(...conditions),
      orderBy: [desc(aiConversations.updatedAt)],
      limit,
      offset,
    })

    // Map to Conversation type with empty messages (load separately if needed)
    const conversations: Conversation[] = conversationResults.map((conv) => ({
      id: conv.id,
      userId: conv.userId,
      taskId: conv.taskId ?? undefined,
      projectId: conv.projectId ?? undefined,
      title: conv.title ?? undefined,
      type: conv.type as ConvType,
      messages: [],
      totalTokens: conv.totalTokens ?? 0,
      messageCount: conv.messageCount ?? 0,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessageAt: conv.lastMessageAt ?? undefined,
    }))

    return { conversations, total }
  }

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  /**
   * Track token usage in ai_usage table
   */
  async trackUsage(
    userId: string,
    feature: AIFeature,
    tokens: number
  ): Promise<void> {
    const today = new Date()
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Format dates as strings for database
    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // Try to find existing usage record for this period
    const existingUsage = await db.query.aiUsage.findFirst({
      where: and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.periodStart, periodStartStr),
        eq(aiUsage.periodEnd, periodEndStr)
      ),
    })

    if (existingUsage) {
      // Update existing record
      const currentUsageByFeature = (existingUsage.usageByFeature ?? {}) as UsageByFeature
      const featureUsage = currentUsageByFeature[feature] ?? { requests: 0, tokens: 0 }

      const updatedUsageByFeature: UsageByFeature = {
        ...currentUsageByFeature,
        [feature]: {
          requests: featureUsage.requests + 1,
          tokens: featureUsage.tokens + tokens,
        },
      }

      await db
        .update(aiUsage)
        .set({
          requests: sql`${aiUsage.requests} + 1`,
          inputTokens: sql`${aiUsage.inputTokens} + ${Math.floor(tokens * 0.3)}`, // Estimate input vs output
          outputTokens: sql`${aiUsage.outputTokens} + ${Math.floor(tokens * 0.7)}`,
          usageByFeature: updatedUsageByFeature,
          updatedAt: new Date(),
        })
        .where(eq(aiUsage.id, existingUsage.id))
    } else {
      // Create new usage record
      const usageByFeature: UsageByFeature = {
        [feature]: { requests: 1, tokens },
      }

      await db.insert(aiUsage).values({
        userId,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        requests: 1,
        inputTokens: Math.floor(tokens * 0.3),
        outputTokens: Math.floor(tokens * 0.7),
        usageByFeature,
      })
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(
    userId: string,
    options: {
      periodStart?: Date
      periodEnd?: Date
    } = {}
  ): Promise<{
    totalRequests: number
    totalTokens: number
    usageByFeature: UsageByFeature
    periodStart: Date
    periodEnd: Date
  }> {
    const today = new Date()
    const periodStart = options.periodStart ?? new Date(today.getFullYear(), today.getMonth(), 1)
    const periodEnd = options.periodEnd ?? new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    const usage = await db.query.aiUsage.findFirst({
      where: and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.periodStart, periodStartStr),
        eq(aiUsage.periodEnd, periodEndStr)
      ),
    })

    if (!usage) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        usageByFeature: {},
        periodStart,
        periodEnd,
      }
    }

    return {
      totalRequests: usage.requests ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      usageByFeature: (usage.usageByFeature ?? {}) as UsageByFeature,
      periodStart,
      periodEnd,
    }
  }

  // ============================================================================
  // TASK CONTEXT
  // ============================================================================

  /**
   * Get task context for AI operations
   */
  private async getTaskContext(userId: string, taskId: string): Promise<Task | null> {
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      return null
    }

    // Get subtasks
    const subtasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.parentTaskId, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status,
      subtasks: subtasks.map((s) => ({ title: s.title })),
    }
  }

  /**
   * Parse decompose response to extract subtasks
   */
  private parseDecomposeResponse(content: string): {
    subtasks: string[]
    reasoning: string
  } {
    const lines = content.split('\n').filter((line) => line.trim())
    const subtasks: string[] = []
    let reasoning = ''

    for (const line of lines) {
      // Match numbered or bulleted items
      const match = line.match(/^[\d\-\*\u2022]\s*\.?\s*(.+)/)
      if (match) {
        subtasks.push(match[1].trim())
      } else if (!subtasks.length) {
        reasoning += line + ' '
      }
    }

    return {
      subtasks: subtasks.slice(0, 7), // Max 7 subtasks
      reasoning: reasoning.trim(),
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Verify ownership
    const conversation = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      ),
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Delete messages first (cascade should handle this, but explicit for safety)
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId))

    // Delete conversation
    await db.delete(aiConversations).where(eq(aiConversations.id, conversationId))
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      ),
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    await db
      .update(aiConversations)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conversationId))
  }
}

export const aiService = new AIService()
