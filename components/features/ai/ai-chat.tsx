/**
 * AIChat Component
 * Chat interface for AI conversations with streaming support
 */

'use client'

import { type FC, useState, type FormEvent, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAIChat, type Message } from '@/hooks/use-ai-chat'

interface AIChatProps {
  taskId?: string
  taskTitle?: string
}

export const AIChat: FC<AIChatProps> = ({ taskId, taskTitle }) => {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useAIChat({
    taskId,
    onError: (err) => {
      console.error('AI chat error:', err)
    },
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    await sendMessage(userMessage)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs text-gray-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={clearMessages}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">
            <p>How can I help you with this task?</p>
            {taskTitle && (
              <p className="mt-2 text-xs text-gray-400 italic">
                Context: {taskTitle}
              </p>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-red-600">{error.message}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Stop button when streaming */}
      {isStreaming && (
        <div className="border-t px-3 py-2">
          <button
            type="button"
            onClick={stopStreaming}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Stop generating
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t p-3"
        aria-label="Chat with AI assistant"
      >
        <div className="flex gap-2">
          <label htmlFor="ai-chat-input" className="sr-only">
            Message to AI assistant
          </label>
          <input
            id="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            aria-label="Send message"
          >
            {isLoading && !isStreaming ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Message bubble component with markdown support
 */
const MessageBubble: FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 max-w-none">
            <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
          </div>
        )}
        {message.isStreaming && (
          <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400" />
        )}
      </div>
    </div>
  )
}
