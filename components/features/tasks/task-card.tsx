/**
 * TaskCard Component
 * Displays a single task in list/grid views
 */

'use client'

import { type FC } from 'react'
import { Calendar, ChevronRight, ListTodo } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority } from '@/types/task'

export interface TaskCardTask {
  id: string
  title: string
  description?: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  priority: TaskPriority
  dueDate?: Date | null
  subtaskCount?: number
  completedSubtaskCount?: number
  project?: {
    id: string
    name: string
    color: string
  } | null
}

interface TaskCardProps {
  task: TaskCardTask
  isSelected?: boolean
  isExpanded?: boolean
  onSelect?: (taskId: string) => void
  onComplete?: (taskId: string, completed: boolean) => void
  onClick?: (taskId: string) => void
  className?: string
}

/**
 * Get priority badge variant and styles
 */
function getPriorityConfig(priority: TaskPriority) {
  switch (priority) {
    case 'high':
      return {
        label: 'High',
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
      }
    case 'medium':
      return {
        label: 'Medium',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
      }
    case 'low':
      return {
        label: 'Low',
        className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      }
    default:
      return null
  }
}

/**
 * Format due date for display
 */
function formatDueDate(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  }
  if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Check if a due date is overdue
 */
function isOverdue(date: Date): boolean {
  const today = new Date()
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return dateOnly < todayOnly
}

export const TaskCard: FC<TaskCardProps> = ({
  task,
  isSelected = false,
  isExpanded = false,
  onSelect,
  onComplete,
  onClick,
  className,
}) => {
  const isCompleted = task.status === 'completed'
  const priorityConfig = getPriorityConfig(task.priority)
  const hasSubtasks = task.subtaskCount && task.subtaskCount > 0
  const dueDateOverdue = task.dueDate && !isCompleted && isOverdue(task.dueDate)

  const handleCheckboxChange = (checked: boolean) => {
    onComplete?.(task.id, checked)
  }

  const handleClick = () => {
    if (onClick) {
      onClick(task.id)
    } else if (onSelect) {
      onSelect(task.id)
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-all duration-200',
        'hover:bg-accent/50 hover:shadow-sm cursor-pointer',
        isSelected && 'ring-2 ring-primary border-primary',
        isExpanded && 'bg-accent/30',
        isCompleted && 'opacity-60',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-0.5" onClick={handleCheckboxClick}>
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title */}
          <h3
            className={cn(
              'font-medium leading-tight',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </h3>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Due date */}
            {task.dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-muted-foreground',
                  dueDateOverdue && 'text-red-600 dark:text-red-400'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}

            {/* Subtask count */}
            {hasSubtasks && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <ListTodo className="h-3.5 w-3.5" />
                <span>
                  {task.completedSubtaskCount || 0}/{task.subtaskCount}
                </span>
              </div>
            )}

            {/* Project badge */}
            {task.project && (
              <Badge
                variant="outline"
                className="text-xs font-normal"
                style={{
                  borderColor: task.project.color,
                  color: task.project.color,
                }}
              >
                {task.project.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Right side: Priority + expand indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Priority badge */}
          {priorityConfig && (
            <Badge
              variant="outline"
              className={cn('text-xs font-medium', priorityConfig.className)}
            >
              {priorityConfig.label}
            </Badge>
          )}

          {/* Expand indicator */}
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground opacity-0 transition-all',
              'group-hover:opacity-100',
              isExpanded && 'rotate-90 opacity-100'
            )}
          />
        </div>
      </div>
    </div>
  )
}
