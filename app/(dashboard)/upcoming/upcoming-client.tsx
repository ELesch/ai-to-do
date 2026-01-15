/**
 * Upcoming Page Client Component
 * Handles client-side interactions for the upcoming page
 */

'use client'

import { type FC } from 'react'
import { useRouter } from 'next/navigation'
import { TaskList } from '@/components/features/tasks'

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

interface DateGroup {
  dateKey: string
  label: string
  tasks: Task[]
}

interface UpcomingPageClientProps {
  groupedTasks: DateGroup[]
}

// Transform service task to component task format
function transformTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: (task.status as 'pending' | 'in_progress' | 'completed' | 'deleted') || 'pending',
    priority: (task.priority as 'high' | 'medium' | 'low' | 'none') || 'none',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
  }
}

export const UpcomingPageClient: FC<UpcomingPageClientProps> = ({ groupedTasks }) => {
  const router = useRouter()

  const handleSelectTask = (taskId: string) => {
    router.push(`/task/${taskId}`)
  }

  const handleCompleteTask = (taskId: string) => {
    console.log('Completing task:', taskId)
    router.refresh()
  }

  const totalTasks = groupedTasks.reduce((sum, group) => sum + group.tasks.length, 0)
  const hasNoTasks = totalTasks === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upcoming</h1>
        <p className="text-gray-600">
          {totalTasks > 0
            ? `${totalTasks} task${totalTasks !== 1 ? 's' : ''} scheduled for the next 7 days`
            : 'Tasks scheduled for the next 7 days'}
        </p>
      </div>

      {/* Date-grouped task sections */}
      {groupedTasks.length > 0 ? (
        <section className="space-y-8">
          {groupedTasks.map(({ dateKey, label, tasks }) => (
            <div key={dateKey}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                {label} ({tasks.length})
              </h2>
              <TaskList
                tasks={tasks.map(transformTask)}
                onSelectTask={handleSelectTask}
                onCompleteTask={handleCompleteTask}
                emptyMessage="No tasks"
              />
            </div>
          ))}
        </section>
      ) : (
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold text-gray-800">
            No upcoming tasks
          </h3>
          <p className="text-gray-600">
            You have no tasks scheduled for the next 7 days. Add tasks from the Today view or create new ones.
          </p>
        </div>
      )}

      {/* Empty state message */}
      {hasNoTasks && (
        <div className="text-center text-sm text-gray-500">
          Tip: Set due dates on your tasks to see them here
        </div>
      )}
    </div>
  )
}
