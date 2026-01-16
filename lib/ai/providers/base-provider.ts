/**
 * Base AI Provider
 * Abstract base class with shared functionality for all AI providers
 */

import type {
  AIProvider,
  AIProviderName,
  ProviderModel,
  ProviderChatRequest,
  ProviderChatResponse,
} from './types'

/**
 * Retry configuration for API calls
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
} as const

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay =
    RETRY_CONFIG.INITIAL_DELAY_MS *
    Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt)
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS)
}

/**
 * Abstract base class for AI providers
 * Provides shared functionality like retry logic and cost calculation
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: AIProviderName
  abstract readonly displayName: string
  abstract readonly models: ProviderModel[]

  abstract chat(request: ProviderChatRequest): Promise<ProviderChatResponse>
  abstract streamChat(
    request: ProviderChatRequest
  ): AsyncGenerator<string, ProviderChatResponse, unknown>
  abstract isConfigured(): boolean

  /**
   * Default: most providers support streaming
   */
  supportsStreaming(): boolean {
    return true
  }

  /**
   * Default: tool use not supported unless overridden
   */
  supportsToolUse(): boolean {
    return false
  }

  /**
   * Calculate estimated cost for token usage
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    modelId: string
  ): number {
    const model = this.models.find((m) => m.id === modelId)
    if (!model) return 0

    const inputCost = (inputTokens * model.inputPricePerMillion) / 1_000_000
    const outputCost = (outputTokens * model.outputPricePerMillion) / 1_000_000
    return inputCost + outputCost
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: string): ProviderModel | undefined {
    return this.models.find((m) => m.id === modelId)
  }

  /**
   * Get the default model for this provider
   */
  getDefaultModel(): ProviderModel {
    return this.models[0]
  }

  /**
   * Execute an operation with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean = () => false,
    maxRetries: number = RETRY_CONFIG.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (shouldRetry(error) && attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt)
          await sleep(delay)
          continue
        }

        throw error
      }
    }

    throw lastError ?? new Error('Max retries exceeded')
  }
}
