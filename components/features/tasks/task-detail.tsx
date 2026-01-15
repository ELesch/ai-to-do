/**
 * TaskDetail Component
 * Full task view with edit mode, subtasks, and delete confirmation
 */

'use client'

import { type FC, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Edit2,
  Flag,
  Folder,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
  ListTodo,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TaskForm, type TaskFormValues } from './task-form'
import { TaskDecomposition } from '@/components/features/ai/TaskDecomposition'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types/task'

interface Subtask {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
}

interface Project {
  id: string
  name: string
  color: string
}

interface TaskDetailTask {
  id: string
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  priority: TaskPriority
  dueDate?: Date | null
  scheduledDate?: string | null
  estimatedMinutes?: number | null
  actualMinutes?: number | null
  projectId?: string | null
  parentTaskId?: string | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
}

interface TaskDetailProps {
  task: TaskDetailTask
  project?: Project | null
  subtasks?: Subtask[]
  /** Available projects for edit mode */
  projects?: Project[]
  /** Loading state for projects */
  projectsLoading?: boolean
  /** Handler for task update */
  onUpdate?: (values: TaskFormValues) => void | Promise<void>
  /** Handler for task completion toggle */
  onComplete?: (taskId: string, completed: boolean) => void | Promise<void>
  /** Handler for task deletion */
  onDelete?: (taskId: string) => void | Promise<void>
  /** Handler for adding a subtask */
  onAddSubtask?: (title: string) => void | Promise<void>
  /** Handler for subtask completion toggle */
  onToggleSubtask?: (subtaskId: string, completed: boolean) => void | Promise<void>
  /** Handler for subtask deletion */
  onDeleteSubtask?: (subtaskId: string) => void | Promise<void>
  /** Handler for AI-generated subtasks */
  onApplyAISubtasks?: (subtasks: string[]) => void | Promise<void>
  /** Close handler */
  onClose?: () => void
  /** Whether operations are in progress */
  isLoading?: boolean
}

