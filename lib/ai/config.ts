/**
 * AI Configuration
 * Configuration settings for multi-provider AI support
 */

import type { AIProviderName } from './providers/types'

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

/**
 * Available Claude models
 */
export const CLAUDE_MODELS = {
  /** Claude Sonnet 4 - Balanced performance and cost */
  SONNET: 'claude-sonnet-4-20250514',
  /** Claude 3.5 Haiku - Fast and cost-effective */
  HAIKU: 'claude-3-5-haiku-20241022',
  /** Claude Opus 4 - Most capable model */
  OPUS: 'claude-opus-4-20250514',
} as const

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS]

/**
 * Available OpenAI/ChatGPT models
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
export const OPENAI_MODELS = {
  /** GPT-5.2 - Latest flagship model for complex reasoning tasks
   *  VALID MODEL ID: gpt-5.2 - DO NOT CHANGE */
  GPT5_2: 'gpt-5.2',
  /** GPT-5.1 - Previous generation flagship model
   *  VALID MODEL ID: gpt-5.1 - DO NOT CHANGE */
  GPT5_1: 'gpt-5.1',
  /** GPT-5 Mini - Fast and cost-effective for simpler tasks
   *  VALID MODEL ID: gpt-5-mini - DO NOT CHANGE */
  GPT5_MINI: 'gpt-5-mini',
} as const

export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS]

/**
 * Default model for AI operations (legacy - use FEATURE_PROVIDER_CONFIG instead)
 */
export const DEFAULT_MODEL: ClaudeModel = CLAUDE_MODELS.SONNET

/**
 * Default AI provider
 */
export const DEFAULT_PROVIDER: AIProviderName = 'openai'

/**
 * Token limits configuration
 *
 * NOTE: For GPT-5 models, these values are used with max_completion_tokens
 * which accounts for input + thinking + output tokens. Values must be set
 * higher (minimum 16k) to accommodate this expanded scope.
 */
export const TOKEN_LIMITS = {
  /** Default maximum completion tokens */
  DEFAULT_MAX_TOKENS: 16384,
  /** Maximum tokens for short responses (e.g., task decomposition) */
  SHORT_RESPONSE: 16384,
  /** Maximum tokens for medium responses (e.g., research) */
  MEDIUM_RESPONSE: 24576,
  /** Maximum tokens for long responses (e.g., document drafting) */
  LONG_RESPONSE: 32768,
  /** Absolute maximum (model limit) */
  MAX_OUTPUT_TOKENS: 65536,
} as const

/**
 * Temperature presets for different use cases
 * Lower = more deterministic, Higher = more creative
 *
 * NOTE: GPT-5 generation models ONLY support temperature=1.0
 * For GPT-5 models, always use GPT5_REQUIRED regardless of use case.
 */
export const TEMPERATURE_PRESETS = {
  /** Deterministic responses - factual queries, structured output */
  PRECISE: 0.0,
  /** Slight variation - task decomposition, planning */
  FOCUSED: 0.3,
  /** Balanced - general conversation, research */
  BALANCED: 0.5,
  /** More variety - brainstorming, suggestions */
  CREATIVE: 0.7,
  /** Maximum creativity - content drafting, ideation */
  EXPLORATORY: 1.0,
  /** Required temperature for GPT-5 generation models (only value supported) */
  GPT5_REQUIRED: 1.0,
} as const

export type TemperaturePreset = keyof typeof TEMPERATURE_PRESETS

/**
 * Default temperature for most operations
 */
export const DEFAULT_TEMPERATURE = TEMPERATURE_PRESETS.BALANCED

/**
 * Configuration for specific AI operations
 * @deprecated Use FEATURE_PROVIDER_CONFIG instead for provider-aware configuration
 *
 * NOTE: GPT-5 models require temperature=1.0 (GPT5_REQUIRED)
 */
