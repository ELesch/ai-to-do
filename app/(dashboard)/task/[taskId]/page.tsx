/**
 * Task Detail Page
 * Full task view with AI assistance panel
 */

import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { taskService } from '@/services'
import { TaskDetailClient } from './task-detail-client'

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string
  }>
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params
  const user = await requireAuth()

  // Fetch the task
  const task = await taskService.getTask(taskId, user.id)

  // Handle not found
  if (!task) {
    notFound()
  }

  // Fetch subtasks (tasks with this task as parent)
  const subtasks = await taskService.getSubtasks(taskId, user.id)

  return (
    <TaskDetailClient
      task={task}
      subtasks={subtasks}
      userId={user.id}
    />
  )
}
