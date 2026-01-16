/**
 * Anthropic Claude AI Provider
 * Provider implementation for Anthropic's Claude models
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam as AnthropicMessageParam } from '@anthropic-ai/sdk/resources/messages'
import {
  BaseAIProvider,
  RETRY_CONFIG,
  sleep,
  calculateBackoffDelay,
} from './base-provider'
import type {
  AIProviderName,
  ProviderModel,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderMessage,
} from './types'

/**
 * Custom error for configuration issues (e.g., missing API key)
 */
export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigError'
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
 * Custom error for rate limiting
 */
export class AIRateLimitError extends Error {
  public readonly retryAfterMs?: number

  constructor(message: string, retryAfterMs?: number) {
    super(message)
    this.name = 'AIRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * Claude model definitions with current pricing (as of 2025)
 */
const CLAUDE_MODELS: ProviderModel[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision'],
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku 3.5',
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision'],
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision'],
  },
]

/**
 * Convert provider messages to Anthropic format
 * Filters out system messages as Anthropic handles those separately
 */
function toAnthropicMessages(
  messages: ProviderMessage[]
): AnthropicMessageParam[] {
  return messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
}

/**
 * Determine if an error is retryable (rate limit or server error)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Retry on rate limits (429) and server errors (5xx)
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }
  return false
}

/**
 * Anthropic Claude Provider
 * Implements the AIProvider interface for Claude models
 */
export class AnthropicProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'anthropic'
  readonly displayName = 'Anthropic Claude'
  readonly models: ProviderModel[] = CLAUDE_MODELS

  private client: Anthropic | null = null

  /**
   * Get or create the Anthropic client instance
   */
  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw new AIConfigError(
          'ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.'
        )
      }
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }
    return this.client
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }

  /**
   * Anthropic Claude supports tool/function calling
   */
  supportsToolUse(): boolean {
    return true
  }

  /**
   * Send a chat message and get a response with full retry logic
   */
  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const client = this.getClient()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await client.messages.create({
          model: request.model,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          system: request.systemPrompt,
          messages: toAnthropicMessages(request.messages),
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
          model: request.model,
          provider: this.name,
        }
      } catch (error) {
        lastError = error as Error

        if (error instanceof Anthropic.APIError) {
          // Handle 401: Invalid API key - don't retry
          if (error.status === 401) {
            throw new AIConfigError(
              'Invalid API key. Please check your ANTHROPIC_API_KEY.'
            )
          }

          // Handle 429: Rate limit - retry with backoff
          if (error.status === 429) {
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIRateLimitError(
              'Rate limit exceeded. Please try again later.'
            )
          }

          // Handle 5xx: Server errors - retry with backoff
          if (error.status >= 500 && error.status < 600) {
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIServiceError(
              `Anthropic server error: ${error.message}`,
              error.status,
              true
            )
          }

          // Other API errors - don't retry
          throw new AIServiceError(
            `Anthropic API error: ${error.message}`,
            error.status,
            isRetryableError(error)
          )
        }

        // Unknown error - don't retry
        throw new AIServiceError(
          `Unexpected error: ${(error as Error).message}`
        )
      }
    }

    throw lastError ?? new AIServiceError('Max retries exceeded')
  }

  /**
   * Stream a chat response as an AsyncGenerator
   * Yields text chunks as they arrive, returns final response with usage stats
   */
  async *streamChat(
    request: ProviderChatRequest
  ): AsyncGenerator<string, ProviderChatResponse, unknown> {
    const client = this.getClient()

    let inputTokens = 0
    let outputTokens = 0
    let stopReason = 'unknown'
    let fullContent = ''
    let lastError: Error | null = null

    // Retry logic for stream initialization
    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const stream = await client.messages.stream({
          model: request.model,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          system: request.systemPrompt,
          messages: toAnthropicMessages(request.messages),
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

        // Successfully completed streaming
        return {
          content: fullContent,
          usage: {
            inputTokens,
            outputTokens,
          },
          stopReason,
          model: request.model,
          provider: this.name,
        }
      } catch (error) {
        lastError = error as Error

        if (error instanceof Anthropic.APIError) {
          // Handle 401: Invalid API key - don't retry
          if (error.status === 401) {
            throw new AIConfigError(
              'Invalid API key. Please check your ANTHROPIC_API_KEY.'
            )
          }

          // Handle 429: Rate limit - retry with backoff
          if (error.status === 429) {
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIRateLimitError(
              'Rate limit exceeded. Please try again later.'
            )
          }

          // Handle 5xx: Server errors - retry with backoff
          if (error.status >= 500 && error.status < 600) {
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIServiceError(
              `Anthropic server error: ${error.message}`,
              error.status,
              true
            )
          }

          // Other API errors - don't retry
          throw new AIServiceError(
            `Anthropic API error: ${error.message}`,
            error.status,
            isRetryableError(error)
          )
        }

        // Unknown error - don't retry
        throw new AIServiceError(
          `Unexpected error: ${(error as Error).message}`
        )
      }
    }

    throw (
      lastError ?? new AIServiceError('Max retries exceeded during streaming')
    )
  }
}

/**
 * Singleton instance of the Anthropic provider
 */
export const anthropicProvider = new AnthropicProvider()

/**
 * Re-export types for convenience
 */
export type { ProviderChatRequest, ProviderChatResponse, ProviderModel }
