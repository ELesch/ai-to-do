/**
 * AI Suggestions Hook
 * Provides task suggestions with debouncing and caching
 */

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { AISuggestion } from '@/types/ai'
import type { Task } from '@/types/task'

/**
 * Suggestion types
 */
export type SuggestionType =
  | 'task_title'
  | 'task_description'
  | 'subtasks'
  | 'due_date'
  | 'priority'
  | 'next_action'

/**
 * Task suggestion with confidence score
 */
export interface TaskSuggestion {
  id: string
  type: SuggestionType
  content: string
  confidence: number
  metadata?: {
    reasoning?: string
    basedOn?: string
  }
}

/**
 * Options for the useAISuggestions hook
 */
export interface UseAISuggestionsOptions {
  taskId?: string
  projectId?: string
  debounceMs?: number
  cacheMaxSize?: number
  cacheTTLMs?: number
  minConfidence?: number
  onError?: (error: Error) => void
}

/**
 * Return type for the useAISuggestions hook
 */
export interface UseAISuggestionsReturn {
  suggestions: TaskSuggestion[]
  isLoading: boolean
  error: Error | null
  getSuggestions: (content: string, type?: SuggestionType) => void
  clearSuggestions: () => void
  acceptSuggestion: (suggestionId: string) => TaskSuggestion | undefined
  dismissSuggestion: (suggestionId: string) => void
  refreshSuggestions: () => void
}

/**
 * Cache entry type
 */
interface CacheEntry {
  suggestions: TaskSuggestion[]
  timestamp: number
}

/**
 * Simple LRU cache implementation for suggestions
 */
class SuggestionCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private ttl: number

  constructor(maxSize: number = 50, ttlMs: number = 5 * 60 * 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttlMs
  }

  get(key: string): TaskSuggestion[] | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.suggestions
  }

  set(key: string, suggestions: TaskSuggestion[]): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      suggestions,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  generateKey(content: string, type?: SuggestionType, taskId?: string): string {
    const parts = [content.trim().toLowerCase().slice(0, 100)]
    if (type) parts.push(type)
    if (taskId) parts.push(taskId)
    return parts.join('::')
  }
}

/**
 * Debounce function with cleanup
 */
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedFn = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
        timeoutRef.current = null
      }, delay)
    }) as T,
    [callback, delay]
  )

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [debouncedFn, cancel]
}

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(): string {
  return `sug-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Hook for getting AI-powered task suggestions
 */
export function useAISuggestions(
  options: UseAISuggestionsOptions = {}
): UseAISuggestionsReturn {
  const {
    taskId,
    projectId,
    debounceMs = 500,
    cacheMaxSize = 50,
    cacheTTLMs = 5 * 60 * 1000, // 5 minutes
    minConfidence = 0.5,
    onError,
  } = options

  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Keep track of last request for refresh
  const lastRequestRef = useRef<{ content: string; type?: SuggestionType } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cache instance
  const cache = useMemo(
    () => new SuggestionCache(cacheMaxSize, cacheTTLMs),
    [cacheMaxSize, cacheTTLMs]
  )

  /**
   * Fetch suggestions from API
   */
  const fetchSuggestions = useCallback(
    async (content: string, type?: SuggestionType) => {
      if (!content.trim()) {
        setSuggestions([])
        return
      }

      // Store request for refresh capability
      lastRequestRef.current = { content, type }

      // Check cache first
      const cacheKey = cache.generateKey(content, type, taskId)
      const cached = cache.get(cacheKey)
      if (cached) {
        setSuggestions(cached)
        return
      }

      // Cancel any pending request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            type,
            taskId,
            projectId,
            minConfidence,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()

        // Transform API response to TaskSuggestion format
        const transformedSuggestions: TaskSuggestion[] = (
          data.suggestions || []
        ).map((s: { type?: SuggestionType; content?: string; confidence?: number; reasoning?: string }) => ({
          id: generateSuggestionId(),
          type: s.type || type || 'next_action',
          content: s.content || '',
          confidence: s.confidence || 0.7,
          metadata: {
            reasoning: s.reasoning,
            basedOn: content,
          },
        }))

        // Filter by minimum confidence
        const filteredSuggestions = transformedSuggestions.filter(
          (s) => s.confidence >= minConfidence
        )

        // Cache the results
        cache.set(cacheKey, filteredSuggestions)
        setSuggestions(filteredSuggestions)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return

        const error = err instanceof Error ? err : new Error('Failed to get suggestions')
        setError(error)
        onError?.(error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [taskId, projectId, minConfidence, cache, onError]
  )

  // Create debounced version of fetchSuggestions
  const [debouncedFetch, cancelDebounce] = useDebouncedCallback(
    fetchSuggestions,
    debounceMs
  )

  /**
   * Get suggestions (debounced)
   */
  const getSuggestions = useCallback(
    (content: string, type?: SuggestionType) => {
      debouncedFetch(content, type)
    },
    [debouncedFetch]
  )

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    cancelDebounce()
    abortControllerRef.current?.abort()
    setSuggestions([])
    setError(null)
    lastRequestRef.current = null
  }, [cancelDebounce])

  /**
   * Accept a suggestion and return it
   */
  const acceptSuggestion = useCallback(
    (suggestionId: string): TaskSuggestion | undefined => {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (suggestion) {
        // Remove accepted suggestion from the list
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
      }
      return suggestion
    },
    [suggestions]
  )

  /**
   * Dismiss a suggestion
   */
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
  }, [])

  /**
   * Refresh suggestions using the last request
   */
  const refreshSuggestions = useCallback(() => {
    if (lastRequestRef.current) {
      // Bypass cache by clearing the specific entry
      const { content, type } = lastRequestRef.current
      fetchSuggestions(content, type)
    }
  }, [fetchSuggestions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelDebounce()
      abortControllerRef.current?.abort()
    }
  }, [cancelDebounce])

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    refreshSuggestions,
  }
}

/**
 * Query keys factory for AI suggestions
 */
export const aiSuggestionsKeys = {
  all: ['ai-suggestions'] as const,
  forTask: (taskId: string) => [...aiSuggestionsKeys.all, 'task', taskId] as const,
  forProject: (projectId: string) => [...aiSuggestionsKeys.all, 'project', projectId] as const,
}

/**
 * Hook for getting smart action suggestions for a task
 */
export function useTaskActionSuggestions(task: Task | null) {
  const [actions, setActions] = useState<AISuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchActions = useCallback(async () => {
    if (!task) {
      setActions([])
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/task-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error: ${response.status}`)
      }

      const data = await response.json()
      setActions(data.actions || [])
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const error = err instanceof Error ? err : new Error('Failed to get actions')
      setError(error)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [task])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    actions,
    isLoading,
    error,
    fetchActions,
  }
}

/**
 * Hook for getting title suggestions while typing
 */
export function useTitleSuggestions(projectId?: string) {
  const { suggestions, isLoading, error, getSuggestions, clearSuggestions } =
    useAISuggestions({
      projectId,
      debounceMs: 300,
      minConfidence: 0.6,
    })

  const getCompletions = useCallback(
    (partialTitle: string) => {
      if (partialTitle.length < 3) {
        clearSuggestions()
        return
      }
      getSuggestions(partialTitle, 'task_title')
    },
    [getSuggestions, clearSuggestions]
  )

  return {
    completions: suggestions.map((s) => s.content),
    isLoading,
    error,
    getCompletions,
    clearCompletions: clearSuggestions,
  }
}
