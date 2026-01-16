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
 */
export const OPENAI_MODELS = {
  /** GPT-5 Mini - Fast and cost-effective */
  GPT5_MINI: 'gpt-5-mini',
  /** GPT-4o - Standard multimodal model */
  GPT4O: 'gpt-4o',
  /** GPT-4o Mini - Smaller, faster variant */
  GPT4O_MINI: 'gpt-4o-mini',
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
 */
export const TOKEN_LIMITS = {
  /** Default maximum output tokens */
  DEFAULT_MAX_TOKENS: 1024,
  /** Maximum tokens for short responses (e.g., task decomposition) */
  SHORT_RESPONSE: 512,
  /** Maximum tokens for medium responses (e.g., research) */
  MEDIUM_RESPONSE: 2048,
  /** Maximum tokens for long responses (e.g., document drafting) */
  LONG_RESPONSE: 4096,
  /** Absolute maximum (model limit) */
  MAX_OUTPUT_TOKENS: 8192,
} as const

/**
 * Temperature presets for different use cases
 * Lower = more deterministic, Higher = more creative
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
} as const

export type TemperaturePreset = keyof typeof TEMPERATURE_PRESETS

/**
 * Default temperature for most operations
 */
export const DEFAULT_TEMPERATURE = TEMPERATURE_PRESETS.BALANCED

/**
 * Configuration for specific AI operations
 */
export const AI_OPERATION_CONFIG = {
  /** Task decomposition settings */
  decompose: {
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.FOCUSED,
  },
  /** Research assistance settings */
  research: {
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    temperature: TEMPERATURE_PRESETS.BALANCED,
  },
  /** Content drafting settings */
  draft: {
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.LONG_RESPONSE,
    temperature: TEMPERATURE_PRESETS.CREATIVE,
  },
  /** Chat/conversation settings */
  chat: {
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: TEMPERATURE_PRESETS.BALANCED,
  },
  /** Daily briefing settings */
  briefing: {
    model: CLAUDE_MODELS.HAIKU,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.FOCUSED,
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
 * GPT-5 Mini for fast/cheap operations, Claude for complex reasoning
 */
export const FEATURE_PROVIDER_CONFIG: Record<
  AIOperation | 'suggestions',
  FeatureProviderConfig
> = {
  /** Task decomposition - fast operation, use GPT-5 Mini */
  decompose: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.FOCUSED,
  },
  /** Research - complex reasoning, use Claude */
  research: {
    provider: 'anthropic',
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.MEDIUM_RESPONSE,
    temperature: TEMPERATURE_PRESETS.BALANCED,
  },
  /** Content drafting - creative writing, use Claude */
  draft: {
    provider: 'anthropic',
    model: CLAUDE_MODELS.SONNET,
    maxTokens: TOKEN_LIMITS.LONG_RESPONSE,
    temperature: TEMPERATURE_PRESETS.CREATIVE,
  },
  /** Chat/conversation - fast responses, use GPT-5 Mini */
  chat: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.DEFAULT_MAX_TOKENS,
    temperature: TEMPERATURE_PRESETS.BALANCED,
  },
  /** Daily briefing - fast, cheap, use GPT-5 Mini */
  briefing: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.FOCUSED,
  },
  /** Quick suggestions - fast, cheap, use GPT-5 Mini */
  suggestions: {
    provider: 'openai',
    model: OPENAI_MODELS.GPT5_MINI,
    maxTokens: TOKEN_LIMITS.SHORT_RESPONSE,
    temperature: TEMPERATURE_PRESETS.CREATIVE,
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
