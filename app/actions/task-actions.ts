'use server'

/**
 * Task Server Actions
 * Server-side actions for task operations
 */

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import {
  createTaskSchema,
  updateTaskSchema,
  type UpdateTaskInput,
} from '@/lib/validation'

export type CreateTaskResult =
  | { success: true; task: { id: string; title: string } }
  | { success: false; error: string }

/**
 * Create a new task
 */
export async function createTask(
  title: string,
  dueDate?: Date | string | null
): Promise<CreateTaskResult> {
  console.log('[createTask] Starting with title:', title)
  console.log('[createTask] dueDate type:', typeof dueDate)
  console.log('[createTask] dueDate value:', dueDate)

  try {
    const user = await getCurrentUser()
    console.log('[createTask] User:', user?.id ?? 'NOT AUTHENTICATED')

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Handle Date serialization - server actions may serialize Date to string
    let dueDateIso: string | null = null
    if (dueDate) {
      if (dueDate instanceof Date) {
        dueDateIso = dueDate.toISOString()
      } else if (typeof dueDate === 'string') {
        dueDateIso = dueDate
      }
    }

    const validatedData = createTaskSchema.parse({
      title,
      dueDate: dueDateIso,
      dueDateHasTime: false,
    })
    console.log(
      '[createTask] Validated data:',
      JSON.stringify(validatedData, null, 2)
    )

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

export type UpdateTaskResult =
  | { success: true; task: { id: string; title: string } }
  | { success: false; error: string }

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  values: {
    title?: string
    description?: string
    priority?: 'none' | 'low' | 'medium' | 'high'
    dueDate?: Date | string | null
    dueDateHasTime?: boolean
    projectId?: string | null
  }
): Promise<UpdateTaskResult> {
  console.log('[updateTask] Starting for task:', taskId)
  console.log(
    '[updateTask] Raw values received:',
    JSON.stringify(values, null, 2)
  )
  console.log('[updateTask] dueDate type:', typeof values.dueDate)
  console.log('[updateTask] dueDate value:', values.dueDate)
  console.log(
    '[updateTask] dueDate instanceof Date:',
    values.dueDate instanceof Date
  )

  try {
    const user = await getCurrentUser()
    console.log('[updateTask] User:', user?.id ?? 'NOT AUTHENTICATED')

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Build update input, converting Date to ISO string
    const updateInput: UpdateTaskInput = {}

    if (values.title !== undefined) {
      updateInput.title = values.title
    }
    if (values.description !== undefined) {
      updateInput.description = values.description || null
    }
    if (values.priority !== undefined) {
      updateInput.priority = values.priority
    }
    if (values.dueDate !== undefined) {
      // Handle both Date objects and ISO strings (server actions serialize Dates to strings)
      if (values.dueDate === null) {
        updateInput.dueDate = null
      } else if (values.dueDate instanceof Date) {
        updateInput.dueDate = values.dueDate.toISOString()
      } else {
        // Already a string (from server action serialization)
        updateInput.dueDate = values.dueDate
      }
    }
    if (values.dueDateHasTime !== undefined) {
      updateInput.dueDateHasTime = values.dueDateHasTime
    }
    if (values.projectId !== undefined) {
      updateInput.projectId = values.projectId
    }

    console.log(
      '[updateTask] Update input before validation:',
      JSON.stringify(updateInput, null, 2)
    )

    const validatedData = updateTaskSchema.parse(updateInput)
    console.log(
      '[updateTask] Validated data:',
      JSON.stringify(validatedData, null, 2)
    )

    const task = await taskService.updateTask(taskId, user.id, validatedData)
    console.log('[updateTask] Task updated:', task.id, task.title)

    // Verify the update by fetching the task again
    const verifyTask = await taskService.getTask(taskId, user.id)
    console.log(
      '[updateTask] Verification - task title after update:',
      verifyTask?.title
    )

    revalidatePath('/today')
    revalidatePath('/')
    revalidatePath(`/task/${taskId}`)

    return { success: true, task: { id: task.id, title: task.title } }
  } catch (error) {
    console.error('[updateTask] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    }
  }
}

export type CompleteTaskResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Toggle task completion status
 */
export async function completeTask(
  taskId: string,
  completed: boolean
): Promise<CompleteTaskResult> {
  console.log('[completeTask] Setting task', taskId, 'completed:', completed)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const status = completed ? 'completed' : 'pending'
    await taskService.updateTask(taskId, user.id, { status })

    revalidatePath('/today')
    revalidatePath('/')
    revalidatePath(`/task/${taskId}`)

    return { success: true }
  } catch (error) {
    console.error('[completeTask] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    }
  }
}

export type DeleteTaskResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Delete a task (soft delete)
 */
export async function deleteTask(taskId: string): Promise<DeleteTaskResult> {
  console.log('[deleteTask] Deleting task:', taskId)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    await taskService.deleteTask(taskId, user.id)

    revalidatePath('/today')
    revalidatePath('/')

    return { success: true }
  } catch (error) {
    console.error('[deleteTask] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task',
    }
  }
}
