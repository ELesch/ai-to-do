/**
 * Upcoming Page
 * Shows tasks scheduled for the next 7 days and beyond
 */

import { requireAuth } from '@/lib/auth/session'
import { taskService, type TaskWithSubtasks } from '@/services'
import { UpcomingPageClient } from './upcoming-client'

// Helper to get date key for grouping (YYYY-MM-DD)
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper to format date for display
function formatDateHeader(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'

  return target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// Group tasks by date
function groupTasksByDate(tasks: TaskWithSubtasks[]): Map<string, { label: string; tasks: TaskWithSubtasks[] }> {
  const grouped = new Map<string, { label: string; tasks: TaskWithSubtasks[] }>()

  tasks.forEach((task) => {
    if (!task.dueDate) return

    const date = new Date(task.dueDate)
    const dateKey = getDateKey(date)

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        label: formatDateHeader(date),
        tasks: [],
      })
    }

    grouped.get(dateKey)!.tasks.push(task)
  })

  // Sort by date key
  return new Map(
    [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  )
}

export default async function UpcomingPage() {
  const user = await requireAuth()

  // Fetch upcoming tasks (next 7 days)
  const upcomingTasks = await taskService.getUpcomingTasks(user.id)

  // Group tasks by date
  const groupedByDate = groupTasksByDate(upcomingTasks)

  // Convert Map to array for serialization
  const groupedTasksArray = Array.from(groupedByDate.entries()).map(([dateKey, group]) => ({
    dateKey,
    label: group.label,
    tasks: group.tasks,
  }))

  return <UpcomingPageClient groupedTasks={groupedTasksArray} />
}
