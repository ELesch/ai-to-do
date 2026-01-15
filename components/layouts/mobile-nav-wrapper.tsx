/**
 * Mobile Navigation Wrapper
 * Server component that fetches task counts and renders MobileNav
 */

import { taskService } from '@/services/task.service'
import { getCurrentUser } from '@/lib/auth/helpers'
import { MobileNav } from './mobile-nav'

export async function MobileNavWrapper() {
  const user = await getCurrentUser()

  if (!user) {
    return <MobileNav taskCounts={{ today: 0, upcoming: 0 }} />
  }

  const [todayTasks, upcomingTasks] = await Promise.all([
    taskService.getTodayTasks(user.id),
    taskService.getUpcomingTasks(user.id),
  ])

  return (
    <MobileNav
      taskCounts={{
        today: todayTasks.length,
        upcoming: upcomingTasks.length,
      }}
    />
  )
}
