'use client'

import { useEffect, useState, useCallback } from 'react'
import type { UsageWarning } from '@/lib/ai/providers/types'

interface UsageStats {
  period: {
    start: string
    end: string
  }
  totals: {
    requests: number
    tokens: number
    cost: number
  }
  warnings: UsageWarning[]
}

interface UseAIUsageNotificationsReturn {
  /** Current usage warnings */
  warnings: UsageWarning[]
  /** Whether there are any active warnings */
  hasWarnings: boolean
  /** Whether there are critical-level warnings */
  hasCritical: boolean
  /** Full usage stats */
  stats: UsageStats | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Dismiss a specific warning by index */
  dismissWarning: (index: number) => void
  /** Refresh usage data */
  refresh: () => Promise<void>
}

/**
 * Hook for managing AI usage notifications and warnings
 * Fetches usage stats and provides warning state management
 */
export function useAIUsageNotifications(): UseAIUsageNotificationsReturn {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [dismissedIndices, setDismissedIndices] = useState<Set<number>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ai/usage')
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats')
      }

      const data = await response.json()
      if (data.success) {
        setStats({
          period: data.data.period,
          totals: data.data.totals,
          warnings: data.data.warnings || [],
        })
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch usage stats'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsageStats()
  }, [fetchUsageStats])

  const dismissWarning = useCallback((index: number) => {
    setDismissedIndices((prev) => new Set(prev).add(index))
  }, [])

  const activeWarnings = (stats?.warnings || []).filter(
    (_, index) => !dismissedIndices.has(index)
  )

  return {
    warnings: activeWarnings,
    hasWarnings: activeWarnings.length > 0,
    hasCritical: activeWarnings.some((w) => w.level === 'critical'),
    stats,
    isLoading,
    error,
    dismissWarning,
    refresh: fetchUsageStats,
  }
}
