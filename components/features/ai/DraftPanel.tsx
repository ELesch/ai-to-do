/**
 * DraftPanel Component
 * A sliding panel for AI-assisted content drafting
 */

'use client'

import { type FC } from 'react'
import { DraftEditor } from './DraftEditor'
import { cn } from '@/lib/utils'

// Icons
const PenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
)

const CloseIcon = () => (
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
)

interface TaskContext {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | null
}

interface DraftPanelProps {
  task: TaskContext
  isOpen: boolean
  onClose: () => void
}

/**
 * DraftPanel - Sliding panel for AI-assisted drafting
 */
export const DraftPanel: FC<DraftPanelProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed right-0 top-0 z-50 h-full w-[550px] border-l bg-white shadow-xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <PenIcon />
            <h2 className="font-semibold">AI Draft Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Close panel"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Task Context */}
        <div className="border-b bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Drafting For
          </p>
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Draft Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          <DraftEditor
            taskId={task.id}
            taskTitle={task.title}
            taskDescription={task.description ?? undefined}
            className="h-full border-0 shadow-none"
          />
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-gray-50">
          <div className="text-xs text-gray-500">
            <p>
              Use the toolbar to format text or generate AI-assisted content.
              Your drafts are automatically saved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DraftPanel
