/**
 * AIChat Component
 * Chat interface for AI conversations
 */

'use client'

import { type FC, useState, type FormEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatProps {
  taskId?: string
}

export const AIChat: FC<AIChatProps> = ({ taskId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // TODO: Call AI API
      // const response = await fetch('/api/ai/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ taskId, message: userMessage, conversationHistory: messages }),
      // })
      // const data = await response.json()

      // Placeholder response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'AI responses will be available once the AI service is connected.',
          },
        ])
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error('AI chat error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            <p>How can I help you with your tasks?</p>
            {taskId && (
              <p className="mt-2 text-xs">
                Context: Task {taskId}
              </p>
            )}
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4" aria-label="Chat with AI assistant">
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
            className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            aria-describedby={taskId ? 'ai-chat-context' : undefined}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