const priorityConfig: Record<TaskPriority, { label: string; className: string } | null> = {
  high: {
    label: 'High',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  none: null,
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  deleted: 'Deleted',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Delete confirmation dialog
 */
function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  taskTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
  taskTitle: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{taskTitle}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Subtask item component
 */
function SubtaskItem({
  subtask,
  onToggle,
  onDelete,
  disabled,
}: {
  subtask: Subtask
  onToggle?: (completed: boolean) => void
  onDelete?: () => void
  disabled?: boolean
}) {
  const isCompleted = subtask.status === 'completed'

  return (
    <div className="group flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent/50">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle?.(!!checked)}
        disabled={disabled}
      />
      <Link
        href={`/task/${subtask.id}`}
        className={cn(
          'flex-1 text-sm hover:underline',
          isCompleted && 'line-through text-muted-foreground'
        )}
      >
        {subtask.title}
      </Link>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault()
            onDelete()
          }}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

/**
 * Add subtask form
 */
function AddSubtaskForm({
  onAdd,
  disabled,
}: {
  onAdd: (title: string) => void | Promise<void>
  disabled?: boolean
}) {
  const [title, setTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsAdding(true)
    try {
      await onAdd(title.trim())
      setTitle('')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add subtask..."
        className="h-8 text-sm"
        disabled={disabled || isAdding}
      />
      <Button type="submit" size="sm" disabled={!title.trim() || disabled || isAdding}>
        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </form>
  )
}

export const TaskDetail: FC<TaskDetailProps> = ({
  task,
  project,
  subtasks = [],
  projects = [],
  projectsLoading = false,
  onUpdate,
  onComplete,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onApplyAISubtasks,
  onClose,
  isLoading = false,
}) => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDecomposeDialogOpen, setIsDecomposeDialogOpen] = useState(false)
  const [isApplyingSubtasks, setIsApplyingSubtasks] = useState(false)

  const isCompleted = task.status === 'completed'
  const priority = priorityConfig[task.priority]
  const completedSubtasks = subtasks.filter((s) => s.status === 'completed').length

  const handleUpdate = async (values: TaskFormValues) => {
    setIsUpdating(true)
    try {
      await onUpdate?.(values)
      setIsEditMode(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete?.(task.id)
      setIsDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleComplete = async (completed: boolean) => {
    await onComplete?.(task.id, completed)
  }

  const handleApplyAISubtasks = async (subtaskTitles: string[]) => {
    if (!onApplyAISubtasks) return
    setIsApplyingSubtasks(true)
    try {
      await onApplyAISubtasks(subtaskTitles)
    } finally {
      setIsApplyingSubtasks(false)
    }
  }

  // Edit mode
  if (isEditMode) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Edit Task</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsEditMode(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <TaskForm
          defaultValues={{
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
            dueDate: task.dueDate,
            projectId: project?.id ?? null,
          }}
          projects={projects}
          projectsLoading={projectsLoading}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditMode(false)}
          isSubmitting={isUpdating}
          submitLabel="Save Changes"
        />
      </div>
    )
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleComplete}
            disabled={isLoading}
            className="mt-1"
          />
          <div className="flex-1">
            <h1
              className={cn(
                'text-2xl font-bold',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{statusLabels[task.status] || task.status}</Badge>
              {priority && (
                <Badge variant="outline" className={priority.className}>
                  <Flag className="h-3 w-3 mr-1" />
                  {priority.label}
                </Badge>
              )}
              {project && (
                <Badge
                  variant="outline"
                  style={{ borderColor: project.color, color: project.color }}
                >
                  <Folder className="h-3 w-3 mr-1" />
                  {project.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditMode(true)}
            disabled={isLoading}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Due Date
              </dt>
              <dd className="font-medium mt-1">
                {task.dueDate ? formatDate(new Date(task.dueDate)) : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Scheduled Date
              </dt>
              <dd className="font-medium mt-1">{task.scheduledDate || 'Not scheduled'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Estimated Time
              </dt>
              <dd className="font-medium mt-1">
                {task.estimatedMinutes ? formatDuration(task.estimatedMinutes) : 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Actual Time
              </dt>
              <dd className="font-medium mt-1">
                {task.actualMinutes ? formatDuration(task.actualMinutes) : 'Not tracked'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium mt-1">{formatDate(new Date(task.createdAt))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="font-medium mt-1">{formatDate(new Date(task.updatedAt))}</dd>
            </div>
            {task.completedAt && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Completed</dt>
                <dd className="font-medium mt-1">{formatDate(new Date(task.completedAt))}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {task.description ? (
            <p className="whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="text-muted-foreground italic">No description provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Subtasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Subtasks
              {subtasks.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({completedSubtasks}/{subtasks.length})
                </span>
              )}
            </CardTitle>
            {onApplyAISubtasks && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDecomposeDialogOpen(true)}
                disabled={isLoading || isCompleted}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Break down with AI
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {subtasks.length > 0 ? (
            <div className="space-y-1">
              {subtasks.map((subtask) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={
                    onToggleSubtask
                      ? (completed) => onToggleSubtask(subtask.id, completed)
                      : undefined
                  }
                  onDelete={onDeleteSubtask ? () => onDeleteSubtask(subtask.id) : undefined}
                  disabled={isLoading}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3">
                No subtasks yet.
              </p>
              {onApplyAISubtasks && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDecomposeDialogOpen(true)}
                  disabled={isLoading || isCompleted}
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Break down with AI
                </Button>
              )}
            </div>
          )}
          {onAddSubtask && <AddSubtaskForm onAdd={onAddSubtask} disabled={isLoading} />}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        taskTitle={task.title}
      />

      {/* AI Task Decomposition dialog */}
      {onApplyAISubtasks && (
        <TaskDecomposition
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
          }}
          open={isDecomposeDialogOpen}
          onOpenChange={setIsDecomposeDialogOpen}
          onApply={handleApplyAISubtasks}
          isApplying={isApplyingSubtasks}
        />
      )}
    </div>
  )
}
