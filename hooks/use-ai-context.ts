/**
 * AI Context Hook
 * Manages AI conversation context with auto-save and persistence
 */

'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { AIContext, AIContextType } from '@/types/ai'

/**
 * Context state
 */
export interface ContextState {
  taskId?: string
  projectId?: string
  systemPrompt?: string
  userPreferences?: {
    responseStyle?: 'concise' | 'detailed' | 'balanced'
    expertise?: 'beginner' | 'intermediate' | 'expert'
    tone?: 'formal' | 'casual' | 'professional'
  }
  recentTopics?: string[]
  customInstructions?: string
}

/**
 * Saved context entry
 */
export interface SavedContext {
  id: string
  type: AIContextType
  title?: string
  content: string
  version: number
  isCurrent: boolean
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Options for useAIContext hook
 */
export interface UseAIContextOptions {
  taskId?: string
  projectId?: string
  autoSave?: boolean
  autoSaveDelayMs?: number
  maxVersions?: number
  onContextChange?: (context: ContextState) => void
  onError?: (error: Error) => void
}

/**
 * Return type for useAIContext hook
 */
export interface UseAIContextReturn {
  context: ContextState
  savedContexts: SavedContext[]
  isLoading: boolean
  isSaving: boolean
  error: Error | null
  updateContext: (updates: Partial<ContextState>) => void
  setContext: (context: ContextState) => void
  saveContext: (type: AIContextType, content: string, title?: string) => Promise<SavedContext | null>
  loadContext: (contextId: string) => Promise<void>
  deleteContext: (contextId: string) => Promise<void>
  clearContext: () => void
  refreshContexts: () => Promise<void>
  getContextForType: (type: AIContextType) => SavedContext | undefined
}

/**
 * Debounce hook for auto-save
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Generate unique context ID
 */
function generateContextId(): string {
  return `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Hook for managing AI conversation context
 */
export function useAIContext(options: UseAIContextOptions = {}): UseAIContextReturn {
  const {
    taskId,
    projectId,
    autoSave = true,
    autoSaveDelayMs = 2000,
    maxVersions = 10,
    onContextChange,
    onError,
  } = options

  const [context, setContextState] = useState<ContextState>({
    taskId,
    projectId,
  })
  const [savedContexts, setSavedContexts] = useState<SavedContext[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if context has changed for auto-save
  const contextChangedRef = useRef(false)
  const debouncedContext = useDebounce(context, autoSaveDelayMs)

  /**
   * Update context with partial changes
   */
  const updateContext = useCallback(
    (updates: Partial<ContextState>) => {
      setContextState((prev) => {
        const newContext = { ...prev, ...updates }
        contextChangedRef.current = true
        onContextChange?.(newContext)
        return newContext
      })
    },
    [onContextChange]
  )

  /**
   * Set entire context
   */
  const setContext = useCallback(
    (newContext: ContextState) => {
      setContextState(newContext)
      contextChangedRef.current = true
      onContextChange?.(newContext)
    },
    [onContextChange]
  )

  /**
   * Clear context
   */
  const clearContext = useCallback(() => {
    setContextState({ taskId, projectId })
    contextChangedRef.current = false
    setError(null)
  }, [taskId, projectId])

  /**
   * Load saved contexts from server
   */
  const refreshContexts = useCallback(async () => {
    if (!taskId && !projectId) {
      setSavedContexts([])
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (taskId) params.set('taskId', taskId)
      if (projectId) params.set('projectId', projectId)

      const response = await fetch(`/api/ai/context?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error: ${response.status}`)
      }

      const data = await response.json()

      // Transform to SavedContext format
      const contexts: SavedContext[] = (data.contexts || []).map(
        (ctx: AIContext) => ({
          id: ctx.id,
          type: ctx.type,
          title: ctx.title,
          content: ctx.content,
          version: ctx.version,
          isCurrent: ctx.isCurrent,
          createdAt: new Date(ctx.createdAt),
          updatedAt: new Date(ctx.updatedAt),
          metadata: ctx.metadata,
        })
      )

      setSavedContexts(contexts)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const error = err instanceof Error ? err : new Error('Failed to load contexts')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [taskId, projectId, onError])

  /**
   * Save context to server
   */
  const saveContext = useCallback(
    async (
      type: AIContextType,
      content: string,
      title?: string
    ): Promise<SavedContext | null> => {
      if (!taskId && !projectId) {
        const error = new Error('Either taskId or projectId is required to save context')
        setError(error)
        onError?.(error)
        return null
      }

      setIsSaving(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            projectId,
            type,
            content,
            title,
            maxVersions,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()

        const savedContext: SavedContext = {
          id: data.id || generateContextId(),
          type,
          title,
          content,
          version: data.version || 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: data.metadata,
        }

        // Update saved contexts list
        setSavedContexts((prev) => {
          // Mark previous current as not current
          const updated = prev.map((ctx) =>
            ctx.type === type ? { ...ctx, isCurrent: false } : ctx
          )
          return [savedContext, ...updated].slice(0, maxVersions * 5)
        })

        contextChangedRef.current = false
        return savedContext
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save context')
        setError(error)
        onError?.(error)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [taskId, projectId, maxVersions, onError]
  )

  /**
   * Load a specific context
   */
  const loadContext = useCallback(
    async (contextId: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/ai/context/${contextId}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()

        // Update the specific context in the list
        setSavedContexts((prev) =>
          prev.map((ctx) =>
            ctx.id === contextId
              ? { ...ctx, isCurrent: true }
              : { ...ctx, isCurrent: ctx.type === data.type ? false : ctx.isCurrent }
          )
        )
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load context')
        setError(error)
        onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [onError]
  )

  /**
   * Delete a context
   */
  const deleteContext = useCallback(
    async (contextId: string) => {
      setError(null)

      try {
        const response = await fetch(`/api/ai/context/${contextId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        // Remove from local state
        setSavedContexts((prev) => prev.filter((ctx) => ctx.id !== contextId))
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete context')
        setError(error)
        onError?.(error)
      }
    },
    [onError]
  )

  /**
   * Get the current context for a specific type
   */
  const getContextForType = useCallback(
    (type: AIContextType): SavedContext | undefined => {
      return savedContexts.find((ctx) => ctx.type === type && ctx.isCurrent)
    },
    [savedContexts]
  )

  // Load contexts when task/project changes
  useEffect(() => {
    refreshContexts()
  }, [refreshContexts])

  // Update context when taskId/projectId changes
  useEffect(() => {
    setContextState((prev) => ({
      ...prev,
      taskId,
      projectId,
    }))
  }, [taskId, projectId])

  // Auto-save when context changes (debounced)
  useEffect(() => {
    if (!autoSave || !contextChangedRef.current) return

    // Clear any pending save
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current)
    }

    // Only auto-save if there's meaningful content
    if (debouncedContext.customInstructions || debouncedContext.systemPrompt) {
      pendingSaveRef.current = setTimeout(async () => {
        const contentToSave = JSON.stringify({
          systemPrompt: debouncedContext.systemPrompt,
          customInstructions: debouncedContext.customInstructions,
          userPreferences: debouncedContext.userPreferences,
          recentTopics: debouncedContext.recentTopics,
        })

        await saveContext('note', contentToSave, 'Auto-saved context')
        contextChangedRef.current = false
      }, 0)
    }
  }, [autoSave, debouncedContext, saveContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current)
      }
    }
  }, [])

  return {
    context,
    savedContexts,
    isLoading,
    isSaving,
    error,
    updateContext,
    setContext,
    saveContext,
    loadContext,
    deleteContext,
    clearContext,
    refreshContexts,
    getContextForType,
  }
}

