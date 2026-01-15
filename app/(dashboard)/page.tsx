/**
 * Dashboard Index Page
 * Main dashboard with task summary and quick actions
 */

import { requireAuth } from '@/lib/auth/session'
import { taskService } from '@/services'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const user = await requireAuth()

  // Fetch task counts and recent tasks
  const [todayTasks, overdueTasks, upcomingTasks, recentTasksResult] = await Promise.all([
    taskService.getTodayTasks(user.id),
    taskService.getOverdueTasks(user.id),
    taskService.getUpcomingTasks(user.id),
    taskService.getUserTasks(user.id, {
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
  ])

  const recentTasks = recentTasksResult.tasks

  const summary = {
    overdueCount: overdueTasks.length,
    todayCount: todayTasks.length,
    upcomingCount: upcomingTasks.length,
  }

  return (
    <DashboardClient
      summary={summary}
      recentTasks={recentTasks}
      userId={user.id}
    />
  )
}
