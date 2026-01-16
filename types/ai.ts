/**
 * AI Type Definitions
 */

import { z } from 'zod'
import type { TaskPriority } from './task'

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

// =============================================================================
// TASK ENRICHMENT TYPES
// =============================================================================

/**
 * Subtask types that can be proposed during enrichment
 */
export type SubtaskType = 'action' | 'research' | 'draft' | 'plan' | 'review'

/**
 * Work types that AI can perform
 */
export type AIWorkType = 'research' | 'draft' | 'plan' | 'outline'

/**
 * Confidence levels for AI estimates
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Task execution outcome types
 */
export type TaskOutcome = 'completed' | 'cancelled' | 'abandoned' | 'deferred'

/**
 * AI work artifact status
 */
export type ArtifactStatus = 'generated' | 'accepted' | 'rejected' | 'modified'

/**
 * Enrichment proposal status
 */
export type EnrichmentProposalStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'partial'

/**
 * Proposed subtask generated by AI during task enrichment
 */
export interface ProposedSubtask {
  /** The title of the proposed subtask */
  title: string
  /** Estimated time to complete in minutes */
  estimatedMinutes?: number
  /** The type of work this subtask represents */
  type?: SubtaskType
  /** Whether AI can perform this subtask automatically */
  aiCanDo?: boolean
  /** Suggested order in which to complete this subtask */
  suggestedOrder: number
}

/**
 * Proposed subtask schema for validation
 */
export const proposedSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  estimatedMinutes: z.number().int().positive().optional(),
  type: z.enum(['action', 'research', 'draft', 'plan', 'review']).optional(),
  aiCanDo: z.boolean().optional(),
  suggestedOrder: z.number().int().min(0),
})

/**
 * Execution insights for a similar task match
 */
export interface ExecutionInsights {
  /** Ratio of estimated vs actual time (actual/estimated) */
  estimatedVsActual?: number
  /** Number of subtasks added during execution */
  subtasksAdded?: number
  /** Points where the task stalled */
  stallPoints?: string[]
  /** Final outcome of the task */
  outcome: string
}

/**
 * Execution insights schema for validation
 */
export const executionInsightsSchema = z.object({
  estimatedVsActual: z.number().positive().optional(),
  subtasksAdded: z.number().int().min(0).optional(),
  stallPoints: z.array(z.string()).optional(),
  outcome: z.string(),
})

/**
 * A single matched task in similarity analysis
 */
export interface SimilarTaskMatch {
  /** The ID of the similar task */
  taskId: string
  /** The title of the similar task */
  title: string
  /** Similarity score from 0-100 */
  similarityScore: number
  /** Reasons why this task was matched */
  matchReasons: string[]
  /** Execution insights from this similar task */
  executionInsights: ExecutionInsights
}

/**
 * Similar task match schema for validation
 */
export const similarTaskMatchSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string(),
  similarityScore: z.number().min(0).max(100),
  matchReasons: z.array(z.string()),
  executionInsights: executionInsightsSchema,
})

/**
 * Aggregated insights from all similar tasks
 */
export interface AggregatedInsights {
  /** Average accuracy of estimates (actual/estimated) */
  avgEstimationAccuracy: number
  /** Subtasks commonly added during execution */
  commonSubtasksAdded: string[]
  /** Common points where tasks stall */
  commonStallPoints: string[]
  /** Percentage of similar tasks completed successfully */
  successRate: number
}

/**
 * Aggregated insights schema for validation
 */
export const aggregatedInsightsSchema = z.object({
  avgEstimationAccuracy: z.number().positive(),
  commonSubtasksAdded: z.array(z.string()),
  commonStallPoints: z.array(z.string()),
  successRate: z.number().min(0).max(100),
})

/**
 * Complete similarity analysis including matched tasks and aggregated insights
 */
export interface SimilarityAnalysis {
  /** List of matched similar tasks */
  matchedTasks: SimilarTaskMatch[]
  /** Aggregated insights from all matched tasks */
  aggregatedInsights: AggregatedInsights
}

/**
 * Similarity analysis schema for validation
 */
export const similarityAnalysisSchema = z.object({
  matchedTasks: z.array(similarTaskMatchSchema),
  aggregatedInsights: aggregatedInsightsSchema,
})

/**
 * A stall event during task execution
 */
export interface StallEvent {
  /** ISO timestamp when the stall started */
  startTime: string
  /** ISO timestamp when the stall ended */
  endTime: string
  /** Duration of the stall in minutes */
  durationMinutes: number
  /** Optional reason for the stall */
  reason?: string
  /** Optional ID of the subtask where the stall occurred */
  subtaskId?: string
}

/**
 * Stall event schema for validation
 */
export const stallEventSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().int().min(0),
  reason: z.string().optional(),
  subtaskId: z.string().uuid().optional(),
})

/**
 * Complete enrichment proposal returned by the enrichment service
 */
