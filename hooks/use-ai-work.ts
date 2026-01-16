/**
 * AI Work Hook
 * Manages AI work generation for tasks and subtasks
 *
 * This hook provides:
 * - AI work generation (research, draft, plan, outline)
 * - Artifact management
 * - Proper error handling and loading states
 * - Request cancellation
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AIWorkType, DoWorkResponse, DoWorkResponseData } from '@/types/ai'

/**
 * AI work artifact returned from the API
 */
export interface AIWorkArtifact {
  /** Unique identifier for the artifact */
  artifactId: string
  /** Type of work performed */
  type: AIWorkType
  /** Title of the generated artifact */
  title: string
  /** The generated content */
  content: string
  /** Suggested next steps after this work */
  suggestedNextSteps?: string[]
}

/**
 * Options for the useAIWork hook
 */
export interface UseAIWorkOptions {
  /** Callback when work generation succeeds */
  onSuccess?: (artifact: AIWorkArtifact) => void
  /** Callback when work generation fails */
  onError?: (error: Error) => void
  /** Callback when work generation starts */
  onStart?: () => void
}

/**
 * Return type for the useAIWork hook
 */
export interface UseAIWorkReturn {
  /** The generated artifact */
  artifact: AIWorkArtifact | null
  /** Whether work generation is in progress */
  isLoading: boolean
  /** Current error if any */
  error: Error | null
  /** Request AI to perform work */
  doWork: (
    taskId: string,
    subtaskId: string,
    workType: AIWorkType,
    context?: string
  ) => Promise<AIWorkArtifact | null>
  /** Clear the artifact and error state */
  clear: () => void
  /** Cancel any pending work request */
  cancel: () => void
}

/**
 * Hook for AI work generation
 *
 * @example
 * ```tsx
 * const { artifact, isLoading, error, doWork, clear } = useAIWork({
 *   onSuccess: (artifact) => console.log('Work completed:', artifact),
 *   onError: (err) => console.error('Work failed:', err),
 * })
 *
 * // Generate research
 * const result = await doWork(taskId, subtaskId, 'research', 'Additional context')
 *
 * // Generate a draft
 * await doWork(taskId, subtaskId, 'draft')
 *
 * // Generate a plan
 * await doWork(taskId, subtaskId, 'plan')
 * ```
 */
export function useAIWork(options: UseAIWorkOptions = {}): UseAIWorkReturn {
  const { onSuccess, onError, onStart } = options

  // State
  const [artifact, setArtifact] = useState<AIWorkArtifact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Ref for abort handling
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Cancel any pending work request
   */
  const cancel = useCallback(() => {
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
    setArtifact(null)
    setError(null)
  }, [cancel])

  /**
   * Request AI to perform work on a subtask
   */
  const doWork = useCallback(
    async (
      taskId: string,
      subtaskId: string,
      workType: AIWorkType,
      context?: string
    ): Promise<AIWorkArtifact | null> => {
      if (!taskId || !subtaskId || !workType) {
        const error = new Error('taskId, subtaskId, and workType are required')
        setError(error)
        onError?.(error)
        return null
      }

      // Cancel any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)
      onStart?.()

      try {
        const response = await fetch('/api/ai/do-work', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId,
            subtaskId,
            workType,
            context: context?.trim(),
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data: DoWorkResponse = await response.json()

        if (data.success && data.data) {
          const workArtifact: AIWorkArtifact = {
            artifactId: data.data.artifactId,
            type: data.data.type,
            title: data.data.title,
            content: data.data.content,
            suggestedNextSteps: data.data.suggestedNextSteps,
          }

          setArtifact(workArtifact)
          onSuccess?.(workArtifact)
          return workArtifact
        } else {
          throw new Error('Invalid response from do-work API')
        }
      } catch (err) {
        // Ignore abort errors
        if ((err as Error).name === 'AbortError') {
          return null
        }

        const error =
          err instanceof Error ? err : new Error('Unknown error occurred')
        setError(error)
        onError?.(error)
        return null
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [onSuccess, onError, onStart]
  )

  return {
    artifact,
    isLoading,
    error,
    doWork,
    clear,
    cancel,
  }
}

/**
 * Helper function to check if a work type can be performed by AI
 */
export function canAIDoWork(workType: string): boolean {
  const supportedTypes: AIWorkType[] = ['research', 'draft', 'plan', 'outline']
  return supportedTypes.includes(workType as AIWorkType)
}

/**
 * Get a human-readable label for a work type
 */
export function getWorkTypeLabel(workType: AIWorkType): string {
  const labels: Record<AIWorkType, string> = {
    research: 'Research',
    draft: 'Draft',
    plan: 'Plan',
    outline: 'Outline',
  }
  return labels[workType] || workType
}

/**
 * Get a description for a work type
 */
export function getWorkTypeDescription(workType: AIWorkType): string {
  const descriptions: Record<AIWorkType, string> = {
    research: 'Gather information, find options, and compare alternatives',
    draft: 'Write emails, documents, or outlines',
    plan: 'Create step-by-step approaches, timelines, or checklists',
    outline: 'Create structured outlines for documents or projects',
  }
  return descriptions[workType] || ''
}

/**
 * Query keys factory for AI work
 */
export const aiWorkKeys = {
  all: ['ai-work'] as const,
  artifacts: () => [...aiWorkKeys.all, 'artifacts'] as const,
  artifact: (id: string) => [...aiWorkKeys.artifacts(), id] as const,
  taskArtifacts: (taskId: string) =>
    [...aiWorkKeys.artifacts(), 'task', taskId] as const,
  subtaskArtifacts: (subtaskId: string) =>
    [...aiWorkKeys.artifacts(), 'subtask', subtaskId] as const,
}
