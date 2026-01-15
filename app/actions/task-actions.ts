'use server'

/**
 * Task Server Actions
 * Server-side actions for task operations
 */

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { createTaskSchema } from '@/lib/validation'

export type CreateTaskResult =
  | { success: true; task: { id: string; title: string } }
  | { success: false; error: string }

/**
 * Create a new task
 */
export async function createTask(
  title: string,
  dueDate?: Date
): Promise<CreateTaskResult> {
  console.log(
    '[createTask] Starting with title:',
    title,
    'dueDate:',
    dueDate?.toISOString()
  )

  try {
    const user = await getCurrentUser()
    console.log('[createTask] User:', user?.id ?? 'NOT AUTHENTICATED')

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const validatedData = createTaskSchema.parse({
      title,
      dueDate: dueDate?.toISOString(),
      dueDateHasTime: false,
    })
    console.log('[createTask] Validated data:', validatedData)

    const task = await taskService.createTask(user.id, validatedData)
    console.log('[createTask] Task created:', task.id, task.title)

    revalidatePath('/today')
    revalidatePath('/')

    return { success: true, task: { id: task.id, title: task.title } }
  } catch (error) {
    console.error('[createTask] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task',
    }
  }
}

/**
 * Create a task for today
 */
export async function createTaskForToday(
  title: string
): Promise<CreateTaskResult> {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return createTask(title, today)
}
