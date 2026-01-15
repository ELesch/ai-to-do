/**
 * Sidebar Wrapper Component
 * Server component that fetches task counts and renders the sidebar
 */

import { getCurrentUser } from '@/lib/auth/session'
import { taskService } from '@/services'
import { Sidebar } from './sidebar'

export async function SidebarWrapper() {
  const user = await getCurrentUser()

  // Default counts (for unauthenticated or error states)
  let taskCounts = {
    today: 0,
    upcoming: 0,
  }

  // Fetch task counts if authenticated
  if (user) {
    try {
      const [todayTasks, upcomingTasks] = await Promise.all([
        taskService.getTodayTasks(user.id),
        taskService.getUpcomingTasks(user.id),
      ])

      // Also count overdue tasks in today count
      const overdueTasks = await taskService.getOverdueTasks(user.id)

      taskCounts = {
        today: todayTasks.length + overdueTasks.length,
        upcoming: upcomingTasks.length,
      }
    } catch (error) {
      console.error('Error fetching task counts:', error)
    }
  }

  return <Sidebar taskCounts={taskCounts} />
}
