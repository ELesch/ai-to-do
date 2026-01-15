/**
 * UI Store
 * Zustand store for UI state management
 */

'use client'

// TODO: Uncomment when zustand is installed
// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'

export interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void

  // AI Panel
  aiPanelOpen: boolean
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void

  // Selected items
  selectedTaskId: string | null
  setSelectedTask: (id: string | null) => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Modal state
  activeModal: string | null
  setActiveModal: (modal: string | null) => void
}

// Placeholder implementation until zustand is installed
let state: UIState = {
  sidebarOpen: true,
  sidebarWidth: 280,
  toggleSidebar: () => {
    state = { ...state, sidebarOpen: !state.sidebarOpen }
  },
  setSidebarWidth: (width: number) => {
    state = { ...state, sidebarWidth: width }
  },

  aiPanelOpen: false,
  toggleAIPanel: () => {
    state = { ...state, aiPanelOpen: !state.aiPanelOpen }
  },
  setAIPanelOpen: (open: boolean) => {
    state = { ...state, aiPanelOpen: open }
  },

  selectedTaskId: null,
  setSelectedTask: (id: string | null) => {
    state = { ...state, selectedTaskId: id }
  },

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open: boolean) => {
    state = { ...state, commandPaletteOpen: open }
  },

  theme: 'system',
  setTheme: (theme: 'light' | 'dark' | 'system') => {
    state = { ...state, theme }
  },

  activeModal: null,
  setActiveModal: (modal: string | null) => {
    state = { ...state, activeModal: modal }
  },
}

export function useUIStore(): UIState
export function useUIStore<T>(selector: (state: UIState) => T): T
export function useUIStore<T>(selector?: (state: UIState) => T) {
  // TODO: Replace with actual zustand store
  if (selector) {
    return selector(state)
  }
  return state
}

/*
// Actual zustand implementation (uncomment when installed)
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarWidth: 280,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      // AI Panel
      aiPanelOpen: false,
      toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),

      // Selected items
      selectedTaskId: null,
      setSelectedTask: (id) => set({ selectedTaskId: id }),

      // Command palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Modal state
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),
    }),
    {
      name: 'ai-todo-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
    }
  )
)
*/
