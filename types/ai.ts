/**
 * AI Type Definitions
 */

import { z } from 'zod'

/**
 * AI message roles
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * AI conversation types
 */
export type ConversationType =
  | 'general'
  | 'decompose'
  | 'research'
  | 'draft'
  | 'planning'
  | 'coaching'

/**
 * AI context types
 */
export type AIContextType =
  | 'research'
  | 'draft'
  | 'outline'
  | 'summary'
  | 'suggestion'
  | 'note'

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z
    .object({
      tokensUsed: z.number().optional(),
      model: z.string().optional(),
      processingTimeMs: z.number().optional(),
    })
    .optional(),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>

/**
 * AI conversation schema
 */
export const conversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  title: z.string().optional(),
  type: z.enum([
    'general',
    'decompose',
    'research',
    'draft',
    'planning',
    'coaching',
  ]),
  messages: z.array(chatMessageSchema),
  totalTokens: z.number().default(0),
  messageCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastMessageAt: z.date().optional(),
})

export type Conversation = z.infer<typeof conversationSchema>

/**
 * Conversation history message schema for API requests
 */
export const conversationHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export type ConversationHistoryMessage = z.infer<
  typeof conversationHistoryMessageSchema
>

/**
 * AI chat request schema
 */
export const chatRequestSchema = z.object({
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  conversationType: z
    .enum(['general', 'decompose', 'research', 'draft', 'planning', 'coaching'])
    .optional()
    .default('general'),
  conversationHistory: z
    .array(conversationHistoryMessageSchema)
    .max(50)
    .optional(),
  stream: z.boolean().optional().default(true),
  provider: z.string().optional(),
  model: z.string().optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

/**
 * AI chat response
 */
export interface ChatResponse {
  response: string
  conversationId: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * AI suggestion types
 */
export interface AISuggestion {
  type: 'decompose' | 'research' | 'draft' | 'summarize'
  label: string
  description: string
}

/**
 * Decompose response
 */
export interface DecomposeResponse {
  subtasks: string[]
  reasoning: string
}

/**
 * Research response
 */
export interface ResearchResponse {
  findings: string
  sources: string[]
}

/**
 * Draft response
 */
export interface DraftResponse {
  draft: string
  suggestions: string[]
}

/**
 * AI context (saved research, drafts, etc.)
 */
export interface AIContext {
  id: string
  taskId: string
  type: AIContextType
  title?: string
  content: string
  version: number
  isCurrent: boolean
  metadata?: {
    sources?: { url?: string; title?: string }[]
    draftType?: 'email' | 'document' | 'outline' | 'general'
    wordCount?: number
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * AI usage tracking
 */
export interface AIUsage {
  userId: string
  periodStart: Date
  periodEnd: Date
  requests: number
  inputTokens: number
  outputTokens: number
  usageByFeature: {
    chat?: { requests: number; tokens: number }
    decompose?: { requests: number; tokens: number }
    research?: { requests: number; tokens: number }
    draft?: { requests: number; tokens: number }
    suggestions?: { requests: number; tokens: number }
  }
}

// =============================================================================
// AI CONTEXT API TYPES
// =============================================================================

/**
 * AI context metadata schema
 */
export const aiContextMetadataSchema = z.object({
  sources: z
    .array(
      z.object({
        url: z.string().optional(),
        title: z.string().optional(),
        snippet: z.string().optional(),
      })
    )
    .optional(),
  draftType: z.enum(['email', 'document', 'outline', 'general']).optional(),
  wordCount: z.number().optional(),
  suggestionType: z
    .enum(['subtask', 'priority', 'deadline', 'approach'])
    .optional(),
  applied: z.boolean().optional(),
  appliedAt: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
})

export type AIContextMetadataInput = z.infer<typeof aiContextMetadataSchema>

/**
 * Create AI context request schema
 */
export const createAIContextSchema = z.object({
  taskId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  type: z.enum([
    'research',
    'draft',
    'outline',
    'summary',
    'suggestion',
    'note',
  ]),
  title: z.string().max(255).optional(),
  content: z.string().min(1),
  metadata: aiContextMetadataSchema.optional(),
})

export type CreateAIContextRequest = z.infer<typeof createAIContextSchema>

/**
 * Update AI context request schema
 */
export const updateAIContextSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1).optional(),
  isCurrent: z.boolean().optional(),
  metadata: aiContextMetadataSchema.optional(),
})

export type UpdateAIContextRequest = z.infer<typeof updateAIContextSchema>

/**
 * AI context query parameters schema
 */
export const aiContextQuerySchema = z.object({
  taskId: z.string().uuid(),
  type: z
    .enum(['research', 'draft', 'outline', 'summary', 'suggestion', 'note'])
    .optional(),
  currentOnly: z.coerce.boolean().optional().default(true),
})

export type AIContextQuery = z.infer<typeof aiContextQuerySchema>

/**
 * AI context response item
 */
export interface AIContextResponse {
  id: string
  taskId: string
  conversationId: string | null
  type: AIContextType
  title: string | null
  content: string
  version: number
  isCurrent: boolean
  metadata: AIContextMetadataInput | null
  createdAt: string
  updatedAt: string
}

// =============================================================================
// STREAMING TYPES
// =============================================================================

/**
 * Stream event types for SSE
 */
export type StreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'error'

/**
 * Stream event data
 */
export interface StreamEvent {
  type: StreamEventType
  data?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  conversationId?: string
}

/**
 * Chat stream response
 */
export interface ChatStreamResponse {
  conversationId: string
  messageId: string
}
