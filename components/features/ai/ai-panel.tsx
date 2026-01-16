/**
 * AIPanel Component
 * Collapsible side panel for AI interactions
 */

'use client'

import { type FC, useState } from 'react'
import { AIChat } from './ai-chat'

interface AIPanelProps {
  taskId?: string
  isOpen?: boolean
  onToggle?: () => void
}

export const AIPanel: FC<AIPanelProps> = ({
  taskId,
  isOpen = false,
  onToggle,
}) => {
  const [internalOpen, setInternalOpen] = useState(isOpen)
  const open = onToggle ? isOpen : internalOpen

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen(!internalOpen)
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="fixed right-4 bottom-4 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        aria-label="Toggle AI assistant"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <aside
          className="border-border bg-background fixed top-0 right-0 z-40 h-full w-96 border-l shadow-xl"
          role="complementary"
          aria-label="AI Assistant panel"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold" id="ai-panel-title">
                AI Assistant
              </h2>
              <button
                onClick={handleToggle}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close panel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIChat taskId={taskId} />
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
