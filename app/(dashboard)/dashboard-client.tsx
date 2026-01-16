/**
 * Dashboard Client Component
 * Main dashboard view with productivity insights and task overview
 */

'use client'

import { type FC } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskList, QuickAddForm } from '@/components/features/tasks'
import { createTask } from '@/app/actions/task-actions'
import type {
  DashboardAnalytics,
  ProductivityStats,
  PriorityBreakdown,
  RecentCompletion,
} from '@/services'

interface Task {
  id: string
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
}

interface TaskSummary {
  overdueCount: number
  todayCount: number
  upcomingCount: number
}

interface DashboardClientProps {
  summary: TaskSummary
  recentTasks: Task[]
  analytics: DashboardAnalytics
  userId: string
}

// Transform service task to component task format
function transformTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status:
      (task.status as 'pending' | 'in_progress' | 'completed' | 'deleted') ||
      'pending',
    priority: (task.priority as 'high' | 'medium' | 'low' | 'none') || 'none',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
  }
}

// Format relative time for recent completions
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return diffMins <= 1 ? 'just now' : `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

// Priority badge component
function PriorityBadge({ priority }: { priority: string }) {
  const colors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
    none: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[priority as keyof typeof colors] || colors.none}`}
    >
      {priority}
    </span>
  )
}

export const DashboardClient: FC<DashboardClientProps> = ({
  summary,
  recentTasks,
  analytics,
  userId,
}) => {
  const router = useRouter()
  const { productivity, priorityBreakdown, recentCompletions, onTimeRate } =
    analytics

  const handleAddTask = async (title: string) => {
    const result = await createTask(title)
    if (!result.success) {
      console.error('Failed to create task:', result.error)
    }
    router.refresh()
  }

  const handleSelectTask = (taskId: string) => {
    router.push(`/task/${taskId}`)
  }

  const handleCompleteTask = (taskId: string) => {
    console.log('Completing task:', taskId)
    router.refresh()
  }

  const totalPriorityTasks =
    priorityBreakdown.high +
    priorityBreakdown.medium +
    priorityBreakdown.low +
    priorityBreakdown.none

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Your productivity overview and quick actions
        </p>
      </div>

      {/* Quick Add Form */}
      <section>
        <QuickAddForm
          onAdd={handleAddTask}
          placeholder="Quick add a new task..."
        />
      </section>

      {/* Productivity Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Completed This Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Week</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {productivity.completedThisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {productivity.weekOverWeekChange > 0 ? (
                <span className="text-green-600">
                  +{productivity.weekOverWeekChange}% vs last week
                </span>
              ) : productivity.weekOverWeekChange < 0 ? (
                <span className="text-red-600">
                  {productivity.weekOverWeekChange}% vs last week
                </span>
              ) : (
                <span>Same as last week</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Streak</CardDescription>
            <CardTitle className="text-3xl text-orange-500">
              {productivity.streak}
              <span className="ml-1 text-lg">
                {productivity.streak > 0 ? 'days' : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {productivity.streak > 0
                ? 'Keep it going!'
                : 'Complete a task to start'}
            </p>
          </CardContent>
        </Card>

        {/* On-Time Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On-Time Rate</CardDescription>
            <CardTitle
              className={`text-3xl ${onTimeRate >= 80 ? 'text-green-600' : onTimeRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
            >
              {onTimeRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {onTimeRate >= 80
                ? 'Excellent timing!'
                : onTimeRate >= 60
                  ? 'Room to improve'
                  : 'Set realistic due dates'}
            </p>
          </CardContent>
        </Card>

        {/* Total Completed */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>All Time</CardDescription>
            <CardTitle className="text-3xl text-purple-600">
              {productivity.totalCompleted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">tasks completed</p>
          </CardContent>
        </Card>
      </section>

      {/* Task Status Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Overdue Card */}
        <Link href="/today" className="block">
          <Card
            className={`transition-colors hover:border-red-300 ${summary.overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}`}
          >
            <CardHeader className="pb-2">
              <CardDescription>Overdue</CardDescription>
              <CardTitle
                className={`text-3xl ${summary.overdueCount > 0 ? 'text-red-600' : ''}`}
              >
                {summary.overdueCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {summary.overdueCount === 0
                  ? 'All caught up!'
                  : `${summary.overdueCount} task${summary.overdueCount !== 1 ? 's' : ''} need attention`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Today Card */}
        <Link href="/today" className="block">
          <Card className="transition-colors hover:border-blue-300">
            <CardHeader className="pb-2">
              <CardDescription>Due Today</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {summary.todayCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {summary.todayCount === 0
                  ? 'No tasks due today'
                  : `${summary.todayCount} task${summary.todayCount !== 1 ? 's' : ''} for today`}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Upcoming Card */}
        <Link href="/upcoming" className="block">
          <Card className="transition-colors hover:border-indigo-300">
            <CardHeader className="pb-2">
              <CardDescription>Upcoming (7 days)</CardDescription>
              <CardTitle className="text-3xl text-indigo-600">
                {summary.upcomingCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {summary.upcomingCount === 0
                  ? 'Nothing scheduled'
                  : `${summary.upcomingCount} task${summary.upcomingCount !== 1 ? 's' : ''} scheduled`}
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Priority Breakdown & Recent Completions */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority Breakdown</CardTitle>
            <CardDescription>
              {totalPriorityTasks} pending task
              {totalPriorityTasks !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalPriorityTasks === 0 ? (
              <p className="text-gray-500">No pending tasks</p>
            ) : (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="flex h-4 overflow-hidden rounded-full">
                  {priorityBreakdown.high > 0 && (
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${(priorityBreakdown.high / totalPriorityTasks) * 100}%`,
                      }}
                    />
                  )}
                  {priorityBreakdown.medium > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{
                        width: `${(priorityBreakdown.medium / totalPriorityTasks) * 100}%`,
                      }}
                    />
                  )}
                  {priorityBreakdown.low > 0 && (
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${(priorityBreakdown.low / totalPriorityTasks) * 100}%`,
                      }}
                    />
                  )}
                  {priorityBreakdown.none > 0 && (
                    <div
                      className="bg-gray-300"
                      style={{
                        width: `${(priorityBreakdown.none / totalPriorityTasks) * 100}%`,
                      }}
                    />
                  )}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span>High: {priorityBreakdown.high}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span>Medium: {priorityBreakdown.medium}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>Low: {priorityBreakdown.low}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-gray-300" />
                    <span>None: {priorityBreakdown.none}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Wins</CardTitle>
            <CardDescription>Your latest completed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompletions.length === 0 ? (
              <p className="text-gray-500">No completed tasks yet</p>
            ) : (
              <ul className="space-y-2">
                {recentCompletions.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">&#10003;</span>
                      <span className="text-gray-600 line-through">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(task.completedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick Links */}
      <section className="flex gap-4">
        <Link href="/today">
          <Button variant="outline">View Today</Button>
        </Link>
        <Link href="/upcoming">
          <Button variant="outline">View Upcoming</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">View Projects</Button>
        </Link>
      </section>

      {/* Recent Tasks */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <Link href="/today">
            <Button variant="ghost" size="sm">
              View all &rarr;
            </Button>
          </Link>
        </div>
        {recentTasks.length > 0 ? (
          <TaskList
            tasks={recentTasks.map(transformTask)}
            onSelectTask={handleSelectTask}
            onCompleteTask={handleCompleteTask}
            emptyMessage="No recent tasks"
          />
        ) : (
          <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">
              No tasks yet
            </h3>
            <p className="mb-4 text-gray-600">
              Get started by adding your first task using the form above.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
