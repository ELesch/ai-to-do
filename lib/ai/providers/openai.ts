/**
 * OpenAI Provider
 * Implementation for OpenAI ChatGPT models
 */

import OpenAI from 'openai'
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
import { AIConfigError, AIServiceError, AIRateLimitError } from './anthropic'

/**
 * OpenAI GPT-5 generation models with pricing
 * Valid model IDs as of January 2025 - see https://platform.openai.com/docs/models/
 *
 * =====================================================================
 * IMPORTANT: DO NOT CHANGE THESE MODEL IDs - THEY ARE VALID AND CORRECT
 * =====================================================================
 *
 * GPT-5 generation models have specific requirements:
 * 1. Temperature MUST be set to 1.0 (only supported value)
 * 2. Use max_completion_tokens instead of max_tokens in API calls
 * 3. max_completion_tokens accounts for input + thinking + output tokens,
 *    so values should be set higher than traditional max_tokens values
 */
const OPENAI_MODELS: ProviderModel[] = [
  {
    // VALID MODEL ID: gpt-5.2 - DO NOT CHANGE
    // Latest flagship model (January 2025)
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    contextWindow: 400000,
    maxOutputTokens: 128000,
    inputPricePerMillion: 1.75,
    outputPricePerMillion: 14.0,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision', 'reasoning'],
  },
  {
    // VALID MODEL ID: gpt-5.1 - DO NOT CHANGE
    // Previous generation flagship (January 2025)
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputPricePerMillion: 1.5,
    outputPricePerMillion: 12.0,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision', 'reasoning'],
  },
  {
    // VALID MODEL ID: gpt-5-mini - DO NOT CHANGE
    // Fast and cost-effective (January 2025)
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.0,
    capabilities: ['chat', 'streaming', 'tool_use', 'vision'],
  },
]

/**
 * Convert ProviderMessage to OpenAI message format
 */
type OpenAIChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

function toOpenAIMessages(
  messages: ProviderMessage[],
  systemPrompt: string
): OpenAIChatMessage[] {
  const openAIMessages: OpenAIChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Skip system messages as we handle them separately
      continue
    }
    openAIMessages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })
  }

  return openAIMessages
}

