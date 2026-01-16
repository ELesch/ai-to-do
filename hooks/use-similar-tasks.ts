/**
 * Similar Tasks Hook
 * Fetches similar completed tasks when title changes (debounced)
 *
 * This hook provides:
 * - Automatic fetching when title changes
 * - Debounced requests to avoid excessive API calls
 * - Similar tasks with execution insights
 * - Proper error handling and loading states
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SimilarTaskMatch, ExecutionInsights } from '@/types/ai'

/**
 * Similar task with execution data from the API
 */
export interface SimilarTask {
  /** The ID of the similar task */
  id: string
  /** The title of the similar task */
  title: string
  /** Similarity score from 0-100 */
  similarityScore: number
  /** Reasons why this task was matched */
  matchReasons: string[]
  /** Execution data from when this task was completed */
  executionData: {
    estimatedMinutes: number
    actualMinutes: number
    subtasksAdded: number
    outcome: string
  }
}

/**
 * Options for the useSimilarTasks hook
 */
export interface UseSimilarTasksOptions {
  /** Maximum number of similar tasks to fetch (default: 5) */
  limit?: number
  /** Debounce delay in milliseconds (default: 500) */
  debounceMs?: number
  /** Minimum title length to trigger fetch (default: 3) */
  minTitleLength?: number
  /** Whether to auto-fetch when title changes (default: true) */
  autoFetch?: boolean
  /** Callback when fetch succeeds */
  onSuccess?: (tasks: SimilarTask[]) => void
  /** Callback when fetch fails */
  onError?: (error: Error) => void
}

/**
 * Return type for the useSimilarTasks hook
 */
export interface UseSimilarTasksReturn {
  /** List of similar tasks */
  similarTasks: SimilarTask[]
  /** Whether a fetch is in progress */
  isLoading: boolean
  /** Current error if any */
  error: Error | null
  /** Manually trigger a fetch */
  fetch: (title: string, description?: string) => void
  /** Clear the similar tasks and error state */
  clear: () => void
  /** Cancel any pending request */
  cancel: () => void
}

/**
 * Default debounce delay (500ms as specified in plan)
 */
const DEFAULT_DEBOUNCE_MS = 500

/**
 * Default limit for similar tasks
 */
const DEFAULT_LIMIT = 5

/**
 * Minimum title length to trigger automatic fetch
 */
const DEFAULT_MIN_TITLE_LENGTH = 3

/**
 * Hook for fetching similar completed tasks
 *
 * @example
 * ```tsx
 * // Basic usage with automatic fetching
 * const { similarTasks, isLoading, error } = useSimilarTasks(taskTitle, taskDescription)
 *
 * // Manual fetching
 * const { similarTasks, fetch, isLoading } = useSimilarTasks(null, null, {
 *   autoFetch: false,
 * })
 * fetch('Plan birthday party', 'For mom')
 * ```
 */
export function useSimilarTasks(
  title?: string | null,
  description?: string | null,
  options: UseSimilarTasksOptions = {}
): UseSimilarTasksReturn {
  const {
    limit = DEFAULT_LIMIT,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minTitleLength = DEFAULT_MIN_TITLE_LENGTH,
    autoFetch = true,
    onSuccess,
    onError,
  } = options

  // State
  const [similarTasks, setSimilarTasks] = useState<SimilarTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Refs for debouncing and abort handling
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchedTitleRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Cancel any pending request
   */
  const cancel = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
  }, [])

  /**
   * Clear all state
   */
  const clear = useCallback(() => {
    cancel()
    setSimilarTasks([])
    setError(null)
    lastFetchedTitleRef.current = null
  }, [cancel])

  /**
   * Internal function to perform the API call
   */
  const performFetch = useCallback(
    async (fetchTitle: string, fetchDescription?: string) => {
      // Don't refetch for the same title
      if (lastFetchedTitleRef.current === fetchTitle.trim()) {
        return
      }

      // Cancel any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/similar-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: fetchTitle.trim(),
            description: fetchDescription?.trim(),
            limit,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()

        // Transform API response to SimilarTask format
        const tasks: SimilarTask[] = (data.tasks || []).map(
          (task: {
            id: string
            title: string
            similarityScore: number
            matchReasons: string[]
            executionData: {
              estimatedMinutes: number
              actualMinutes: number
              subtasksAdded: number
              outcome: string
            }
          }) => ({
            id: task.id,
            title: task.title,
            similarityScore: task.similarityScore,
            matchReasons: task.matchReasons,
            executionData: task.executionData,
          })
        )

        setSimilarTasks(tasks)
        lastFetchedTitleRef.current = fetchTitle.trim()
        onSuccess?.(tasks)
      } catch (err) {
        // Ignore abort errors
        if ((err as Error).name === 'AbortError') {
          return
        }

        const error =
          err instanceof Error ? err : new Error('Unknown error occurred')
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [limit, onSuccess, onError]
  )

  /**
   * Manually trigger a fetch (debounced)
   */
  const fetchSimilar = useCallback(
    (fetchTitle: string, fetchDescription?: string) => {
      // Don't fetch for short titles
      if (!fetchTitle.trim() || fetchTitle.trim().length < minTitleLength) {
        clear()
        return
      }

      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set new debounce timeout
      debounceTimeoutRef.current = setTimeout(() => {
        debounceTimeoutRef.current = null
        performFetch(fetchTitle, fetchDescription)
      }, debounceMs)
    },
    [performFetch, clear, debounceMs, minTitleLength]
  )

  // Auto-fetch when title changes
  useEffect(() => {
    if (!autoFetch || !title) {
      return
    }

    fetchSimilar(title, description || undefined)
  }, [title, description, autoFetch, fetchSimilar])

  return {
    similarTasks,
    isLoading,
    error,
    fetch: fetchSimilar,
    clear,
    cancel,
  }
}

/**
 * Query keys factory for similar tasks
 */
export const similarTasksKeys = {
  all: ['similar-tasks'] as const,
  search: (title: string) =>
    [...similarTasksKeys.all, 'search', title] as const,
}
