/**
 * Search Hooks
 * React hooks for search functionality with debouncing
 *
 * Features:
 * - Debounced search to prevent excessive API calls
 * - Support for searching tasks, projects, or both
 * - Recent items fetching for command palette
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface TaskSearchResult {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectSearchResult {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  taskCount: number
  isArchived: boolean | null
  isFavorite: boolean | null
  createdAt: string
  updatedAt: string
}

export interface SearchResults {
  tasks: TaskSearchResult[]
  projects: ProjectSearchResult[]
  totalTasks: number
  totalProjects: number
  query: string
}

export interface RecentItem {
  id: string
  type: 'task' | 'project'
  title: string
  description: string | null
  color?: string | null
  icon?: string | null
  status?: string
  priority?: string
  dueDate?: string | null
  updatedAt: string
}

export type SearchType = 'all' | 'tasks' | 'projects'

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchSearchResults(
  query: string,
  type: SearchType = 'all',
  limit: number = 10
): Promise<SearchResults> {
  const params = new URLSearchParams({
    q: query,
    type,
    limit: limit.toString(),
  })

  const response = await fetch(`/api/search?${params}`)

  if (!response.ok) {
    throw new Error('Search request failed')
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Search failed')
  }

  return result.data
}

async function fetchRecentItems(limit: number = 5): Promise<RecentItem[]> {
  const params = new URLSearchParams({
    type: 'recent',
    limit: limit.toString(),
  })

  const response = await fetch(`/api/search?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch recent items')
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch recent items')
  }

  return result.data.recent
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Debounced search hook
 *
 * @param query - Search query string
 * @param options - Search options
 * @returns Search state and results
 *
 * @example
 * ```tsx
 * const { results, isLoading, error } = useSearch(searchQuery, { type: 'all' })
 * ```
 */
export function useSearch(
  query: string,
  options: {
    type?: SearchType
    limit?: number
    debounceMs?: number
    minQueryLength?: number
    enabled?: boolean
  } = {}
) {
  const {
    type = 'all',
    limit = 10,
    debounceMs = 300,
    minQueryLength = 2,
    enabled = true,
  } = options

  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchSearchResults(searchQuery, type, limit)
      setResults(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignore abort errors
        return
      }
      setError(err instanceof Error ? err : new Error('Search failed'))
      setResults(null)
    } finally {
      setIsLoading(false)
    }
  }, [type, limit])

  useEffect(() => {
    // Skip if disabled or query is too short
    if (!enabled || query.length < minQueryLength) {
      setResults(null)
      setIsLoading(false)
      return
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, debounceMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [query, enabled, minQueryLength, debounceMs, performSearch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  return {
    results,
    isLoading,
    error,
    clearResults,
    hasResults: results !== null && (results.tasks.length > 0 || results.projects.length > 0),
    isEmpty: results !== null && results.tasks.length === 0 && results.projects.length === 0,
  }
}

/**
 * Hook for fetching recent items
 *
 * @param options - Options for recent items
 * @returns Recent items state
 *
 * @example
 * ```tsx
 * const { recentItems, isLoading } = useRecentItems({ limit: 5 })
 * ```
 */
export function useRecentItems(
  options: {
    limit?: number
    enabled?: boolean
  } = {}
) {
  const { limit = 5, enabled = true } = options

  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRecent = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const items = await fetchRecentItems(limit)
      setRecentItems(items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recent items'))
      setRecentItems([])
    } finally {
      setIsLoading(false)
    }
  }, [limit, enabled])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  return {
    recentItems,
    isLoading,
    error,
    refetch: fetchRecent,
  }
}

/**
 * Combined hook for command palette search
 * Provides both search results and recent items
 *
 * @param query - Search query (empty string shows recent items)
 * @returns Combined search and recent items state
 */
export function useCommandPaletteSearch(query: string) {
  const trimmedQuery = query.trim()

  const {
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    hasResults,
    isEmpty: isEmptySearch,
  } = useSearch(trimmedQuery, {
    type: 'all',
    limit: 5,
    debounceMs: 200,
    minQueryLength: 1,
    enabled: trimmedQuery.length > 0,
  })

  const {
    recentItems,
    isLoading: isLoadingRecent,
    error: recentError,
  } = useRecentItems({
    limit: 5,
    enabled: trimmedQuery.length === 0,
  })

  const isLoading = trimmedQuery.length > 0 ? isSearching : isLoadingRecent
  const error = trimmedQuery.length > 0 ? searchError : recentError

  return {
    // Search results (when there's a query)
    searchResults,
    hasSearchResults: hasResults,
    isEmptySearch,

    // Recent items (when there's no query)
    recentItems,
    showingRecent: trimmedQuery.length === 0,

    // Common state
    isLoading,
    error,
    query: trimmedQuery,
  }
}
