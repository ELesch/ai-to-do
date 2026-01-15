/**
 * Today Page Client Component
 * Handles client-side interactions for the today page
 */

'use client'

import { type FC } from 'react'
import { useRouter } from 'next/navigation'
import { TaskList, QuickAddForm } from '@/components/features/tasks'
import { DailyBriefing } from '@/components/features/planning'
import { createTaskForToday } from '@/app/actions/task-actions'

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

interface GroupedTasks {
  overdue: Task[]
  today: Task[]
}

interface TodayPageClientProps {
  groupedTasks: GroupedTasks
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

export const TodayPageClient: FC<TodayPageClientProps> = ({
  groupedTasks,
  userId,
}) => {
  const router = useRouter()

  const handleAddTask = async (title: string) => {
    const result = await createTaskForToday(title)
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

  const hasOverdue = groupedTasks.overdue.length > 0
  const hasToday = groupedTasks.today.length > 0
  const hasNoTasks = !hasOverdue && !hasToday

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick Add Form */}
      <section>
        <QuickAddForm
          onAdd={handleAddTask}
          placeholder="Add a task for today..."
        />
      </section>

      {/* Daily Briefing Section */}
      <section>
        <DailyBriefing />
      </section>

      {/* Overdue Tasks */}
      {hasOverdue && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-red-600">
            <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
            Overdue ({groupedTasks.overdue.length})
          </h2>
          <TaskList
            tasks={groupedTasks.overdue.map(transformTask)}
            onSelectTask={handleSelectTask}
            onCompleteTask={handleCompleteTask}
            emptyMessage="No overdue tasks"
          />
        </section>
      )}

      {/* Today's Tasks */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
          Today ({groupedTasks.today.length})
        </h2>
        {hasToday ? (
          <TaskList
            tasks={groupedTasks.today.map(transformTask)}
            onSelectTask={handleSelectTask}
            onCompleteTask={handleCompleteTask}
            emptyMessage="No tasks due today"
          />
        ) : (
          <div className="rounded-lg border bg-gray-50 p-8 text-center">
            <p className="text-gray-500">
              {hasOverdue
                ? 'No new tasks for today. Consider tackling your overdue tasks!'
                : 'No tasks due today. Add your first task!'}
            </p>
          </div>
        )}
      </section>

      {/* Empty State */}
      {hasNoTasks && (
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            Your day is clear!
          </h3>
          <p className="text-gray-600">
            No tasks due today. Use the form above to add tasks, or check your
            upcoming tasks.
          </p>
        </div>
      )}
    </div>
  )
}
