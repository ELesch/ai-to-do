/**
 * AI Service
 * Business logic for AI interactions and features
 */

import { db } from '@/lib/db'
import {
  aiConversations,
  aiMessages,
  tasks,
  conversationTypeEnum,
  type UsageByFeature,
} from '@/lib/db/schema'
import { eq, and, desc, sql, isNull } from 'drizzle-orm'
import { providerRegistry, type ProviderMessage } from '@/lib/ai/providers'
import { getFeatureProviderConfig, type AIOperation } from '@/lib/ai/config'
import { aiUsageService } from './ai-usage.service'
import type { AIProviderName, UsageWarning } from '@/lib/ai/providers/types'
import {
  getSystemPrompt,
  getDecomposePrompt,
  getResearchPrompt,
  getDraftPrompt,
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
      preferredProvider?: AIProviderName
      preferredModel?: string
    } = {}
  ): Promise<
    ChatResponse & {
      warnings?: UsageWarning[]
      provider?: string
      model?: string
    }
  > {
    const {
      taskId,
      projectId,
      conversationId,
      conversationType = 'general',
      preferredProvider,
      preferredModel,
    } = options

    // Get provider configuration for chat
    const config = getFeatureProviderConfig('chat')
    const provider =
      providerRegistry.get(preferredProvider ?? config.provider) ??
      providerRegistry.getDefault()
    const modelToUse = preferredModel ?? config.model

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
    const messages: ProviderMessage[] = [
      ...conversation.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt with task context
    const systemPrompt = getSystemPrompt(task ?? undefined)

    // Call AI using provider abstraction
    const response = await provider.chat({
      messages,
      systemPrompt,
      model: modelToUse,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Save user message
    await this.saveMessage(conversation.id, 'user', message)

    // Save assistant message with token usage and provider info
    await this.saveMessage(conversation.id, 'assistant', response.content, {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      model: response.model,
      provider: response.provider,
    })

    // Track usage with provider abstraction
    const warnings = await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'chat',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Update conversation metadata
    await this.updateConversationMetadata(
      conversation.id,
      response.usage.inputTokens + response.usage.outputTokens
    )

    return {
      response: response.content,
      conversationId: conversation.id,
      usage: response.usage,
      warnings,
      provider: response.provider,
      model: response.model,
    }
  }

  /**
   * Stream a response from the AI provider
   */
  async *streamMessage(
    userId: string,
    message: string,
    options: {
      taskId?: string
      projectId?: string
      conversationId?: string
      conversationType?: ConvType
      preferredProvider?: AIProviderName
      preferredModel?: string
    } = {}
  ): AsyncGenerator<
    {
      chunk: string
      done: boolean
      conversationId?: string
      warnings?: UsageWarning[]
      provider?: string
      model?: string
    },
    void,
    unknown
  > {
    const {
      taskId,
      projectId,
      conversationId,
      conversationType = 'general',
      preferredProvider,
      preferredModel,
    } = options

    // Get provider configuration for chat
    const config = getFeatureProviderConfig('chat')
    const provider =
      providerRegistry.get(preferredProvider ?? config.provider) ??
      providerRegistry.getDefault()
    const modelToUse = preferredModel ?? config.model

    // Get or create conversation
    let convId: string
    let conversationMessages: ChatMessage[] = []

    if (conversationId) {
      convId = conversationId
      conversationMessages = await this.getConversationHistory(
        conversationId,
        userId
      )
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
    const messages: ProviderMessage[] = [
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

    // Stream response using provider abstraction
    let fullResponse = ''
    const stream = provider.streamChat({
      messages,
      systemPrompt,
      model: modelToUse,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    let finalResponse = null
    for await (const chunk of stream) {
      if (typeof chunk === 'string') {
        fullResponse += chunk
        yield { chunk, done: false, conversationId: convId }
      }
    }

    // Get the final response with usage stats (returned from generator)
    // Note: In async generators, the return value comes after iteration
    // We need to capture it from the stream's return
    try {
      const result = await stream.next()
      if (result.done && result.value) {
        finalResponse = result.value
      }
    } catch {
      // Stream already completed, finalResponse stays null
    }

    // Save assistant message after streaming completes
    await this.saveMessage(convId, 'assistant', fullResponse, {
      model: finalResponse?.model ?? modelToUse,
      provider: finalResponse?.provider ?? provider.name,
      inputTokens: finalResponse?.usage?.inputTokens,
      outputTokens: finalResponse?.usage?.outputTokens,
    })

    // Track usage with provider abstraction
    const inputTokens =
      finalResponse?.usage?.inputTokens ?? Math.ceil(message.length / 4)
    const outputTokens =
      finalResponse?.usage?.outputTokens ?? Math.ceil(fullResponse.length / 4)
    const warnings = await aiUsageService.trackUsage(
      userId,
      finalResponse?.provider ?? provider.name,
      finalResponse?.model ?? modelToUse,
      'chat',
      inputTokens,
      outputTokens
    )

    yield {
      chunk: '',
      done: true,
      conversationId: convId,
      warnings,
      provider: finalResponse?.provider ?? provider.name,
      model: finalResponse?.model ?? modelToUse,
    }
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
    // Get provider configuration for chat
    const config = getFeatureProviderConfig('chat')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    // Get task context
    const task = await this.getTaskContext(userId, taskId)

    // Build messages array
    const messages: ProviderMessage[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt with task context
    const systemPrompt = getSystemPrompt(task ?? undefined)

    // Call AI using provider abstraction
    const response = await provider.chat({
      messages,
      systemPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
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
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        },
      ],
    })

    // Track usage with provider abstraction
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'chat',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

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
    // Get provider configuration for decompose
    const config = getFeatureProviderConfig('decompose')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

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

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage with provider abstraction
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'decompose',
      response.usage.inputTokens,
      response.usage.outputTokens
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
    // Get provider configuration for research
    const config = getFeatureProviderConfig('research')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getResearchPrompt()
    const userMessage = `Research the following topic in the context of this task:

Task: ${task?.title ?? 'Unknown task'}
Research Query: ${query}

Provide a comprehensive summary with key findings.`

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage with provider abstraction
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'research',
      response.usage.inputTokens,
      response.usage.outputTokens
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
    // Get provider configuration for draft
    const config = getFeatureProviderConfig('draft')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getDraftPrompt(draftType)
    const userMessage = `Create a ${draftType} for this task:

Task: ${task?.title ?? 'Unknown task'}
Description: ${task?.description ?? ''}
Instructions: ${instructions}`

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage with provider abstraction
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'draft',
      response.usage.inputTokens,
      response.usage.outputTokens
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
    // Get provider configuration for suggestions (for future AI-powered suggestions)
    const config = getFeatureProviderConfig('suggestions')
    // Note: config is available for future AI-powered suggestion generation
    void config // Mark as used to prevent lint warning

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
      provider?: string
    }
  ): Promise<void> {
    await db.insert(aiMessages).values({
      conversationId,
      role,
      content,
      inputTokens: metadata?.inputTokens ?? null,
      outputTokens: metadata?.outputTokens ?? null,
      model: metadata?.model ?? null,
      metadata: {
        provider: metadata?.provider ?? null,
      },
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
  // USAGE TRACKING (LEGACY - delegates to aiUsageService)
  // ============================================================================

  /**
   * Track token usage in ai_usage table
   * @deprecated Use aiUsageService.trackUsage() directly for new code
   */
  async trackUsage(
    userId: string,
    feature: AIFeature,
    tokens: number
  ): Promise<void> {
    // Delegate to aiUsageService with default provider
    // This maintains backward compatibility for code that doesn't know about providers
    const config = getFeatureProviderConfig(
      feature as AIOperation | 'suggestions'
    )
    const inputTokens = Math.floor(tokens * 0.3)
    const outputTokens = Math.floor(tokens * 0.7)

    await aiUsageService.trackUsage(
      userId,
      config.provider,
      config.model,
      feature,
      inputTokens,
      outputTokens
    )
  }

  /**
   * Get usage statistics for a user
   * @deprecated Use aiUsageService.getUsageStats() directly for new code
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
    // Delegate to aiUsageService
    const stats = await aiUsageService.getUsageStats(
      userId,
      options.periodStart || options.periodEnd ? 'current' : 'current'
    )

    return {
      totalRequests: stats.totalRequests,
      totalTokens: stats.totalTokens,
      usageByFeature: stats.byFeature,
      periodStart: stats.periodStart,
      periodEnd: stats.periodEnd,
    }
  }

  // ============================================================================
  // TASK CONTEXT
  // ============================================================================

  /**
   * Get task context for AI operations
   */
  private async getTaskContext(
    userId: string,
    taskId: string
  ): Promise<Task | null> {
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
  async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
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
    await db
      .delete(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))

    // Delete conversation
    await db
      .delete(aiConversations)
      .where(eq(aiConversations.id, conversationId))
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
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
