/**
 * Task Store
 * Zustand store for optimistic task updates
 */

'use client'

// TODO: Uncomment when zustand is installed
// import { create } from 'zustand'

interface OptimisticTask {
  id: string
  title: string
  completed: boolean
  priority: string
  isOptimistic: boolean
}

export interface TaskStoreState {
  // Optimistic updates
  optimisticTasks: Map<string, OptimisticTask>
  addOptimisticTask: (task: OptimisticTask) => void
  removeOptimisticTask: (taskId: string) => void
  clearOptimisticTasks: () => void

  // Task editing
  editingTaskId: string | null
  setEditingTask: (taskId: string | null) => void

  // Quick add
  quickAddOpen: boolean
  quickAddProjectId: string | null
  setQuickAddOpen: (open: boolean, projectId?: string | null) => void

  // Drag and drop
  draggingTaskId: string | null
  setDraggingTask: (taskId: string | null) => void
  dropTargetId: string | null
  setDropTarget: (targetId: string | null) => void
}

// Placeholder implementation until zustand is installed
let state: TaskStoreState = {
  optimisticTasks: new Map(),
  addOptimisticTask: (task: OptimisticTask) => {
    state.optimisticTasks.set(task.id, task)
  },
  removeOptimisticTask: (taskId: string) => {
    state.optimisticTasks.delete(taskId)
  },
  clearOptimisticTasks: () => {
    state.optimisticTasks.clear()
  },

  editingTaskId: null,
  setEditingTask: (taskId: string | null) => {
    state = { ...state, editingTaskId: taskId }
  },

  quickAddOpen: false,
  quickAddProjectId: null,
  setQuickAddOpen: (open: boolean, projectId?: string | null) => {
    state = {
      ...state,
      quickAddOpen: open,
      quickAddProjectId: projectId ?? null,
    }
  },

  draggingTaskId: null,
  setDraggingTask: (taskId: string | null) => {
    state = { ...state, draggingTaskId: taskId }
  },
  dropTargetId: null,
  setDropTarget: (targetId: string | null) => {
    state = { ...state, dropTargetId: targetId }
  },
}

export function useTaskStore(): TaskStoreState
export function useTaskStore<T>(selector: (state: TaskStoreState) => T): T
export function useTaskStore<T>(selector?: (state: TaskStoreState) => T) {
  // TODO: Replace with actual zustand store
  if (selector) {
    return selector(state)
  }
  return state
}

/*
// Actual zustand implementation (uncomment when installed)
export const useTaskStore = create<TaskStoreState>()((set, get) => ({
  // Optimistic updates
  optimisticTasks: new Map(),
  addOptimisticTask: (task) => {
    const tasks = new Map(get().optimisticTasks)
    tasks.set(task.id, task)
    set({ optimisticTasks: tasks })
  },
  removeOptimisticTask: (taskId) => {
    const tasks = new Map(get().optimisticTasks)
    tasks.delete(taskId)
    set({ optimisticTasks: tasks })
  },
  clearOptimisticTasks: () => set({ optimisticTasks: new Map() }),

  // Task editing
  editingTaskId: null,
  setEditingTask: (taskId) => set({ editingTaskId: taskId }),

  // Quick add
  quickAddOpen: false,
  quickAddProjectId: null,
  setQuickAddOpen: (open, projectId = null) =>
    set({ quickAddOpen: open, quickAddProjectId: projectId }),

  // Drag and drop
  draggingTaskId: null,
  setDraggingTask: (taskId) => set({ draggingTaskId: taskId }),
  dropTargetId: null,
  setDropTarget: (targetId) => set({ dropTargetId: targetId }),
}))
*/
