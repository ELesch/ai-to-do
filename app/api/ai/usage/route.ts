import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { aiUsageService } from '@/services/ai-usage.service'
import { PROVIDER_LIMITS, COST_THRESHOLDS } from '@/lib/ai/config'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const stats = await aiUsageService.getUsageStats(user.id)

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: stats.periodStart,
          end: stats.periodEnd,
        },
        totals: {
          requests: stats.totalRequests,
          inputTokens: stats.totalInputTokens,
          outputTokens: stats.totalOutputTokens,
          tokens: stats.totalTokens,
          cost: stats.estimatedCostUsd,
        },
        byProvider: stats.byProvider,
        byFeature: stats.byFeature,
        costByProvider: stats.costByProvider,
        warnings: stats.warnings,
        limits: {
          providers: PROVIDER_LIMITS,
          cost: COST_THRESHOLDS,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}
