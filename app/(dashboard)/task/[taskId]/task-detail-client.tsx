/**
 * Task Detail Client Component
 * Handles client-side interactions for the task detail page
 */

'use client'

import { type FC, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TaskDetail, type TaskFormValues } from '@/components/features/tasks'
import { ResearchPanel } from '@/components/features/ai/ResearchPanel'
import { DraftPanel } from '@/components/features/ai/DraftPanel'
import { Button } from '@/components/ui/button'
import type { TaskPriority } from '@/types/task'

// Search icon for the research button
const SearchIcon = () => (
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
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

// Pen icon for the draft button
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

interface Task {
  id: string
  userId: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | null
  scheduledDate?: string | null
  estimatedMinutes?: number | null
  actualMinutes?: number | null
  projectId?: string | null
  parentTaskId?: string | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
  deletedAt?: Date | null
}

interface Subtask {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
}

interface TaskDetailClientProps {
  task: Task
  subtasks: Task[]
  userId: string
}

// Transform tasks to subtask format
function transformToSubtask(task: Task): Subtask {
  return {
    id: task.id,
    title: task.title,
    status: task.status as 'pending' | 'in_progress' | 'completed' | 'deleted',
  }
}

// Transform task for TaskDetail component
function transformTaskForDetail(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as 'pending' | 'in_progress' | 'completed' | 'deleted',
    priority: (task.priority as TaskPriority) || 'none',
    dueDate: task.dueDate,
    scheduledDate: task.scheduledDate,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
  }
}

export const TaskDetailClient: FC<TaskDetailClientProps> = ({
  task,
  subtasks,
  userId,
}) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isResearchPanelOpen, setIsResearchPanelOpen] = useState(false)
  const [isDraftPanelOpen, setIsDraftPanelOpen] = useState(false)

  // Toggle research panel
  const handleOpenResearch = useCallback(() => {
    setIsResearchPanelOpen(true)
    setIsDraftPanelOpen(false) // Close draft panel when opening research
  }, [])

  const handleCloseResearch = useCallback(() => {
    setIsResearchPanelOpen(false)
  }, [])

  // Toggle draft panel
  const handleOpenDraft = useCallback(() => {
    setIsDraftPanelOpen(true)
    setIsResearchPanelOpen(false) // Close research panel when opening draft
  }, [])

  const handleCloseDraft = useCallback(() => {
    setIsDraftPanelOpen(false)
  }, [])

  const handleUpdate = async (values: TaskFormValues) => {
    setIsLoading(true)
    try {
      console.log('Updating task:', task.id, 'with values:', values, 'for user:', userId)
      // TODO: Connect to server action
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async (taskId: string, completed: boolean) => {
    setIsLoading(true)
    try {
      console.log('Setting task', taskId, 'completed:', completed, 'for user:', userId)
      // TODO: Connect to server action
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    setIsLoading(true)
    try {
      console.log('Deleting task:', taskId, 'for user:', userId)
      // TODO: Connect to server action
      router.push('/today')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSubtask = async (title: string) => {
    setIsLoading(true)
    try {
      console.log('Adding subtask:', title, 'to task:', task.id)
      // TODO: Connect to server action
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    setIsLoading(true)
    try {
      console.log('Toggling subtask:', subtaskId, 'to:', completed)
      // TODO: Connect to server action
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    setIsLoading(true)
    try {
      console.log('Deleting subtask:', subtaskId)
      // TODO: Connect to server action
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  // Prepare task context for ResearchPanel
  const taskContext = {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
  }

  return (
    <>
      <div className="flex h-full gap-6">
        {/* Back button and Task Details */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/today">
              <Button variant="ghost" size="sm">
                &larr; Back
              </Button>
            </Link>
          </div>

          <TaskDetail
            task={transformTaskForDetail(task)}
            subtasks={subtasks.map(transformToSubtask)}
            onUpdate={handleUpdate}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            isLoading={isLoading}
          />
        </div>

        {/* AI Panel (task-specific) */}
        <aside className="w-96 rounded-lg border bg-gray-50 p-4">
          <h2 className="mb-4 font-semibold">AI Assistant</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              AI assistance for this task. You can ask questions, get suggestions,
              or break down this task into subtasks.
            </p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                Break down into subtasks
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleOpenResearch}
              >
                <SearchIcon />
                Research this topic
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleOpenDraft}
              >
                <PenIcon />
                Draft related content
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Suggest improvements
              </Button>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400 italic">
                AI chat interface coming soon...
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Research Panel - Slides in from the right */}
      <ResearchPanel
        task={taskContext}
        isOpen={isResearchPanelOpen}
        onClose={handleCloseResearch}
      />

      {/* Draft Panel - Slides in from the right */}
      <DraftPanel
        task={taskContext}
        isOpen={isDraftPanelOpen}
        onClose={handleCloseDraft}
      />
    </>
  )
}
