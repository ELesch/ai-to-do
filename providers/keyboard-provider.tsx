/**
 * Keyboard Provider
 * React context for managing keyboard shortcuts throughout the app
 */

'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type FC,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAppShortcuts } from '@/hooks/use-keyboard-shortcuts'
import {
  KeyboardShortcutsDialog,
  useKeyboardShortcutsDialog,
} from '@/components/shared/keyboard-shortcuts-dialog'

interface KeyboardContextValue {
  // Dialog state
  isShortcutsDialogOpen: boolean
  openShortcutsDialog: () => void
  closeShortcutsDialog: () => void
  toggleShortcutsDialog: () => void

  // Task selection state (for keyboard navigation)
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void

  // Modal/overlay tracking
  isAnyModalOpen: boolean
  setModalOpen: (open: boolean) => void

  // Action handlers that can be overridden by consumers
  handlers: KeyboardHandlers

  // Register custom handlers
  registerHandler: (key: keyof KeyboardHandlers, handler: () => void) => void
  unregisterHandler: (key: keyof KeyboardHandlers) => void
}

interface KeyboardHandlers {
  onOpenCommandPalette?: () => void
  onNewTask?: () => void
  onNewProject?: () => void
  onSearch?: () => void
  onToggleSidebar?: () => void
  onToggleAI?: () => void
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null)

interface KeyboardProviderProps {
  children: ReactNode
  // Optional initial handlers
  initialHandlers?: Partial<KeyboardHandlers>
}

export const KeyboardProvider: FC<KeyboardProviderProps> = ({
  children,
  initialHandlers = {},
}) => {
  const router = useRouter()

  // Shortcuts dialog state
  const {
    open: isShortcutsDialogOpen,
    setOpen: setShortcutsDialogOpen,
    openDialog: openShortcutsDialog,
    closeDialog: closeShortcutsDialog,
    toggleDialog: toggleShortcutsDialog,
  } = useKeyboardShortcutsDialog()

  // Task selection state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Modal tracking
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false)

  // Custom handlers that can be registered by child components
  const [handlers, setHandlers] = useState<KeyboardHandlers>(initialHandlers)

  // Register a handler
  const registerHandler = useCallback(
    (key: keyof KeyboardHandlers, handler: () => void) => {
      setHandlers((prev) => ({ ...prev, [key]: handler }))
    },
    []
  )

  // Unregister a handler
  const unregisterHandler = useCallback((key: keyof KeyboardHandlers) => {
    setHandlers((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Set up app-wide shortcuts
  useAppShortcuts({
    onOpenCommandPalette: handlers.onOpenCommandPalette,
    onNewTask: handlers.onNewTask,
    onNewProject: handlers.onNewProject,
    onSearch: handlers.onSearch,
    onToggleSidebar: handlers.onToggleSidebar,
    onToggleAI: handlers.onToggleAI,
    onGoToToday: useCallback(() => {
      router.push('/today')
    }, [router]),
    onGoToUpcoming: useCallback(() => {
      router.push('/upcoming')
    }, [router]),
    onGoToProjects: useCallback(() => {
      router.push('/projects')
    }, [router]),
    onOpenShortcutsDialog: toggleShortcutsDialog,
    onCloseModal: useCallback(() => {
      // Close shortcuts dialog if open
      if (isShortcutsDialogOpen) {
        closeShortcutsDialog()
      }
    }, [isShortcutsDialogOpen, closeShortcutsDialog]),
  })

  // Track when shortcuts dialog changes modal state
  useEffect(() => {
    setIsAnyModalOpen(isShortcutsDialogOpen)
  }, [isShortcutsDialogOpen])

  const value: KeyboardContextValue = {
    isShortcutsDialogOpen,
    openShortcutsDialog,
    closeShortcutsDialog,
    toggleShortcutsDialog,
    selectedTaskId,
    setSelectedTaskId,
    isAnyModalOpen,
    setModalOpen: setIsAnyModalOpen,
    handlers,
    registerHandler,
    unregisterHandler,
  }

  return (
    <KeyboardContext.Provider value={value}>
      {children}

      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog
        open={isShortcutsDialogOpen}
        onOpenChange={setShortcutsDialogOpen}
      />
    </KeyboardContext.Provider>
  )
}

/**
 * Hook to access keyboard context
 */
export function useKeyboardContext() {
  const context = useContext(KeyboardContext)
  if (!context) {
    throw new Error('useKeyboardContext must be used within a KeyboardProvider')
  }
  return context
}

/**
 * Hook for components that optionally want keyboard context
 * Returns null if not within a KeyboardProvider
 */
export function useOptionalKeyboardContext() {
  return useContext(KeyboardContext)
}

/**
 * Hook to register a handler when a component mounts
 * and unregister when it unmounts
 */
export function useRegisterKeyboardHandler(
  key: keyof KeyboardHandlers,
  handler: () => void,
  deps: React.DependencyList = []
) {
  const { registerHandler, unregisterHandler } = useKeyboardContext()

  useEffect(() => {
    registerHandler(key, handler)
    return () => unregisterHandler(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, registerHandler, unregisterHandler, ...deps])
}
