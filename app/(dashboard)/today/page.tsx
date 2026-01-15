/**
 * Today Page
 * Shows tasks due today and daily planning features
 */

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/session'
import { taskService, type TaskWithSubtasks } from '@/services'
import { TodayPageClient } from './today-client'

// Helper to check if a date is before today (overdue)
function isOverdue(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

// Helper to check if a date is today
function isToday(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false
  const today = new Date()
  const due = new Date(dueDate)
  return (
    due.getDate() === today.getDate() &&
    due.getMonth() === today.getMonth() &&
    due.getFullYear() === today.getFullYear()
  )
}

export default async function TodayPage() {
  const user = await requireAuth()

  // Fetch tasks due today and overdue tasks
  const [todayTasks, overdueTasks] = await Promise.all([
    taskService.getTodayTasks(user.id),
    taskService.getOverdueTasks(user.id),
  ])

  // Group tasks
  const groupedTasks = {
    overdue: overdueTasks.filter((task) => isOverdue(task.dueDate)),
    today: todayTasks.filter((task) => isToday(task.dueDate)),
  }

  return <TodayPageClient groupedTasks={groupedTasks} userId={user.id} />
}