export interface EnrichmentProposal {
  /** Proposed refined title */
  proposedTitle: string
  /** Proposed detailed description */
  proposedDescription: string
  /** Proposed due date as ISO string, or null if not applicable */
  proposedDueDate: string | null
  /** Proposed time estimate in minutes */
  proposedEstimatedMinutes: number
  /** Proposed priority level */
  proposedPriority: TaskPriority
  /** Proposed subtasks */
  proposedSubtasks: ProposedSubtask[]
}

/**
 * Enrichment proposal schema for validation
 */
export const enrichmentProposalSchema = z.object({
  proposedTitle: z.string().min(1).max(500),
  proposedDescription: z.string(),
  proposedDueDate: z.string().datetime().nullable(),
  proposedEstimatedMinutes: z.number().int().positive(),
  proposedPriority: z.enum(['high', 'medium', 'low', 'none']),
  proposedSubtasks: z.array(proposedSubtaskSchema),
})

export type EnrichmentProposalInput = z.infer<typeof enrichmentProposalSchema>

/**
 * Insights about the enrichment proposal
 */
export interface EnrichmentInsights {
  /** Confidence level of the time estimate */
  estimationConfidence: ConfidenceLevel
  /** Potential risk factors for this task */
  riskFactors: string[]
  /** Predicted success probability (0-100) */
  successPrediction: number
}

/**
 * Enrichment insights schema for validation
 */
export const enrichmentInsightsSchema = z.object({
  estimationConfidence: z.enum(['high', 'medium', 'low']),
  riskFactors: z.array(z.string()),
  successPrediction: z.number().min(0).max(100),
})

// =============================================================================
// TASK ENRICHMENT API TYPES
// =============================================================================

/**
 * Request to enrich a task with AI suggestions
 */
export const enrichmentRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  existingTags: z.array(z.string()).optional(),
})

export type EnrichmentRequest = z.infer<typeof enrichmentRequestSchema>

/**
 * Response data for an enrichment request
 */
export interface EnrichmentResponseData {
  proposal: EnrichmentProposal
  similarTasks: SimilarityAnalysis
  insights: EnrichmentInsights
}

/**
 * Complete response from the enrichment API
 */
export interface EnrichmentResponse {
  success: boolean
  data: EnrichmentResponseData
}

/**
 * Enrichment response schema for validation
 */
export const enrichmentResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    proposal: enrichmentProposalSchema,
    similarTasks: similarityAnalysisSchema,
    insights: enrichmentInsightsSchema,
  }),
})

// =============================================================================
// AI WORK ARTIFACT TYPES
// =============================================================================

/**
 * AI-generated work artifact (research, drafts, plans)
 */
export interface AIWorkArtifact {
  /** Unique identifier for the artifact */
  id: string
  /** ID of the parent task */
  taskId: string
  /** ID of the subtask this artifact is for (optional) */
  subtaskId?: string
  /** ID of the user who requested the work */
  userId: string
  /** Type of work artifact */
  type: AIWorkType
  /** Title of the artifact */
  title: string
  /** The generated content */
  content: string
  /** Current status of the artifact */
  status: ArtifactStatus
  /** AI model used to generate the artifact */
  aiModel?: string
  /** AI provider used */
  aiProvider?: string
  /** The prompt used to generate the content */
  promptUsed?: string
  /** User rating (1-5) */
  userRating?: number
  /** User feedback text */
  userFeedback?: string
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

/**
 * AI work artifact schema for validation
 */
export const aiWorkArtifactSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  subtaskId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  type: z.enum(['research', 'draft', 'plan', 'outline']),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  status: z.enum(['generated', 'accepted', 'rejected', 'modified']),
  aiModel: z.string().max(100).optional(),
  aiProvider: z.string().max(50).optional(),
  promptUsed: z.string().optional(),
  userRating: z.number().int().min(1).max(5).optional(),
  userFeedback: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// =============================================================================
// DO WORK API TYPES
// =============================================================================

/**
 * Request for AI to perform work on a subtask
 */
export const doWorkRequestSchema = z.object({
  taskId: z.string().uuid(),
  subtaskId: z.string().uuid(),
  workType: z.enum(['research', 'draft', 'plan', 'outline']),
  context: z.string().max(5000).optional(),
})

export type DoWorkRequest = z.infer<typeof doWorkRequestSchema>

/**
 * Response data for a do-work request
 */
export interface DoWorkResponseData {
  /** ID of the created artifact */
  artifactId: string
  /** Type of work performed */
  type: AIWorkType
  /** Title of the generated artifact */
  title: string
  /** The generated content */
  content: string
  /** Suggested next steps after this work */
  suggestedNextSteps?: string[]
}

/**
 * Complete response from the do-work API
 */
export interface DoWorkResponse {
  success: boolean
  data: DoWorkResponseData
}

/**
 * Do work response schema for validation
 */
export const doWorkResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    artifactId: z.string().uuid(),
    type: z.enum(['research', 'draft', 'plan', 'outline']),
    title: z.string(),
    content: z.string(),
    suggestedNextSteps: z.array(z.string()).optional(),
  }),
})