/**
 * Query keys factory for AI context
 */
export const aiContextKeys = {
  all: ['ai-context'] as const,
  forTask: (taskId: string) => [...aiContextKeys.all, 'task', taskId] as const,
  forProject: (projectId: string) => [...aiContextKeys.all, 'project', projectId] as const,
  byId: (contextId: string) => [...aiContextKeys.all, 'detail', contextId] as const,
}

/**
 * Hook for managing research context
 */
export function useResearchContext(taskId: string) {
  const {
    savedContexts,
    isLoading,
    isSaving,
    error,
    saveContext,
    loadContext,
    deleteContext,
    getContextForType,
    refreshContexts,
  } = useAIContext({ taskId, autoSave: false })

  // Filter to only research contexts
  const researchContexts = useMemo(
    () => savedContexts.filter((ctx) => ctx.type === 'research'),
    [savedContexts]
  )

  const currentResearch = useMemo(
    () => getContextForType('research'),
    [getContextForType]
  )

  const saveResearch = useCallback(
    async (content: string, title?: string) => {
      return saveContext('research', content, title || 'Research findings')
    },
    [saveContext]
  )

  return {
    researchContexts,
    currentResearch,
    isLoading,
    isSaving,
    error,
    saveResearch,
    loadContext,
    deleteContext,
    refreshContexts,
  }
}

/**
 * Hook for managing draft context
 */
export function useDraftContext(taskId: string) {
  const {
    savedContexts,
    isLoading,
    isSaving,
    error,
    saveContext,
    loadContext,
    deleteContext,
    getContextForType,
    refreshContexts,
  } = useAIContext({ taskId, autoSave: false })

  // Filter to only draft contexts
  const draftContexts = useMemo(
    () => savedContexts.filter((ctx) => ctx.type === 'draft'),
    [savedContexts]
  )

  const currentDraft = useMemo(
    () => getContextForType('draft'),
    [getContextForType]
  )

  const saveDraft = useCallback(
    async (content: string, title?: string) => {
      return saveContext('draft', content, title || 'Draft')
    },
    [saveContext]
  )

  return {
    draftContexts,
    currentDraft,
    isLoading,
    isSaving,
    error,
    saveDraft,
    loadContext,
    deleteContext,
    refreshContexts,
  }
}

/**
 * Hook for conversation context that persists across sessions
 */
export function useConversationContext(taskId?: string, projectId?: string) {
  const { context, updateContext, clearContext } = useAIContext({
    taskId,
    projectId,
    autoSave: true,
    autoSaveDelayMs: 3000,
  })

  const addTopic = useCallback(
    (topic: string) => {
      const topics = context.recentTopics || []
      if (!topics.includes(topic)) {
        updateContext({
          recentTopics: [topic, ...topics].slice(0, 10),
        })
      }
    },
    [context.recentTopics, updateContext]
  )

  const setSystemPrompt = useCallback(
    (prompt: string) => {
      updateContext({ systemPrompt: prompt })
    },
    [updateContext]
  )

  const setCustomInstructions = useCallback(
    (instructions: string) => {
      updateContext({ customInstructions: instructions })
    },
    [updateContext]
  )

  const setPreferences = useCallback(
    (preferences: ContextState['userPreferences']) => {
      updateContext({ userPreferences: preferences })
    },
    [updateContext]
  )

  return {
    context,
    addTopic,
    setSystemPrompt,
    setCustomInstructions,
    setPreferences,
    clearContext,
  }
}