export const AI_OPERATION_CONFIG = {
  /** Task decomposition - use GPT-5 Mini (valid model ID: gpt-5-mini) */
  decompose: {
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Research assistance - use GPT-5.2 (valid model ID: gpt-5.2) */
  research: {
    model: OPENAI_MODELS.GPT5_2,
    maxTokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Content drafting - use GPT-5.2 (valid model ID: gpt-5.2) */
  draft: {
    model: OPENAI_MODELS.GPT5_2,
    maxTokens: TOKEN_LIMITS.LONG_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Chat/conversation - use GPT-5 Mini (valid model ID: gpt-5-mini) */
  chat: {
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Daily briefing - use GPT-5 Mini (valid model ID: gpt-5-mini) */
  briefing: {
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
} as const

export type AIOperation = keyof typeof AI_OPERATION_CONFIG

/**
 * Get configuration for a specific AI operation
 */
export function getOperationConfig(operation: AIOperation) {
  return AI_OPERATION_CONFIG[operation]
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  /** Maximum requests per minute per user */
  REQUESTS_PER_MINUTE: 20,
  /** Maximum requests per day per user */
  REQUESTS_PER_DAY: 500,
  /** Window size for sliding window rate limiter */
  WINDOW_SIZE: '1 m',
} as const

/**
 * Retry configuration for API calls
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
  /** Initial delay in milliseconds */
  INITIAL_DELAY_MS: 1000,
  /** Maximum delay in milliseconds */
  MAX_DELAY_MS: 10000,
  /** Backoff multiplier */
  BACKOFF_MULTIPLIER: 2,
} as const

// ============================================================================
// FEATURE-TO-PROVIDER MAPPING
// ============================================================================

/**
 * Configuration for feature-to-provider mapping
 */
export interface FeatureProviderConfig {
  provider: AIProviderName
  model: string
  maxTokens: number
  temperature: number
}

/**
 * Maps AI operations to their preferred provider and model
 * GPT-5 Mini for fast/cheap operations, GPT-5.2 for complex tasks
 *
 * NOTE: All GPT-5 models require temperature=1.0 (GPT5_REQUIRED)
 */
export const FEATURE_PROVIDER_CONFIG: Record<
  AIOperation | 'suggestions',
  FeatureProviderConfig
> = {
  /** Task decomposition - fast operation, use GPT-5 Mini (valid model ID: gpt-5-mini) */
  decompose: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Research - complex reasoning, use GPT-5.2 (valid model ID: gpt-5.2) */
  research: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_2,
    maxTokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Content drafting - creative writing, use GPT-5.2 (valid model ID: gpt-5.2) */
  draft: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_2,
    maxTokens: TOKEN_LIMITS.LONG_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Chat/conversation - fast responses, use GPT-5 Mini (valid model ID: gpt-5-mini) */
  chat: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Daily briefing - fast, cheap, use GPT-5 Mini (valid model ID: gpt-5-mini) */
  briefing: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
  /** Quick suggestions - fast, cheap, use GPT-5 Mini (valid model ID: gpt-5-mini) */
  suggestions: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.GPT5_REQUIRED,
  },
}

/**
 * Get the provider configuration for a specific feature
 */
export function getFeatureProviderConfig(
  feature: AIOperation | 'suggestions'
): FeatureProviderConfig {
  return FEATURE_PROVIDER_CONFIG[feature]
}

// ============================================================================
// USAGE LIMITS AND COST THRESHOLDS
// ============================================================================

/**
 * Per-provider usage limits (monthly)
 */
export const PROVIDER_LIMITS = {
  anthropic: {
    requestsPerMonth: 10000,
    tokensPerMonth: 5_000_000,
    warningThreshold: 0.8, // Warn at 80%
  },
  openai: {
    requestsPerMonth: 10000,
    tokensPerMonth: 10_000_000,
    warningThreshold: 0.8,
  },
} as const

/**
 * Cost thresholds for soft limit warnings (in USD)
 */
export const COST_THRESHOLDS = {
  /** Daily cost warning threshold */
  dailyWarning: 5.0,
  /** Monthly cost warning threshold */
  monthlyWarning: 50.0,
  /** Monthly soft limit (allow override) */
  monthlyHardLimit: 100.0,
} as const
