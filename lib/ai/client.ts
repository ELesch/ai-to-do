/**
 * AI Client
 * Wrapper for Anthropic Claude API with error handling and streaming support
 *
 * This module maintains backward compatibility while using the new provider abstraction.
 * Existing code importing from '@/lib/ai/client' continues to work unchanged.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam as AnthropicMessageParam } from '@anthropic-ai/sdk/resources/messages'
import {
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  TOKEN_LIMITS,
  RETRY_CONFIG,
  type ClaudeModel,
} from './config'
import {
  providerRegistry,
  AIConfigError as ProviderConfigError,
  AIServiceError as ProviderServiceError,
  AIRateLimitError as ProviderRateLimitError,
} from './providers'
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  AIProvider,
  AIProviderName,
  ProviderMessage,
} from './providers/types'

// Re-export from providers for convenience
export {
  AIConfigError as ProviderAIConfigError,
  AIServiceError as ProviderAIServiceError,
  AIRateLimitError as ProviderAIRateLimitError,
  providerRegistry,
} from './providers'
export type {
  ProviderChatRequest,
  ProviderChatResponse,
  AIProvider,
  AIProviderName,
  ProviderMessage,
} from './providers/types'

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Singleton Anthropic client instance
 */
export { anthropic }

/**
 * Message parameter type for chat messages
 */
export interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Options for AI requests
 */
export interface AIRequestOptions {
  userId: string
  taskId?: string
  model?: ClaudeModel
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

/**
 * Response from AI operations
 */
export interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string
}

/**
 * Custom error for rate limiting
 */
export class AIRateLimitError extends Error {
  constructor(
    message: string,
    public details?: { limit: number; remaining: number }
  ) {
    super(message)
    this.name = 'AIRateLimitError'
  }
}

/**
 * Custom error for API service errors
 */
export class AIServiceError extends Error {
  public readonly statusCode?: number
  public readonly isRetryable: boolean

  constructor(message: string, statusCode?: number, isRetryable = false) {
    super(message)
    this.name = 'AIServiceError'
    this.statusCode = statusCode
    this.isRetryable = isRetryable
  }
}

/**
 * Custom error for configuration issues
 */
export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigError'
  }
}

/**
 * Check if the API key is configured
 */
export function isAPIKeyConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const delay =
    RETRY_CONFIG.INITIAL_DELAY_MS *
    Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt)
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS)
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on rate limits and server errors
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }
  return false
}

/**
 * Convert our MessageParam to Anthropic's format
 */
function toAnthropicMessages(
  messages: MessageParam[]
): AnthropicMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * AI Client class with methods for interacting with Claude
 * Now uses providerRegistry.getDefault() internally for provider abstraction
 */
class AIClient {
  /**
   * Send a chat message and get a response
   * Uses the default provider from providerRegistry
   */
  async chat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const provider = providerRegistry.getDefault()

    if (!provider.isConfigured()) {
      throw new AIConfigError(
        `${provider.displayName} API key is not configured. Please set it in your environment variables.`
      )
    }

    const model = options.model ?? DEFAULT_MODEL
    const maxTokens = options.maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE

    // Convert MessageParam to ProviderMessage format
    const providerMessages: ProviderMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const request: ProviderChatRequest = {
      messages: providerMessages,
      systemPrompt,
      model,
      maxTokens,
      temperature,
      userId: options.userId,
      taskId: options.taskId,
    }

    try {
      const response = await provider.chat(request)
      return {
        content: response.content,
        usage: response.usage,
        stopReason: response.stopReason,
      }
    } catch (error) {
      // Convert provider errors to legacy error types for backward compatibility
      if (error instanceof ProviderConfigError) {
        throw new AIConfigError(error.message)
      }
      if (error instanceof ProviderRateLimitError) {
        throw new AIRateLimitError(error.message)
      }
      if (error instanceof ProviderServiceError) {
        throw new AIServiceError(
          error.message,
          error.statusCode,
          error.isRetryable
        )
      }
      throw error
    }
  }

  /**
   * Stream a chat response
   * Uses the default provider from providerRegistry
   */
  async *streamChat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): AsyncGenerator<string, AIResponse, unknown> {
    const provider = providerRegistry.getDefault()

    if (!provider.isConfigured()) {
      throw new AIConfigError(
        `${provider.displayName} API key is not configured. Please set it in your environment variables.`
      )
    }

    const model = options.model ?? DEFAULT_MODEL
    const maxTokens = options.maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE

    // Convert MessageParam to ProviderMessage format
    const providerMessages: ProviderMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    const request: ProviderChatRequest = {
      messages: providerMessages,
      systemPrompt,
      model,
      maxTokens,
      temperature,
      userId: options.userId,
      taskId: options.taskId,
    }

    try {
      const stream = provider.streamChat(request)
      let result: ProviderChatResponse | undefined

      while (true) {
        const { value, done } = await stream.next()
        if (done) {
          result = value as ProviderChatResponse
          break
        }
        yield value as string
      }

      return {
        content: result?.content ?? '',
        usage: result?.usage ?? { inputTokens: 0, outputTokens: 0 },
        stopReason: result?.stopReason ?? 'unknown',
      }
    } catch (error) {
      // Convert provider errors to legacy error types for backward compatibility
      if (error instanceof ProviderConfigError) {
        throw new AIConfigError(error.message)
      }
      if (error instanceof ProviderRateLimitError) {
        throw new AIRateLimitError(error.message)
      }
      if (error instanceof ProviderServiceError) {
        throw new AIServiceError(
          error.message,
          error.statusCode,
          error.isRetryable
        )
      }
      throw error
    }
  }

  /**
   * Simple single-turn completion helper
   */
  async complete(
    prompt: string,
    systemPrompt: string,
    options: Omit<AIRequestOptions, 'stream'>
  ): Promise<string> {
    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      systemPrompt,
      options
    )
    return response.content
  }
}

/**
 * Singleton AI client instance
 */
export const aiClient = new AIClient()

/**
 * Helper function to create a message with proper typing
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: string
): MessageParam {
  return { role, content }
}

/**
 * Helper to create a user message
 */
export function userMessage(content: string): MessageParam {
  return createMessage('user', content)
}

/**
 * Helper to create an assistant message
 */
export function assistantMessage(content: string): MessageParam {
  return createMessage('assistant', content)
}
