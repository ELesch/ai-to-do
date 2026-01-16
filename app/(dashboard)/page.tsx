/**
 * Dashboard Index Page
 * Main dashboard with task summary, productivity insights, and quick actions
 */

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/session'
import { taskService, dashboardService } from '@/services'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const user = await requireAuth()

  // Fetch task counts, analytics, and recent tasks in parallel
  const [
    todayTasks,
    overdueTasks,
    upcomingTasks,
    recentTasksResult,
    analytics,
  ] = await Promise.all([
    taskService.getTodayTasks(user.id),
    taskService.getOverdueTasks(user.id),
    taskService.getUpcomingTasks(user.id),
    taskService.getUserTasks(user.id, {
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    dashboardService.getAnalytics(user.id),
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
      analytics={analytics}
      userId={user.id}
    />
  )
}
