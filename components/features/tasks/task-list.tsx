/**
 * TaskList Component
 * Displays a list of tasks with optional grouping and keyboard navigation
 */

'use client'

import { type FC, useMemo, useCallback, useRef, useEffect } from 'react'
import { Inbox, Calendar, Flag, Folder } from 'lucide-react'
import { TaskCard, type TaskCardTask } from './task-card'
import { useTaskListNavigation } from '@/hooks/use-keyboard-shortcuts'
import { useOptionalKeyboardContext } from '@/providers/keyboard-provider'
import { ListSkeleton } from '@/components/shared/Skeleton'
import { cn } from '@/lib/utils'
import { getListItemStyle } from '@/lib/animations'

type GroupBy = 'none' | 'date' | 'priority' | 'project'

interface TaskListProps {
  tasks: TaskCardTask[]
  selectedTaskId?: string
  expandedTaskId?: string
  isLoading?: boolean
  groupBy?: GroupBy
  enableKeyboardNavigation?: boolean
  /** Enable fade-in animation for list items */
  enableAnimation?: boolean
  onSelectTask?: (taskId: string) => void
  onCompleteTask?: (taskId: string, completed: boolean) => void
  onClickTask?: (taskId: string) => void
  onOpenTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
  emptyMessage?: string
  emptyIcon?: 'inbox' | 'calendar' | 'folder'
  className?: string
}

/**
 * Loading skeleton list using shared component
 */
function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return <ListSkeleton count={count} variant="task" />
}

/**
 * Empty state component
 */
function TaskListEmpty({
  message,
  icon = 'inbox',
}: {
  message: string
  icon?: 'inbox' | 'calendar' | 'folder'
}) {
  const IconComponent = {
    inbox: Inbox,
    calendar: Calendar,
    folder: Folder,
  }[icon]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconComponent className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-2">
        Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">N</kbd> to create a new task
      </p>
    </div>
  )
}

/**
 * Group header component
 */
function GroupHeader({
  title,
  count,
  icon,
  color,
}: {
  title: string
  count: number
  icon?: React.ReactNode
  color?: string
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-1">
      {icon && (
        <span className="text-muted-foreground" style={color ? { color } : undefined}>
          {icon}
        </span>
      )}
      <h3 className="font-medium text-sm">{title}</h3>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  )
}

/**
 * Format date for group header
 */
function formatDateGroup(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) return 'Today'
  if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow'
  if (dateOnly.getTime() === yesterdayOnly.getTime()) return 'Yesterday'
  if (dateOnly < todayOnly) return 'Overdue'

  // Check if within this week
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()))
  if (dateOnly <= weekEnd) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }

  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

/**
 * Get priority group config
 */
function getPriorityGroupConfig(priority: string) {
  switch (priority) {
    case 'high':
      return { title: 'High Priority', color: 'rgb(220, 38, 38)' }
    case 'medium':
      return { title: 'Medium Priority', color: 'rgb(202, 138, 4)' }
    case 'low':
      return { title: 'Low Priority', color: 'rgb(37, 99, 235)' }
    default:
      return { title: 'No Priority', color: undefined }
  }
}

/**
 * Group tasks by date
 */
function groupTasksByDate(tasks: TaskCardTask[]) {
  const groups: Map<string, TaskCardTask[]> = new Map()
  const noDateKey = 'no-date'

  tasks.forEach((task) => {
    if (!task.dueDate) {
      const existing = groups.get(noDateKey) || []
      groups.set(noDateKey, [...existing, task])
    } else {
      const dateKey = new Date(
        task.dueDate.getFullYear(),
        task.dueDate.getMonth(),
        task.dueDate.getDate()
      ).toISOString()
      const existing = groups.get(dateKey) || []
      groups.set(dateKey, [...existing, task])
    }
  })

  // Sort groups by date
  const sortedEntries = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === noDateKey) return 1
    if (b === noDateKey) return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return sortedEntries.map(([key, tasks]) => ({
    key,
    title: key === noDateKey ? 'No Due Date' : formatDateGroup(new Date(key)),
    tasks,
    icon: <Calendar className="h-4 w-4" />,
    color: undefined as string | undefined,
  }))
}

/**
 * Group tasks by priority
 */
function groupTasksByPriority(tasks: TaskCardTask[]) {
  const priorityOrder = ['high', 'medium', 'low', 'none']
  const groups: Map<string, TaskCardTask[]> = new Map()

  tasks.forEach((task) => {
    const existing = groups.get(task.priority) || []
    groups.set(task.priority, [...existing, task])
  })

  return priorityOrder
    .filter((priority) => groups.has(priority))
    .map((priority) => {
      const config = getPriorityGroupConfig(priority)
      return {
        key: priority,
        title: config.title,
        tasks: groups.get(priority)!,
        icon: <Flag className="h-4 w-4" />,
        color: config.color,
      }
    })
}

/**
 * Group tasks by project
 */
function groupTasksByProject(tasks: TaskCardTask[]) {
  const groups: Map<string, { project: TaskCardTask['project']; tasks: TaskCardTask[] }> = new Map()
  const noProjectKey = 'no-project'

  tasks.forEach((task) => {
    const key = task.project?.id || noProjectKey
    const existing = groups.get(key)
    if (existing) {
      existing.tasks.push(task)
    } else {
      groups.set(key, { project: task.project, tasks: [task] })
    }
  })

  return Array.from(groups.entries()).map(([key, { project, tasks }]) => ({
    key,
    title: project?.name || 'No Project',
    tasks,
    icon: <Folder className="h-4 w-4" />,
    color: project?.color,
  }))
}

