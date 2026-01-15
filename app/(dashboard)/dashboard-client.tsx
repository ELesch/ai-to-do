/**
 * Dashboard Client Component
 * Main dashboard view with task summary and quick actions
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

export const DashboardClient: FC<DashboardClientProps> = ({
  summary,
  recentTasks,
  userId,
}) => {
  const router = useRouter()

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

  const totalTasks =
    summary.overdueCount + summary.todayCount + summary.upcomingCount

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here is an overview of your tasks.
        </p>
      </div>

      {/* Quick Add Form */}
      <section>
        <QuickAddForm
          onAdd={handleAddTask}
          placeholder="Quick add a new task..."
        />
      </section>

      {/* Task Summary Cards */}
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
