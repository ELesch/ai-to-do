/**
 * AI Client
 * Wrapper for Anthropic Claude API with error handling and streaming support
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
function toAnthropicMessages(messages: MessageParam[]): AnthropicMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * AI Client class with methods for interacting with Claude
 */
class AIClient {
  /**
   * Send a chat message and get a response
   */
  async chat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    if (!isAPIKeyConfigured()) {
      throw new AIConfigError(
        'ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.'
      )
    }

    const model = options.model ?? DEFAULT_MODEL
    const maxTokens = options.maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: toAnthropicMessages(messages),
        })

        // Extract text content from the response
        const textContent = response.content.find(
          (block) => block.type === 'text'
        )
        const content = textContent?.type === 'text' ? textContent.text : ''

        return {
          content,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          stopReason: response.stop_reason ?? 'unknown',
        }
      } catch (error) {
        lastError = error as Error

        if (error instanceof Anthropic.APIError) {
          // Handle specific API errors
          if (error.status === 401) {
            throw new AIConfigError('Invalid API key. Please check your ANTHROPIC_API_KEY.')
          }

          if (error.status === 429) {
            // Rate limited - retry with backoff
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIRateLimitError('Rate limit exceeded. Please try again later.')
          }

          if (isRetryableError(error) && attempt < RETRY_CONFIG.MAX_RETRIES) {
            const delay = calculateBackoffDelay(attempt)
            await sleep(delay)
            continue
          }

          throw new AIServiceError(
            `API error: ${error.message}`,
            error.status,
            isRetryableError(error)
          )
        }

        // Unknown error - don't retry
        throw new AIServiceError(`Unexpected error: ${(error as Error).message}`)
      }
    }

    throw lastError ?? new AIServiceError('Max retries exceeded')
  }

  /**
   * Stream a chat response
   */
  async *streamChat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): AsyncGenerator<string, AIResponse, unknown> {
    if (!isAPIKeyConfigured()) {
      throw new AIConfigError(
        'ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.'
      )
    }

    const model = options.model ?? DEFAULT_MODEL
    const maxTokens = options.maxTokens ?? TOKEN_LIMITS.DEFAULT_MAX_TOKENS
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE

    let inputTokens = 0
    let outputTokens = 0
    let stopReason = 'unknown'
    let fullContent = ''

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: toAnthropicMessages(messages),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta
        if ('text' in delta) {
          fullContent += delta.text
          yield delta.text
        }
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage?.input_tokens ?? 0
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage?.output_tokens ?? 0
        stopReason = event.delta?.stop_reason ?? 'unknown'
      }
    }

    return {
      content: fullContent,
      usage: {
        inputTokens,
        outputTokens,
      },
      stopReason,
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