/**
 * Check if an OpenAI error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    // Retry on rate limits and server errors
    return (
      error.status === 429 ||
      (error.status !== undefined && error.status >= 500 && error.status < 600)
    )
  }
  return false
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly name: AIProviderName = 'openai'
  readonly displayName = 'OpenAI'
  readonly models = OPENAI_MODELS

  private client: OpenAI | null = null

  /**
   * Get or create the OpenAI client
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new AIConfigError(
          'OPENAI_API_KEY is not configured. Please set it in your environment variables.'
        )
      }
      this.client = new OpenAI({ apiKey })
    }
    return this.client
  }

  /**
   * Check if the provider is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  /**
   * OpenAI supports tool/function calling
   */
  supportsToolUse(): boolean {
    return true
  }

  /**
   * Send a chat message and get a response
   */
  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const client = this.getClient()
    const { messages, systemPrompt, model, maxTokens, temperature } = request

    // Log request details for debugging
    console.log('=== OpenAI API Request ===')
    console.log('Model:', model)
    console.log('Max completion tokens:', maxTokens)
    console.log('Temperature:', temperature)
    console.log('Message count:', messages.length)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} of ${RETRY_CONFIG.MAX_RETRIES}`)
        }

        // GPT-5 models require max_completion_tokens (not max_tokens)
        // This accounts for input + thinking + output tokens
        const response = await client.chat.completions.create({
          model,
          messages: toOpenAIMessages(messages, systemPrompt),
          max_completion_tokens: maxTokens,
          temperature, // Must be 1.0 for GPT-5 models
        })

        const choice = response.choices[0]
        const content = choice?.message?.content ?? ''

        console.log('=== OpenAI API Response ===')
        console.log('Response model:', response.model)
        console.log('Input tokens:', response.usage?.prompt_tokens ?? 0)
        console.log('Output tokens:', response.usage?.completion_tokens ?? 0)
        console.log('Finish reason:', choice?.finish_reason ?? 'unknown')
        console.log('Content length:', content.length)

        return {
          content,
          usage: {
            inputTokens: response.usage?.prompt_tokens ?? 0,
            outputTokens: response.usage?.completion_tokens ?? 0,
          },
          stopReason: choice?.finish_reason ?? 'unknown',
          model: response.model,
          provider: this.name,
        }
      } catch (error) {
        lastError = error as Error

        // Log error details
        console.error('=== OpenAI API Error ===')
        console.error('Attempt:', attempt + 1)
        console.error('Error type:', error?.constructor?.name)
        if (error instanceof OpenAI.APIError) {
          console.error('Status:', error.status)
          console.error('Message:', error.message)
          console.error('Code:', error.code)
          console.error('Type:', error.type)
        } else {
          console.error('Error:', error instanceof Error ? error.message : String(error))
        }

        if (error instanceof OpenAI.APIError) {
          // Handle specific API errors
          if (error.status === 401) {
            throw new AIConfigError(
              'Invalid API key. Please check your OPENAI_API_KEY.'
            )
          }

          if (error.status === 429) {
            // Rate limited - retry with backoff
            if (attempt < RETRY_CONFIG.MAX_RETRIES) {
              const delay = calculateBackoffDelay(attempt)
              await sleep(delay)
              continue
            }
            throw new AIRateLimitError(
              'Rate limit exceeded. Please try again later.'
            )
          }

          if (error.status === 400) {
            throw new AIServiceError(
              `Bad request: ${error.message}`,
              error.status,
              false
            )
          }

          if (error.status === 404) {
            throw new AIServiceError(
              `Model not found: ${error.message}`,
              error.status,
              false
            )
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
        throw new AIServiceError(
          `Unexpected error: ${(error as Error).message}`
        )
      }
    }

    throw lastError ?? new AIServiceError('Max retries exceeded')
  }

  /**
   * Stream a chat response
   */
  async *streamChat(
    request: ProviderChatRequest
  ): AsyncGenerator<string, ProviderChatResponse, unknown> {
    const client = this.getClient()
    const { messages, systemPrompt, model, maxTokens, temperature } = request

    let inputTokens = 0
    let outputTokens = 0
    let stopReason = 'unknown'
    let fullContent = ''
    let responseModel = model

    try {
      // GPT-5 models require max_completion_tokens (not max_tokens)
      // This accounts for input + thinking + output tokens
      const stream = await client.chat.completions.create({
        model,
        messages: toOpenAIMessages(messages, systemPrompt),
        max_completion_tokens: maxTokens,
        temperature, // Must be 1.0 for GPT-5 models
        stream: true,
        stream_options: { include_usage: true },
      })

      for await (const chunk of stream) {
        // Handle content chunks
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullContent += content
          yield content
        }

        // Handle finish reason
        const finishReason = chunk.choices[0]?.finish_reason
        if (finishReason) {
          stopReason = finishReason
        }

        // Handle usage data (comes in final chunk when stream_options.include_usage is true)
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0
          outputTokens = chunk.usage.completion_tokens ?? 0
        }

        // Capture model from response
        if (chunk.model) {
          responseModel = chunk.model
        }
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new AIConfigError(
            'Invalid API key. Please check your OPENAI_API_KEY.'
          )
        }

        if (error.status === 429) {
          throw new AIRateLimitError(
            'Rate limit exceeded. Please try again later.'
          )
        }

        throw new AIServiceError(
          `API error: ${error.message}`,
          error.status,
          isRetryableError(error)
        )
      }

      throw new AIServiceError(`Unexpected error: ${(error as Error).message}`)
    }

    return {
      content: fullContent,
      usage: {
        inputTokens,
        outputTokens,
      },
      stopReason,
      model: responseModel,
      provider: this.name,
    }
  }
}

/**
 * Singleton OpenAI provider instance
 */
export const openaiProvider = new OpenAIProvider()
