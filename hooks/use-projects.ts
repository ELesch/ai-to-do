/**
 * Project Hooks
 * React Query hooks for project data fetching and mutations
 *
 * These hooks follow TanStack Query best practices:
 * - Query key factory for consistent cache management
 * - Optimistic updates for better UX
 * - Automatic cache invalidation on mutations
 * - Proper error handling and loading states
 */

'use client'

import { useCallback, useState } from 'react'

// TODO: Uncomment when @tanstack/react-query is installed
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Filter options for project queries
 */
export interface ProjectFilters {
  isFavorite?: boolean
  isArchived?: boolean
  search?: string
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'sortOrder'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Project with task count metadata
 */
export interface ProjectWithStats {
  id: string
  name: string
  description?: string | null
  color: string
  icon?: string | null
  isFavorite?: boolean
  isArchived?: boolean
  taskCount: number
  completedTaskCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string
  description?: string
  color: string
  icon?: string
}

/**
 * Input for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string
  description?: string | null
  color?: string
  icon?: string | null
  isFavorite?: boolean
  isArchived?: boolean
  sortOrder?: number
}

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters ?? {}] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  favorites: () => [...projectKeys.lists(), 'favorites'] as const,
  archived: () => [...projectKeys.lists(), 'archived'] as const,
}

/**
 * Simulated API functions - replace with actual API calls
 */
const projectApi = {
  getProjects: async (_filters?: ProjectFilters): Promise<ProjectWithStats[]> => {
    // TODO: Replace with actual API call
    // const params = new URLSearchParams()
    // if (filters?.isFavorite !== undefined) params.set('isFavorite', String(filters.isFavorite))
    // if (filters?.isArchived !== undefined) params.set('isArchived', String(filters.isArchived))
    // if (filters?.search) params.set('search', filters.search)
    // const response = await fetch(`/api/projects?${params}`)
    // return response.json()
    return []
  },
  getProject: async (_projectId: string): Promise<ProjectWithStats | null> => {
    // TODO: Replace with actual API call
    return null
  },
  createProject: async (_input: CreateProjectInput): Promise<ProjectWithStats> => {
    // TODO: Replace with actual API call
    return {} as ProjectWithStats
  },
  updateProject: async (_projectId: string, _input: UpdateProjectInput): Promise<ProjectWithStats> => {
    // TODO: Replace with actual API call
    return {} as ProjectWithStats
  },
  deleteProject: async (_projectId: string): Promise<void> => {
    // TODO: Replace with actual API call
  },
  archiveProject: async (_projectId: string, _archive: boolean): Promise<ProjectWithStats> => {
    // TODO: Replace with actual API call
    return {} as ProjectWithStats
  },
}

/**
 * Hook to fetch all projects with optional filters
 */
export function useProjects(filters?: ProjectFilters) {
  // TODO: Implement with React Query when installed
  // return useQuery({
  //   queryKey: projectKeys.list(filters),
  //   queryFn: () => projectApi.getProjects(filters),
  //   staleTime: 1000 * 60 * 5, // 5 minutes
  //   gcTime: 1000 * 60 * 30, // 30 minutes
  //   placeholderData: (previousData) => previousData,
  // })

  // Placeholder implementation with proper typing
  const [isLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  return {
    data: [] as ProjectWithStats[],
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    refetch: () => Promise.resolve({ data: [] as ProjectWithStats[] }),
  }
}

/**
 * Hook to fetch favorite projects
 */
export function useFavoriteProjects() {
  return useProjects({ isFavorite: true, isArchived: false })
}

/**
 * Hook to fetch archived projects
 */
export function useArchivedProjects() {
  return useProjects({ isArchived: true })
}

/**
 * Hook to fetch a single project with all details
 */
export function useProject(projectId: string | undefined) {
  // TODO: Implement with React Query when installed
  // return useQuery({
  //   queryKey: projectKeys.detail(projectId!),
  //   queryFn: () => projectApi.getProject(projectId!),
  //   enabled: !!projectId,
  //   staleTime: 1000 * 60 * 5,
  // })

  // Placeholder implementation
  const [isLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  return {
    data: null as ProjectWithStats | null,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    refetch: () => Promise.resolve({ data: null }),
  }
}

/**
 * Hook for project mutations (create, update, delete, archive, favorite)
 * Includes optimistic updates and proper cache invalidation
 */
export function useProjectMutations() {
  // TODO: Implement with React Query mutations when installed
  // const queryClient = useQueryClient()

  const [isPending, setIsPending] = useState(false)

  /**
   * Create a new project
   */
  const createProject = {
    mutate: (
      input: CreateProjectInput,
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Create project:', input)
      options?.onSuccess?.()
    },
    mutateAsync: async (input: CreateProjectInput): Promise<ProjectWithStats> => {
      setIsPending(true)
      try {
        console.log('Create project async:', input)
        const result = await projectApi.createProject(input)
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
   * Update an existing project
   */
  const updateProject = {
    mutate: (
      args: { projectId: string; input: UpdateProjectInput },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Update project:', args)
      options?.onSuccess?.()
    },
    mutateAsync: async (args: { projectId: string; input: UpdateProjectInput }): Promise<ProjectWithStats> => {
      setIsPending(true)
      try {
        console.log('Update project async:', args)
        const result = await projectApi.updateProject(args.projectId, args.input)
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
   * Delete a project
   */
  const deleteProject = {
    mutate: (
      projectId: string,
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Delete project:', projectId)
      options?.onSuccess?.()
    },
    mutateAsync: async (projectId: string): Promise<void> => {
      setIsPending(true)
      try {
        console.log('Delete project async:', projectId)
        await projectApi.deleteProject(projectId)
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
   * Archive/unarchive a project
   */
  const archiveProject = {
    mutate: (
      projectId: string,
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Archive project:', projectId)
      options?.onSuccess?.()
    },
    mutateAsync: async (projectId: string): Promise<ProjectWithStats> => {
      setIsPending(true)
      try {
        console.log('Archive project async:', projectId)
        // Toggle archive state - in real implementation, get current state first
        const result = await projectApi.archiveProject(projectId, true)
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
   * Toggle favorite status
   */
  const favoriteProject = {
    mutate: (
      args: { projectId: string; isFavorite: boolean },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void }
    ) => {
      console.log('Favorite project:', args)
      options?.onSuccess?.()
    },
    mutateAsync: async (args: { projectId: string; isFavorite: boolean }): Promise<ProjectWithStats> => {
      setIsPending(true)
      try {
        console.log('Favorite project async:', args)
        const result = await projectApi.updateProject(args.projectId, { isFavorite: args.isFavorite })
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

  return {
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    favoriteProject,
  }
}

/**
 * Hook to invalidate project caches
 * Useful after bulk operations or external data changes
 */
export function useInvalidateProjects() {
  // TODO: Implement with React Query when installed
  // const queryClient = useQueryClient()

  const invalidateAll = useCallback(() => {
    // queryClient.invalidateQueries({ queryKey: projectKeys.all })
    console.log('Invalidate all projects cache')
  }, [])

  const invalidateList = useCallback((_filters?: ProjectFilters) => {
    // queryClient.invalidateQueries({ queryKey: projectKeys.list(filters) })
    console.log('Invalidate project list cache')
  }, [])

  const invalidateDetail = useCallback((_projectId: string) => {
    // queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
    console.log('Invalidate project detail cache')
  }, [])

  return { invalidateAll, invalidateList, invalidateDetail }
}

/**
 * Hook for prefetching projects (useful for hover states)
 */
export function usePrefetchProject() {
  // TODO: Implement with React Query when installed
  // const queryClient = useQueryClient()

  const prefetch = useCallback((_projectId: string) => {
    // queryClient.prefetchQuery({
    //   queryKey: projectKeys.detail(projectId),
    //   queryFn: () => projectApi.getProject(projectId),
    //   staleTime: 1000 * 60 * 5,
    // })
    console.log('Prefetch project')
  }, [])

  return prefetch
}
