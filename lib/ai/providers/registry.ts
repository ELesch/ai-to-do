/**
 * AI Provider Registry
 * Singleton registry for managing multiple AI providers
 */

import type { AIProvider, AIProviderName, ProviderModel } from './types'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'

/**
 * Model with provider information
 */
export interface ProviderModelWithSource {
  provider: AIProviderName
  model: ProviderModel
}

/**
 * Singleton registry for AI providers
 * Manages provider registration, lookup, and configuration
 */
class AIProviderRegistry {
  private providers: Map<AIProviderName, AIProvider> = new Map()
  private defaultProvider: AIProviderName = 'anthropic'

  constructor() {
    // Register built-in providers
    this.register(new AnthropicProvider())
    this.register(new OpenAIProvider())
  }

  /**
   * Register a provider
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
  }

  /**
   * Get a provider by name
   */
  get(name: AIProviderName): AIProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Get the default provider
   * @throws Error if default provider is not found
   */
  getDefault(): AIProvider {
    const provider = this.providers.get(this.defaultProvider)
    if (!provider) {
      throw new Error(`Default provider '${this.defaultProvider}' not found`)
    }
    return provider
  }

  /**
   * Set the default provider
   */
  setDefault(name: AIProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not found`)
    }
    this.defaultProvider = name
  }

  /**
   * Get all configured providers (where isConfigured() returns true)
   */
  getAvailable(): AIProvider[] {
    return Array.from(this.providers.values()).filter((provider) =>
      provider.isConfigured()
    )
  }

  /**
   * Get all models from all available providers with provider name
   */
  getAllModels(): ProviderModelWithSource[] {
    const models: ProviderModelWithSource[] = []

    for (const provider of this.getAvailable()) {
      for (const model of provider.models) {
        models.push({
          provider: provider.name,
          model,
        })
      }
    }

    return models
  }
}

/**
 * Singleton instance of the provider registry
 */
export const providerRegistry = new AIProviderRegistry()
