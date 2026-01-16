/**
 * AI Provider Types
 * Provider-agnostic interfaces for multi-provider AI support
 */

/**
 * Supported AI provider identifiers
 */
export type AIProviderName = 'anthropic' | 'openai'

/**
 * Model capabilities
 * 'reasoning' - GPT-5 models with enhanced reasoning capabilities
 */
export type ModelCapability =
  | 'chat'
  | 'streaming'
  | 'tool_use'
  | 'vision'
  | 'reasoning'

/**
 * Provider model definition with pricing
 */
export interface ProviderModel {
  /** Model identifier (e.g., 'gpt-5.2', 'gpt-5-mini', 'claude-sonnet-4-20250514') */
  id: string
  /** Human-readable model name */
  name: string
  /** Maximum context window in tokens */
  contextWindow: number
  /** Maximum output tokens */
  maxOutputTokens: number
  /** Price per million input tokens in USD */
  inputPricePerMillion: number
  /** Price per million output tokens in USD */
  outputPricePerMillion: number
  /** Model capabilities */
  capabilities: ModelCapability[]
}

/**
 * Message format for provider requests
 */
export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Request format for chat completions
 */
export interface ProviderChatRequest {
  /** Conversation messages */
  messages: ProviderMessage[]
  /** System prompt */
  systemPrompt: string
  /** Model identifier */
  model: string
  /** Maximum tokens to generate */
  maxTokens: number
  /** Temperature (0-1) */
  temperature: number
  /** User ID for tracking */
  userId: string
  /** Optional task ID for context */
  taskId?: string
}

/**
 * Response format from chat completions
 */
export interface ProviderChatResponse {
  /** Generated content */
  content: string
  /** Token usage */
  usage: {
    inputTokens: number
    outputTokens: number
  }
  /** Stop reason */
  stopReason: string
  /** Model used */
  model: string
  /** Provider name */
  provider: AIProviderName
}

/**
 * AI Provider interface
 * All providers must implement this interface
 */
export interface AIProvider {
  /** Provider identifier */
  readonly name: AIProviderName
  /** Human-readable provider name */
  readonly displayName: string
  /** Available models for this provider */
  readonly models: ProviderModel[]

  /**
   * Send a chat message and get a response
   */
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>

  /**
   * Stream a chat response
   * Yields string chunks, returns final response with usage stats
   */
  streamChat(
    request: ProviderChatRequest
  ): AsyncGenerator<string, ProviderChatResponse, unknown>

  /**
   * Check if the provider is configured (API key present)
   */
  isConfigured(): boolean

  /**
   * Check if provider supports streaming
   */
  supportsStreaming(): boolean

  /**
   * Check if provider supports tool/function calling
   */
  supportsToolUse(): boolean

  /**
   * Estimate cost for a given token count
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string
  ): number
}

/**
 * Usage tracking per provider
 */
export interface UsageByProvider {
  [provider: string]: {
    requests: number
    inputTokens: number
    outputTokens: number
    byModel: {
      [model: string]: {
        requests: number
        inputTokens: number
        outputTokens: number
      }
    }
  }
}

/**
 * Cost tracking per provider
 */
export interface CostByProvider {
  [provider: string]: number
}

/**
 * Warning tracking for soft limits
 */
export interface WarningsSent {
  quota80Percent?: string // ISO timestamp when sent
  quota90Percent?: string
  quota95Percent?: string
  dailyCostWarning?: string
  monthlyCostWarning?: string
}

/**
 * Usage warning returned from tracking
 */
export interface UsageWarning {
  type: 'quota' | 'cost'
  level: 'warning' | 'critical'
  message: string
  percentage?: number
  currentValue?: number
  threshold?: number
  provider?: string
}
