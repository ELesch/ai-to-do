/**
 * Daily Briefing Hook
 * Fetches and manages daily briefing data with caching
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface BriefingTask {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low' | 'none'
  dueDate?: string | null
  status: string
  projectName?: string | null
}

export interface AIInsights {
  workloadAssessment: 'light' | 'moderate' | 'heavy'
  workloadExplanation: string
  priorityRecommendations: string[]
  timeBlockingSuggestions: string[]
  motivationalNote?: string
}

export interface RecentActivity {
  completedToday: number
  completedThisWeek: number
  createdToday: number
}

export interface DailyBriefing {
  tasksDueToday: BriefingTask[]
  overdueTasks: BriefingTask[]
  suggestedTasks: BriefingTask[]
  recentActivity: RecentActivity
  aiInsights: AIInsights
  generatedAt: string
  cachedUntil: string
}

export interface UseDailyBriefingOptions {
  autoFetch?: boolean
  onError?: (error: Error) => void
}

export interface UseDailyBriefingReturn {
  briefing: DailyBriefing | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
  isCached: boolean
}

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  briefing: DailyBriefing
  fetchedAt: Date
}

// Client-side cache for the briefing
let briefingCache: CacheEntry | null = null

/**
 * Check if cached briefing is still valid
 */
function isCacheValid(): boolean {
  if (!briefingCache) return false

  const now = new Date()
  const cachedUntil = new Date(briefingCache.briefing.cachedUntil)

  return now < cachedUntil
}

/**
 * Clear the client-side cache
 */
export function clearBriefingCache(): void {
  briefingCache = null
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching and managing daily briefing data
 */
export function useDailyBriefing(
  options: UseDailyBriefingOptions = {}
): UseDailyBriefingReturn {
  const { autoFetch = true, onError } = options

  const [briefing, setBriefing] = useState<DailyBriefing | null>(
    briefingCache?.briefing ?? null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    briefingCache?.fetchedAt ?? null
  )
  const [isCached, setIsCached] = useState(isCacheValid())

  const abortControllerRef = useRef<AbortController | null>(null)
  const hasFetchedRef = useRef(false)

  /**
   * Fetch briefing from API
   */
  const fetchBriefing = useCallback(
    async (forceRefresh = false) => {
      // Cancel any pending request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && isCacheValid() && briefingCache) {
        setBriefing(briefingCache.briefing)
        setLastUpdated(briefingCache.fetchedAt)
        setIsCached(true)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const url = new URL('/api/ai/briefing', window.location.origin)
        if (forceRefresh) {
          url.searchParams.set('refresh', 'true')
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch briefing')
        }

        const briefingData = data.data as DailyBriefing

        // Update cache
        briefingCache = {
          briefing: briefingData,
          fetchedAt: new Date(),
        }

        setBriefing(briefingData)
        setLastUpdated(new Date())
        setIsCached(false)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return

        const error =
          err instanceof Error ? err : new Error('Failed to fetch briefing')
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [onError]
  )

  /**
   * Refresh the briefing (bypasses cache)
   */
  const refresh = useCallback(async () => {
    await fetchBriefing(true)
  }, [fetchBriefing])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchBriefing(false)
    }
  }, [autoFetch, fetchBriefing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    briefing,
    isLoading,
    error,
    refresh,
    lastUpdated,
    isCached,
  }
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const dailyBriefingKeys = {
  all: ['daily-briefing'] as const,
  current: () => [...dailyBriefingKeys.all, 'current'] as const,
}
