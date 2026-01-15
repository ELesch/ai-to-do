/**
 * AI Configuration
 * Configuration settings for Anthropic Claude API
 */

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
 * Default model for AI operations
 */
export const DEFAULT_MODEL: ClaudeModel = CLAUDE_MODELS.SONNET

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
