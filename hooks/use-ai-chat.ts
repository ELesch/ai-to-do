/**
 * AI Chat Hook
 * Manages AI conversation state and interactions with streaming support
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage, ChatResponse, MessageRole } from '@/types/ai'

/**
 * Message type for the chat hook
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: {
    tokensUsed?: number
    model?: string
    processingTimeMs?: number
  }
}

/**
 * Options for the useAIChat hook
 */
export interface UseAIChatOptions {
  taskId?: string
  projectId?: string
  initialMessages?: Message[]
  onError?: (error: Error) => void
  onStreamStart?: () => void
  onStreamEnd?: () => void
}

/**
 * Return type for the useAIChat hook
 */
export interface UseAIChatReturn {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  regenerateLastResponse: () => Promise<void>
  stopStreaming: () => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

/**
 * Generate a unique message ID
 */
function generateMessageId(role: MessageRole): string {
  return `msg-${Date.now()}-${role}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Parse streaming response chunks
 */
async function* parseStreamResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6)
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            yield parsed.content
          } else if (parsed.delta?.content) {
            yield parsed.delta.content
          } else if (typeof parsed === 'string') {
            yield parsed
          }
        } catch {
          // If JSON parse fails, yield raw data
          if (data && data !== '[DONE]') {
            yield data
          }
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const trimmedBuffer = buffer.trim()
    if (trimmedBuffer.startsWith('data: ')) {
      const data = trimmedBuffer.slice(6)
      if (data && data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            yield parsed.content
          } else if (parsed.delta?.content) {
            yield parsed.delta.content
          }
        } catch {
          yield data
        }
      }
    }
  }
}

/**
 * Hook for managing AI chat interactions with streaming support
 */
export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const {
    taskId,
    projectId,
    initialMessages = [],
    onError,
    onStreamStart,
    onStreamEnd,
  } = options

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Stop the current streaming response
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
      setIsLoading(false)
      onStreamEnd?.()

      // Mark the last assistant message as complete
      setMessages((prev) => {
        const lastIdx = prev.findLastIndex((m) => m.role === 'assistant')
        if (lastIdx !== -1 && prev[lastIdx].isStreaming) {
          const updated = [...prev]
          updated[lastIdx] = { ...updated[lastIdx], isStreaming: false }
          return updated
        }
        return prev
      })
    }
  }, [onStreamEnd])

  /**
   * Send a message and handle streaming response
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      // Cancel any existing request
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      const userMessage: Message = {
        id: generateMessageId('user'),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setIsStreaming(false)
      setError(null)

      // Create placeholder for assistant message
      const assistantMessageId = generateMessageId('assistant')
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, assistantMessage])

      try {
        const conversationHistory = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId,
            projectId,
            message: content.trim(),
            conversationHistory,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        // Check if response is streaming (SSE)
        const contentType = response.headers.get('content-type') || ''
        const isSSE = contentType.includes('text/event-stream')

        if (isSSE && response.body) {
          // Handle streaming response
          setIsStreaming(true)
          onStreamStart?.()

          const reader = response.body.getReader()
          let fullContent = ''

          try {
            for await (const chunk of parseStreamResponse(reader)) {
              fullContent += chunk
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === assistantMessageId)
                if (idx !== -1) {
                  const updated = [...prev]
                  updated[idx] = { ...updated[idx], content: fullContent }
                  return updated
                }
                return prev
              })
            }
          } finally {
            reader.releaseLock()
          }

          // Mark message as complete
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMessageId)
            if (idx !== -1) {
              const updated = [...prev]
              updated[idx] = {
                ...updated[idx],
                content: fullContent,
                isStreaming: false,
                timestamp: new Date(),
              }
              return updated
            }
            return prev
          })
        } else {
          // Handle non-streaming JSON response
          const data: ChatResponse = await response.json()

          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === assistantMessageId)
            if (idx !== -1) {
              const updated = [...prev]
              updated[idx] = {
                ...updated[idx],
                content: data.response,
                isStreaming: false,
                timestamp: new Date(),
                metadata: data.usage
                  ? {
                      tokensUsed: data.usage.inputTokens + data.usage.outputTokens,
                    }
                  : undefined,
              }
              return updated
            }
            return prev
          })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Request was cancelled, don't treat as error
          return
        }

        const error = err instanceof Error ? err : new Error('Unknown error occurred')
        setError(error)
        onError?.(error)

        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
      } finally {
        setIsLoading(false)
        setIsStreaming(false)
        onStreamEnd?.()
        abortControllerRef.current = null
      }
    },
    [taskId, projectId, messages, onError, onStreamStart, onStreamEnd]
  )

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    stopStreaming()
    setMessages([])
    setError(null)
  }, [stopStreaming])

  /**
   * Regenerate the last assistant response
   */
  const regenerateLastResponse = useCallback(async () => {
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')

    if (!lastUserMessage) return

    // Remove messages after the last user message
    setMessages((prev) => {
      const lastUserIdx = prev.findLastIndex((m) => m.role === 'user')
      if (lastUserIdx === -1) return prev
      return prev.slice(0, lastUserIdx)
    })

    // Resend the last user message
    await sendMessage(lastUserMessage.content)
  }, [messages, sendMessage])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    regenerateLastResponse,
    stopStreaming,
    setMessages,
  }
}

/**
 * Query keys factory for AI chat
 */
export const aiChatKeys = {
  all: ['ai-chat'] as const,
  conversations: () => [...aiChatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...aiChatKeys.conversations(), id] as const,
  taskConversation: (taskId: string) => [...aiChatKeys.all, 'task', taskId] as const,
}

/**
 * Hook for AI decomposition
 */
export function useAIDecompose(taskId: string) {
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [reasoning, setReasoning] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const decompose = useCallback(async () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error: ${response.status}`)
      }

      const data = await response.json()
      setSubtasks(data.subtasks || [])
      setReasoning(data.reasoning || '')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [taskId])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return { subtasks, reasoning, isLoading, error, decompose, cancel }
}

/**
 * Hook for AI research
 */
export function useAIResearch(taskId: string) {
  const [findings, setFindings] = useState<string>('')
  const [sources, setSources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const research = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/ai/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, query: query.trim() }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const data = await response.json()
        setFindings(data.findings || '')
        setSources(data.sources || [])
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [taskId]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return { findings, sources, isLoading, error, research, cancel }
}
