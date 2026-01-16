/**
 * Task Enrichment Hook
 * Manages AI-powered task enrichment state and interactions
 *
 * This hook provides:
 * - Debounced enrichment requests (500ms)
 * - Proposal management
 * - Apply selected enrichment fields to tasks
 * - Proper error handling and loading states
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  EnrichmentProposal,
  EnrichmentResponse,
  EnrichmentInsights,
  SimilarityAnalysis,
} from '@/types/ai'

/**
 * Complete enrichment data returned from the API
 */
export interface EnrichmentData {
  proposal: EnrichmentProposal
  similarTasks: SimilarityAnalysis
  insights: EnrichmentInsights
}

/**
 * Options for the useTaskEnrichment hook
 */
export interface UseTaskEnrichmentOptions {
  /** Callback when enrichment succeeds */
  onSuccess?: (data: EnrichmentData) => void
  /** Callback when enrichment fails */
  onError?: (error: Error) => void
  /** Callback when apply succeeds */
  onApplySuccess?: () => void
  /** Callback when apply fails */
  onApplyError?: (error: Error) => void
  /** Debounce delay in milliseconds (default: 500) */
  debounceMs?: number
}

/**
 * Return type for the useTaskEnrichment hook
 */
export interface UseTaskEnrichmentReturn {
  /** The current enrichment proposal */
  proposal: EnrichmentProposal | null
  /** Similar tasks analysis */
  similarTasks: SimilarityAnalysis | null
  /** Enrichment insights */
  insights: EnrichmentInsights | null
  /** Whether an enrichment request is in progress */
  isLoading: boolean
  /** Whether an apply request is in progress */
  isApplying: boolean
  /** Current error if any */
  error: Error | null
  /** Request enrichment for a task title and optional description */
  enrich: (title: string, description?: string, projectId?: string) => void
  /** Apply selected enrichment fields to a task */
  apply: (
    proposalId: string,
    acceptedFields: string[],
    modifications?: Record<string, unknown>
  ) => Promise<void>
  /** Clear current proposal and error state */
  clear: () => void
  /** Cancel any pending enrichment request */
  cancel: () => void
}

/**
 * Debounce delay constant (500ms as specified in plan)
 */
const DEFAULT_DEBOUNCE_MS = 500

/**
 * Hook for managing AI-powered task enrichment
 *
 * @example
 * ```tsx
 * const { proposal, isLoading, error, enrich, apply } = useTaskEnrichment({
 *   onSuccess: (data) => console.log('Enrichment received:', data),
 *   onError: (err) => console.error('Enrichment failed:', err),
 * })
 *
 * // Trigger enrichment (debounced)
 * enrich('Plan birthday party')
 *
 * // Apply selected fields
 * await apply(proposalId, ['title', 'description', 'subtasks'])
 * ```
 */
export function useTaskEnrichment(
  options: UseTaskEnrichmentOptions = {}
): UseTaskEnrichmentReturn {
  const {
    onSuccess,
    onError,
    onApplySuccess,
    onApplyError,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options

  // State
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null)
  const [similarTasks, setSimilarTasks] = useState<SimilarityAnalysis | null>(
    null
  )
  const [insights, setInsights] = useState<EnrichmentInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Refs for debouncing and abort handling
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
   * Cancel any pending enrichment request
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
    setProposal(null)
    setSimilarTasks(null)
    setInsights(null)
    setError(null)
  }, [cancel])

  /**
   * Internal function to perform the enrichment API call
   */
  const performEnrich = useCallback(
    async (title: string, description?: string, projectId?: string) => {
      // Cancel any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/enrich', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description?.trim(),
            projectId,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data: EnrichmentResponse = await response.json()

        if (data.success && data.data) {
          setProposal(data.data.proposal)
          setSimilarTasks(data.data.similarTasks)
          setInsights(data.data.insights)
          onSuccess?.(data.data)
        } else {
          throw new Error('Invalid response from enrichment API')
        }
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
    [onSuccess, onError]
  )

  /**
   * Request enrichment for a task (debounced by 500ms)
   */
  const enrich = useCallback(
    (title: string, description?: string, projectId?: string) => {
      // Don't enrich empty titles
      if (!title.trim()) {
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
        performEnrich(title, description, projectId)
      }, debounceMs)
    },
    [performEnrich, clear, debounceMs]
  )

  /**
   * Apply selected enrichment fields to a task
   */
  const apply = useCallback(
    async (
      proposalId: string,
      acceptedFields: string[],
      modifications?: Record<string, unknown>
    ) => {
      if (!proposalId || acceptedFields.length === 0) {
        return
      }

      setIsApplying(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/enrich/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proposalId,
            acceptedFields,
            modifications,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        // Clear proposal after successful apply
        clear()
        onApplySuccess?.()
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to apply enrichment')
        setError(error)
        onApplyError?.(error)
        throw error
      } finally {
        setIsApplying(false)
      }
    },
    [clear, onApplySuccess, onApplyError]
  )

  return {
    proposal,
    similarTasks,
    insights,
    isLoading,
    isApplying,
    error,
    enrich,
    apply,
    clear,
    cancel,
  }
}

/**
 * Query keys factory for task enrichment
 */
export const taskEnrichmentKeys = {
  all: ['task-enrichment'] as const,
  proposals: () => [...taskEnrichmentKeys.all, 'proposals'] as const,
  proposal: (id: string) => [...taskEnrichmentKeys.proposals(), id] as const,
}