/**
 * Flatten grouped tasks to a single list (for keyboard navigation)
 */
function flattenGroupedTasks(
  groupedTasks: Array<{ tasks: TaskCardTask[] }>
): TaskCardTask[] {
  return groupedTasks.flatMap((group) => group.tasks)
}

export const TaskList: FC<TaskListProps> = ({
  tasks,
  selectedTaskId,
  expandedTaskId,
  isLoading = false,
  groupBy = 'none',
  enableKeyboardNavigation = true,
  enableAnimation = true,
  onSelectTask,
  onCompleteTask,
  onClickTask,
  onOpenTask,
  onDeleteTask,
  emptyMessage = 'No tasks to display',
  emptyIcon = 'inbox',
  className,
}) => {
  const keyboardContext = useOptionalKeyboardContext()
  const listRef = useRef<HTMLDivElement>(null)

  // Track current selection through context if available
  const currentSelectedId = keyboardContext?.selectedTaskId ?? selectedTaskId

  // Handle task selection
  const handleSelectTask = useCallback(
    (taskId: string) => {
      onSelectTask?.(taskId)
      keyboardContext?.setSelectedTaskId(taskId)
    },
    [onSelectTask, keyboardContext]
  )

  // Handle task completion toggle
  const handleToggleComplete = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        onCompleteTask?.(taskId, task.status !== 'completed')
      }
    },
    [tasks, onCompleteTask]
  )

  // Group tasks if needed
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null

    switch (groupBy) {
      case 'date':
        return groupTasksByDate(tasks)
      case 'priority':
        return groupTasksByPriority(tasks)
      case 'project':
        return groupTasksByProject(tasks)
      default:
        return null
    }
  }, [tasks, groupBy])

  // Get flat list of tasks for keyboard navigation
  const flatTasks = useMemo(() => {
    if (groupedTasks) {
      return flattenGroupedTasks(groupedTasks)
    }
    return tasks
  }, [tasks, groupedTasks])

  // Set up keyboard navigation
  useTaskListNavigation({
    tasks: flatTasks,
    selectedTaskId: currentSelectedId ?? undefined,
    enabled: enableKeyboardNavigation && tasks.length > 0,
    onSelectTask: handleSelectTask,
    onOpenTask: onOpenTask || onClickTask,
    onToggleComplete: onCompleteTask ? handleToggleComplete : undefined,
    onDeleteTask,
  })

  // Scroll selected task into view
  useEffect(() => {
    if (currentSelectedId && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-task-id="${currentSelectedId}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [currentSelectedId])

  // Auto-select first task if none selected
  useEffect(() => {
    if (
      enableKeyboardNavigation &&
      flatTasks.length > 0 &&
      !currentSelectedId
    ) {
      // Don't auto-select on mount, only when user starts navigating
    }
  }, [flatTasks, currentSelectedId, enableKeyboardNavigation])

  // Loading state
  if (isLoading) {
    return <TaskListSkeleton />
  }

  // Empty state
  if (tasks.length === 0) {
    return <TaskListEmpty message={emptyMessage} icon={emptyIcon} />
  }

  // Render task card with data attribute for scrolling and optional animation
  const renderTaskCard = (task: TaskCardTask, index: number) => (
    <div
      key={task.id}
      data-task-id={task.id}
      className={enableAnimation ? 'animate-fade-in-up animate-fill-backwards' : undefined}
      style={enableAnimation ? getListItemStyle(index) : undefined}
    >
      <TaskCard
        task={task}
        isSelected={task.id === currentSelectedId}
        isExpanded={task.id === expandedTaskId}
        onSelect={handleSelectTask}
        onComplete={onCompleteTask}
        onClick={onClickTask}
      />
    </div>
  )

  // Grouped view
  if (groupedTasks) {
    let globalIndex = 0
    return (
      <div ref={listRef} className={cn('space-y-4', className)}>
        {groupedTasks.map((group) => (
          <div key={group.key}>
            <GroupHeader
              title={group.title}
              count={group.tasks.length}
              icon={group.icon}
              color={group.color}
            />
            <div className="space-y-2">
              {group.tasks.map((task) => {
                const element = renderTaskCard(task, globalIndex)
                globalIndex++
                return element
              })}
            </div>
          </div>
        ))}
        <KeyboardNavigationHint />
      </div>
    )
  }

  // Flat list view
  return (
    <div ref={listRef} className={cn('space-y-2', className)}>
      {tasks.map((task, index) => renderTaskCard(task, index))}
      <KeyboardNavigationHint />
    </div>
  )
}

/**
 * Keyboard navigation hint shown at bottom of list
 */
function KeyboardNavigationHint() {
  return (
    <div className="text-center py-4 text-xs text-muted-foreground">
      <span className="hidden sm:inline">
        Use{' '}
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          {'\u2191'}
        </kbd>{' '}
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          {'\u2193'}
        </kbd>{' '}
        or{' '}
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          J
        </kbd>
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          K
        </kbd>{' '}
        to navigate,{' '}
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          Space
        </kbd>{' '}
        to toggle,{' '}
        <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">
          Enter
        </kbd>{' '}
        to open
      </span>
    </div>
  )
}

// Export skeleton for use in Suspense boundaries
export { TaskListSkeleton, TaskListEmpty }
