/**
 * AI Usage Tracking Service
 * Tracks and monitors AI usage across providers with cost estimation and warnings
 */

import { db } from '@/lib/db'
import {
  aiUsage,
  type UsageByFeature,
  type UsageByProvider,
  type CostByProvider,
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { providerRegistry } from '@/lib/ai/providers'
import type { AIProviderName } from '@/lib/ai/providers/types'
import { PROVIDER_LIMITS, COST_THRESHOLDS } from '@/lib/ai/config'
import type { UsageWarning } from '@/lib/ai/providers/types'

// AI feature types
type AIFeature = 'chat' | 'decompose' | 'research' | 'draft' | 'suggestions'

// AI usage record type matching the schema
interface AIUsageRecord {
  id: string
  userId: string
  periodStart: string
  periodEnd: string
  requests: number | null
  inputTokens: number | null
  outputTokens: number | null
  usageByFeature: UsageByFeature | null
  usageByProvider: UsageByProvider | null
  costByProvider: CostByProvider | null
  estimatedCostUsd: string | null
  createdAt: Date
  updatedAt: Date
}

// Usage stats return type
interface UsageStats {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  periodStart: Date
  periodEnd: Date
  byProvider: UsageByProvider
  byFeature: UsageByFeature
  costByProvider: CostByProvider
  warnings: UsageWarning[]
}

class AIUsageService {
  /**
   * Get current month period boundaries
   */
  private getCurrentMonthPeriod(): {
    start: Date
    end: Date
    startStr: string
    endStr: string
  } {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    }
  }

  /**
   * Get last month period boundaries
   */
  private getLastMonthPeriod(): {
    start: Date
    end: Date
    startStr: string
    endStr: string
  } {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    }
  }

  /**
   * Track AI usage for a request
   */
  async trackUsage(
    userId: string,
    provider: AIProviderName,
    model: string,
    feature: AIFeature,
    inputTokens: number,
    outputTokens: number
  ): Promise<UsageWarning[]> {
    const { startStr: periodStart, endStr: periodEnd } =
      this.getCurrentMonthPeriod()

    // Calculate cost using provider registry
    const providerInstance = providerRegistry.get(provider)
    const cost = providerInstance
      ? providerInstance.estimateCost(inputTokens, outputTokens, model)
      : 0

    // Find existing usage record for this period
    const existingUsage = (await db.query.aiUsage.findFirst({
      where: and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.periodStart, periodStart),
        eq(aiUsage.periodEnd, periodEnd)
      ),
    })) as AIUsageRecord | undefined

    if (existingUsage) {
      // Update existing record
      const currentUsageByFeature = (existingUsage.usageByFeature ??
        {}) as UsageByFeature
      const currentUsageByProvider = (existingUsage.usageByProvider ??
        {}) as UsageByProvider
      const currentCostByProvider = (existingUsage.costByProvider ??
        {}) as CostByProvider
      const currentEstimatedCost = parseFloat(
        existingUsage.estimatedCostUsd ?? '0'
      )

      // Update usage by feature
      const featureUsage = currentUsageByFeature[feature] ?? {
        requests: 0,
        tokens: 0,
      }
      const updatedUsageByFeature: UsageByFeature = {
        ...currentUsageByFeature,
        [feature]: {
          requests: featureUsage.requests + 1,
          tokens: featureUsage.tokens + inputTokens + outputTokens,
        },
      }

      // Update usage by provider
      const providerUsage = currentUsageByProvider[provider] ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        byModel: {},
      }
      const modelUsage = providerUsage.byModel[model] ?? {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
      }

      const updatedUsageByProvider: UsageByProvider = {
        ...currentUsageByProvider,
        [provider]: {
          requests: providerUsage.requests + 1,
          inputTokens: providerUsage.inputTokens + inputTokens,
          outputTokens: providerUsage.outputTokens + outputTokens,
          byModel: {
            ...providerUsage.byModel,
            [model]: {
              requests: modelUsage.requests + 1,
              inputTokens: modelUsage.inputTokens + inputTokens,
              outputTokens: modelUsage.outputTokens + outputTokens,
            },
          },
        },
      }

      // Update cost by provider
      const updatedCostByProvider: CostByProvider = {
        ...currentCostByProvider,
        [provider]: (currentCostByProvider[provider] ?? 0) + cost,
      }

      // Calculate new total cost
      const newEstimatedCost = (currentEstimatedCost + cost).toFixed(6)

      await db
        .update(aiUsage)
        .set({
          requests: sql`${aiUsage.requests} + 1`,
          inputTokens: sql`${aiUsage.inputTokens} + ${inputTokens}`,
          outputTokens: sql`${aiUsage.outputTokens} + ${outputTokens}`,
          usageByFeature: updatedUsageByFeature,
          usageByProvider: updatedUsageByProvider,
          costByProvider: updatedCostByProvider,
          estimatedCostUsd: newEstimatedCost,
          updatedAt: new Date(),
        })
        .where(eq(aiUsage.id, existingUsage.id))

      // Get updated record for warnings check
      const updatedUsage = (await db.query.aiUsage.findFirst({
        where: eq(aiUsage.id, existingUsage.id),
      })) as AIUsageRecord | undefined

      return this.checkWarnings(userId, updatedUsage ?? existingUsage)
    } else {
      // Create new usage record
      const usageByFeature: UsageByFeature = {
        [feature]: { requests: 1, tokens: inputTokens + outputTokens },
      }

      const usageByProvider: UsageByProvider = {
        [provider]: {
          requests: 1,
          inputTokens,
          outputTokens,
          byModel: {
            [model]: {
              requests: 1,
              inputTokens,
              outputTokens,
            },
          },
        },
      }

      const costByProvider: CostByProvider = {
        [provider]: cost,
      }

      const [newRecord] = await db
        .insert(aiUsage)
        .values({
          userId,
          periodStart,
          periodEnd,
          requests: 1,
          inputTokens,
          outputTokens,
          usageByFeature,
          usageByProvider,
          costByProvider,
          estimatedCostUsd: cost.toFixed(6),
        })
        .returning()

      return this.checkWarnings(userId, newRecord as AIUsageRecord)
    }
  }

  /**
   * Check usage against thresholds and return warnings
   */
  checkWarnings(userId: string, usage: AIUsageRecord): UsageWarning[] {
    const warnings: UsageWarning[] = []

    // Check monthly cost against thresholds
    const estimatedCost = parseFloat(usage.estimatedCostUsd ?? '0')

    if (estimatedCost >= COST_THRESHOLDS.monthlyHardLimit) {
      warnings.push({
        type: 'cost',
        level: 'critical',
        message: `Monthly cost limit reached: $${estimatedCost.toFixed(2)} of $${COST_THRESHOLDS.monthlyHardLimit} limit`,
        currentValue: estimatedCost,
        threshold: COST_THRESHOLDS.monthlyHardLimit,
        percentage: (estimatedCost / COST_THRESHOLDS.monthlyHardLimit) * 100,
      })
    } else if (estimatedCost >= COST_THRESHOLDS.monthlyWarning) {
      warnings.push({
        type: 'cost',
        level: 'warning',
        message: `Monthly cost warning: $${estimatedCost.toFixed(2)} of $${COST_THRESHOLDS.monthlyWarning} warning threshold`,
        currentValue: estimatedCost,
        threshold: COST_THRESHOLDS.monthlyWarning,
        percentage: (estimatedCost / COST_THRESHOLDS.monthlyWarning) * 100,
      })
    }

    // Check per-provider token usage against limits
    const usageByProvider = (usage.usageByProvider ?? {}) as UsageByProvider

    for (const [providerName, providerUsage] of Object.entries(
      usageByProvider
    )) {
      const limits =
        PROVIDER_LIMITS[providerName as keyof typeof PROVIDER_LIMITS]
      if (!limits) continue

      const totalProviderTokens =
        providerUsage.inputTokens + providerUsage.outputTokens
      const tokenPercentage = totalProviderTokens / limits.tokensPerMonth

      if (tokenPercentage >= 1.0) {
        warnings.push({
          type: 'quota',
          level: 'critical',
          message: `${providerName} token limit reached: ${totalProviderTokens.toLocaleString()} of ${limits.tokensPerMonth.toLocaleString()} tokens`,
          provider: providerName,
          currentValue: totalProviderTokens,
          threshold: limits.tokensPerMonth,
          percentage: tokenPercentage * 100,
        })
      } else if (tokenPercentage >= limits.warningThreshold) {
        warnings.push({
          type: 'quota',
          level: 'warning',
          message: `${providerName} approaching token limit: ${(tokenPercentage * 100).toFixed(1)}% used`,
          provider: providerName,
          currentValue: totalProviderTokens,
          threshold: limits.tokensPerMonth,
          percentage: tokenPercentage * 100,
        })
      }

      // Check request limits
      const requestPercentage = providerUsage.requests / limits.requestsPerMonth

      if (requestPercentage >= 1.0) {
        warnings.push({
          type: 'quota',
          level: 'critical',
          message: `${providerName} request limit reached: ${providerUsage.requests.toLocaleString()} of ${limits.requestsPerMonth.toLocaleString()} requests`,
          provider: providerName,
          currentValue: providerUsage.requests,
          threshold: limits.requestsPerMonth,
          percentage: requestPercentage * 100,
        })
      } else if (requestPercentage >= limits.warningThreshold) {
        warnings.push({
          type: 'quota',
          level: 'warning',
          message: `${providerName} approaching request limit: ${(requestPercentage * 100).toFixed(1)}% used`,
          provider: providerName,
          currentValue: providerUsage.requests,
          threshold: limits.requestsPerMonth,
          percentage: requestPercentage * 100,
        })
      }
    }

    return warnings
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(
    userId: string,
    period: 'current' | 'last' = 'current'
  ): Promise<UsageStats> {
    const { start, end, startStr, endStr } =
      period === 'current'
        ? this.getCurrentMonthPeriod()
        : this.getLastMonthPeriod()

    const usage = (await db.query.aiUsage.findFirst({
      where: and(
        eq(aiUsage.userId, userId),
        eq(aiUsage.periodStart, startStr),
        eq(aiUsage.periodEnd, endStr)
      ),
    })) as AIUsageRecord | undefined

    if (!usage) {
      return {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        periodStart: start,
        periodEnd: end,
        byProvider: {},
        byFeature: {},
        costByProvider: {},
        warnings: [],
      }
    }

    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0

    return {
      totalRequests: usage.requests ?? 0,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: parseFloat(usage.estimatedCostUsd ?? '0'),
      periodStart: start,
      periodEnd: end,
      byProvider: (usage.usageByProvider ?? {}) as UsageByProvider,
      byFeature: (usage.usageByFeature ?? {}) as UsageByFeature,
      costByProvider: (usage.costByProvider ?? {}) as CostByProvider,
      warnings: this.checkWarnings(userId, usage),
    }
  }
}

export const aiUsageService = new AIUsageService()
