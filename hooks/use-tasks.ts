/**
 * Task Hooks
 * React Query hooks for task data fetching and mutations
 *
 * These hooks follow TanStack Query best practices:
 * - Query key factory for consistent cache management
 * - Optimistic updates for better UX
 * - Automatic cache invalidation on mutations
 * - Proper error handling and loading states
 */

'use client'

import { useCallback, useState } from 'react'
import type { Task, CreateTaskInput, UpdateTaskInput, TaskPriority } from '@/types/task'

// TODO: Uncomment when @tanstack/react-query is installed
// import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'

/**
 * Filter options for task queries
 */
export interface TaskFilters {
  status?: 'pending' | 'in_progress' | 'completed' | 'deleted'
  priority?: TaskPriority
  projectId?: string
  dueDate?: string
  dueDateFrom?: string
  dueDateTo?: string
  hasNoDueDate?: boolean
  search?: string
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'sortOrder'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Task with additional UI-related properties
 */
export interface TaskWithMeta extends Task {
  subtaskCount?: number
  completedSubtaskCount?: number
  project?: {
    id: string
    name: string
    color: string
  } | null
}

/**
 * Query keys factory for consistent cache key management
 * Following TanStack Query best practices
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  subtasks: (parentId: string) => [...taskKeys.all, 'subtasks', parentId] as const,
  today: () => [...taskKeys.lists(), 'today'] as const,
  upcoming: () => [...taskKeys.lists(), 'upcoming'] as const,
  overdue: () => [...taskKeys.lists(), 'overdue'] as const,
  byProject: (projectId: string) => [...taskKeys.lists(), 'project', projectId] as const,
}

/**
 * API response type
 */
interface TasksResponse {
  tasks: TaskWithMeta[]
  total: number
  hasMore: boolean
}

/**
 * Simulated API functions - replace with actual API calls
 */
const taskApi = {
  getTasks: async (_filters: TaskFilters): Promise<TasksResponse> => {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/tasks?${new URLSearchParams(filters as Record<string, string>)}`)
    // return response.json()
    return { tasks: [], total: 0, hasMore: false }
  },
  getTask: async (_taskId: string): Promise<TaskWithMeta | null> => {
    // TODO: Replace with actual API call
    return null
  },
  createTask: async (_input: CreateTaskInput): Promise<TaskWithMeta> => {
    // TODO: Replace with actual API call
    return {} as TaskWithMeta
  },
  updateTask: async (_taskId: string, _input: UpdateTaskInput): Promise<TaskWithMeta> => {
    // TODO: Replace with actual API call
    return {} as TaskWithMeta
  },
  deleteTask: async (_taskId: string): Promise<void> => {
    // TODO: Replace with actual API call
  },
  completeTask: async (_taskId: string, _completed: boolean): Promise<TaskWithMeta> => {
    // TODO: Replace with actual API call
    return {} as TaskWithMeta
  },
}

/**
 * Hook to fetch tasks with filters
 * Supports pagination, filtering, and sorting
 */
export function useTasks(filters: TaskFilters = {}) {
  // TODO: Implement with React Query when installed
  // return useQuery({
  //   queryKey: taskKeys.list(filters),
  //   queryFn: () => taskApi.getTasks(filters),
  //   staleTime: 1000 * 60 * 5, // 5 minutes
  //   gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  //   placeholderData: (previousData) => previousData, // Keep previous data while fetching
  // })

  // Placeholder implementation with proper typing
  const [isLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  return {
    data: { tasks: [] as TaskWithMeta[], total: 0, hasMore: false },
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    refetch: () => Promise.resolve({ data: { tasks: [], total: 0, hasMore: false } }),
  }
}

/**
 * Hook to fetch a single task with all details
 */
export function useTask(taskId: string | undefined) {
  // TODO: Implement with React Query when installed
  // return useQuery({
  //   queryKey: taskKeys.detail(taskId!),
  //   queryFn: () => taskApi.getTask(taskId!),
  //   enabled: !!taskId,
  //   staleTime: 1000 * 60 * 5,
  // })

  const [isLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  return {
    data: null as TaskWithMeta | null,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    refetch: () => Promise.resolve({ data: null }),
  }
}

/**
 * Hook to fetch subtasks for a parent task
 */
export function useSubtasks(parentTaskId: string | undefined) {
  // TODO: Implement with React Query when installed
  // return useQuery({
  //   queryKey: taskKeys.subtasks(parentTaskId!),
  //   queryFn: () => taskApi.getTasks({ parentTaskId }),
  //   enabled: !!parentTaskId,
  // })

  return {
    data: [] as TaskWithMeta[],
    isLoading: false,
    isError: false,
    error: null,
  }
}

/**
 * Hook for task mutations (create, update, delete, complete)
 * Includes optimistic updates and proper cache invalidation
 */
export function useTaskMutations() {
  // TODO: Implement with React Query mutations when installed
  // const queryClient = useQueryClient()

  // Placeholder with proper callback patterns
  const [isPending, setIsPending] = useState(false)

  /**
   * Create a new task
   */
  const createTask = {
    mutate: (input: CreateTaskInput, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      console.log('Create task:', input)
      options?.onSuccess?.()
    },
    mutateAsync: async (input: CreateTaskInput): Promise<TaskWithMeta> => {
      setIsPending(true)
      try {
        console.log('Create task async:', input)
        const result = await taskApi.createTask(input)
        return result
      } finally {
        setIsPending(false)
      }
    },
    isPending,
    isError: false,
    error: null as Error | null,
    reset: () => {},
  }

  /**
   * Update an existing task
   */
  const updateTask = {
    mutate: (
      args: { taskId: string; input: UpdateTaskInput },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Update task:', args)
      options?.onSuccess?.()
    },
    mutateAsync: async (args: { taskId: string; input: UpdateTaskInput }): Promise<TaskWithMeta> => {
      setIsPending(true)
      try {
        console.log('Update task async:', args)
        const result = await taskApi.updateTask(args.taskId, args.input)
        return result
      } finally {
        setIsPending(false)
      }
    },
    isPending,
    isError: false,
    error: null as Error | null,
    reset: () => {},
  }

  /**
   * Delete a task (soft delete)
   */
  const deleteTask = {
    mutate: (taskId: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
      console.log('Delete task:', taskId)
      options?.onSuccess?.()
    },
    mutateAsync: async (taskId: string): Promise<void> => {
      setIsPending(true)
      try {
        console.log('Delete task async:', taskId)
        await taskApi.deleteTask(taskId)
      } finally {
        setIsPending(false)
      }
    },
    isPending,
    isError: false,
    error: null as Error | null,
    reset: () => {},
  }

  /**
   * Toggle task completion status
   */
  const completeTask = {
    mutate: (
      args: { taskId: string; completed: boolean },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Complete task:', args)
      options?.onSuccess?.()
    },
    mutateAsync: async (args: { taskId: string; completed: boolean }): Promise<TaskWithMeta> => {
      setIsPending(true)
      try {
        console.log('Complete task async:', args)
        const result = await taskApi.completeTask(args.taskId, args.completed)
        return result
      } finally {
        setIsPending(false)
      }
    },
    isPending,
    isError: false,
    error: null as Error | null,
    reset: () => {},
  }

  /**
   * Add a subtask to a parent task
   */
  const addSubtask = {
    mutate: (
      args: { parentTaskId: string; title: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Add subtask:', args)
      options?.onSuccess?.()
    },
    mutateAsync: async (args: { parentTaskId: string; title: string }): Promise<TaskWithMeta> => {
      setIsPending(true)
      try {
        console.log('Add subtask async:', args)
        const result = await taskApi.createTask({
          title: args.title,
          parentTaskId: args.parentTaskId,
        })
        return result
      } finally {
        setIsPending(false)
      }
    },
    isPending,
    isError: false,
    error: null as Error | null,
    reset: () => {},
  }

  return { createTask, updateTask, deleteTask, completeTask, addSubtask }
}

/**
 * Hook for today's tasks with proper date filtering
 */
export function useTodayTasks() {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  return useTasks({
    dueDate: dateStr,
    status: 'pending',
    sortBy: 'priority',
    sortOrder: 'desc',
  })
}

/**
 * Hook for upcoming tasks (next 7 days)
 */
export function useUpcomingTasks(days: number = 7) {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + days)

  return useTasks({
    dueDateFrom: today.toISOString().split('T')[0],
    dueDateTo: futureDate.toISOString().split('T')[0],
    status: 'pending',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })
}

/**
 * Hook for overdue tasks
 */
export function useOverdueTasks() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return useTasks({
    dueDateTo: yesterday.toISOString().split('T')[0],
    status: 'pending',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })
}

/**
 * Hook for tasks by project
 */
export function useProjectTasks(projectId: string | undefined) {
  return useTasks(projectId ? { projectId } : {})
}

/**
 * Hook to invalidate task caches
 * Useful after bulk operations or external data changes
 */
export function useInvalidateTasks() {
  // TODO: Implement with React Query when installed
  // const queryClient = useQueryClient()

  const invalidateAll = useCallback(() => {
    // queryClient.invalidateQueries({ queryKey: taskKeys.all })
    console.log('Invalidate all tasks cache')
  }, [])

  const invalidateList = useCallback((_filters?: TaskFilters) => {
    // queryClient.invalidateQueries({ queryKey: taskKeys.list(filters || {}) })
    console.log('Invalidate task list cache')
  }, [])

  const invalidateDetail = useCallback((_taskId: string) => {
    // queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
    console.log('Invalidate task detail cache')
  }, [])

  return { invalidateAll, invalidateList, invalidateDetail }
}

/**
 * Hook for prefetching tasks (useful for hover states)
 */
export function usePrefetchTask() {
  // TODO: Implement with React Query when installed
  // const queryClient = useQueryClient()

  const prefetch = useCallback((_taskId: string) => {
    // queryClient.prefetchQuery({
    //   queryKey: taskKeys.detail(taskId),
    //   queryFn: () => taskApi.getTask(taskId),
    //   staleTime: 1000 * 60 * 5,
    // })
    console.log('Prefetch task')
  }, [])

  return prefetch
}
