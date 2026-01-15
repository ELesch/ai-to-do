/**
 * Keyboard Shortcuts Hook
 * Handles global and contextual keyboard shortcuts
 */

'use client'

import { useEffect, useCallback, useRef } from 'react'
import {
  type ShortcutDefinition,
  type ModifierKey,
  matchesShortcut,
  isInputElement,
  shouldIgnoreInInput,
  KEYBOARD_SHORTCUTS,
  getShortcutById,
} from '@/lib/keyboard-shortcuts'

type KeyHandler = (event: KeyboardEvent) => void

interface ShortcutConfig {
  key: string
  modifiers?: ModifierKey[]
  handler: KeyHandler
  enabled?: boolean
  preventDefault?: boolean
}

/**
 * Hook for registering a single keyboard shortcut
 */
export function useKeyboardShortcut(
  key: string,
  handler: KeyHandler,
  options: {
    modifiers?: ModifierKey[]
    enabled?: boolean
    preventDefault?: boolean
    ignoreInInputs?: boolean
  } = {}
) {
  const {
    modifiers = [],
    enabled = true,
    preventDefault = true,
    ignoreInInputs = true,
  } = options

  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in an input field (unless explicitly allowed)
      if (ignoreInInputs && isInputElement(event.target)) {
        // Allow Escape even in inputs
        if (key.toLowerCase() !== 'escape') {
          return
        }
      }

      const keyMatches = event.key.toLowerCase() === key.toLowerCase()

      const modifiersMatch =
        modifiers.length === 0 ||
        modifiers.every((mod) => {
          switch (mod) {
            case 'ctrl':
              return event.ctrlKey
            case 'meta':
              return event.metaKey
            case 'alt':
              return event.altKey
            case 'shift':
              return event.shiftKey
            default:
              return false
          }
        })

      // Check that no extra modifiers are pressed
      const noExtraModifiers =
        (modifiers.includes('ctrl') || !event.ctrlKey) &&
        (modifiers.includes('meta') || !event.metaKey) &&
        (modifiers.includes('alt') || !event.altKey) &&
        (modifiers.includes('shift') || !event.shiftKey)

      if (keyMatches && modifiersMatch && noExtraModifiers) {
        if (preventDefault) {
          event.preventDefault()
        }
        handlerRef.current(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, modifiers, enabled, preventDefault, ignoreInInputs])
}

/**
 * Hook for registering multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue

        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase()
        const modifiers = shortcut.modifiers ?? []

        const modifiersMatch =
          modifiers.length === 0 ||
          modifiers.every((mod) => {
            switch (mod) {
              case 'ctrl':
                return event.ctrlKey
              case 'meta':
                return event.metaKey
              case 'alt':
                return event.altKey
              case 'shift':
                return event.shiftKey
              default:
                return false
            }
          })

        // Check that no extra modifiers are pressed
        const noExtraModifiers =
          (modifiers.includes('ctrl') || !event.ctrlKey) &&
          (modifiers.includes('meta') || !event.metaKey) &&
          (modifiers.includes('alt') || !event.altKey) &&
          (modifiers.includes('shift') || !event.shiftKey)

        if (keyMatches && modifiersMatch && noExtraModifiers) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler(event)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

/**
 * Hook for common app-wide shortcuts
 */
export function useAppShortcuts(handlers: {
  onOpenCommandPalette?: () => void
  onNewTask?: () => void
  onNewProject?: () => void
  onSearch?: () => void
  onToggleSidebar?: () => void
  onToggleAI?: () => void
  onGoToToday?: () => void
  onGoToUpcoming?: () => void
  onGoToProjects?: () => void
  onOpenShortcutsDialog?: () => void
  onCloseModal?: () => void
}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const h = handlersRef.current
      const inInput = isInputElement(event.target)

      // Command palette - Cmd/Ctrl+K
      if (
        h.onOpenCommandPalette &&
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onOpenCommandPalette()
        return
      }

      // New task - Cmd/Ctrl+N
      if (
        h.onNewTask &&
        event.key.toLowerCase() === 'n' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onNewTask()
        return
      }

      // New project - Cmd/Ctrl+Shift+N
      if (
        h.onNewProject &&
        event.key.toLowerCase() === 'n' &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onNewProject()
        return
      }

      // Search - / (not in input)
      if (
        h.onSearch &&
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !inInput
      ) {
        event.preventDefault()
        h.onSearch()
        return
      }

      // Toggle sidebar - Cmd/Ctrl+B
      if (
        h.onToggleSidebar &&
        event.key.toLowerCase() === 'b' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onToggleSidebar()
        return
      }

      // Toggle AI panel - Cmd/Ctrl+/
      if (
        h.onToggleAI &&
        event.key === '/' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onToggleAI()
        return
      }

      // Go to Today - Cmd/Ctrl+1
      if (
        h.onGoToToday &&
        event.key === '1' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onGoToToday()
        return
      }

      // Go to Upcoming - Cmd/Ctrl+2
      if (
        h.onGoToUpcoming &&
        event.key === '2' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onGoToUpcoming()
        return
      }

      // Go to Projects - Cmd/Ctrl+3
      if (
        h.onGoToProjects &&
        event.key === '3' &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        h.onGoToProjects()
        return
      }

      // Open shortcuts dialog - ?
      if (
        h.onOpenShortcutsDialog &&
        event.key === '?' &&
        event.shiftKey && // ? requires shift on most keyboards
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !inInput
      ) {
        event.preventDefault()
        h.onOpenShortcutsDialog()
        return
      }

      // Close modal - Escape
      if (
        h.onCloseModal &&
        event.key === 'Escape' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
      ) {
        // Don't prevent default for Escape
        h.onCloseModal()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

/**
 * Hook for task list keyboard navigation
 */
export function useTaskListNavigation(options: {
  tasks: { id: string }[]
  selectedTaskId?: string
  enabled?: boolean
  onSelectTask: (taskId: string) => void
  onOpenTask?: (taskId: string) => void
  onToggleComplete?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
}) {
  const {
    tasks,
    selectedTaskId,
    enabled = true,
    onSelectTask,
    onOpenTask,
    onToggleComplete,
    onDeleteTask,
  } = options

  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const { tasks, selectedTaskId, onSelectTask, onOpenTask, onToggleComplete, onDeleteTask } =
        optionsRef.current

      // Skip if in input field (except Escape)
      if (isInputElement(event.target) && event.key !== 'Escape') {
        return
      }

      // Find current selection index
      const currentIndex = tasks.findIndex((t) => t.id === selectedTaskId)

      // Arrow Up - select previous task
      if (
        event.key === 'ArrowUp' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        if (tasks.length === 0) return
        if (currentIndex === -1 || currentIndex === 0) {
          onSelectTask(tasks[tasks.length - 1].id)
        } else {
          onSelectTask(tasks[currentIndex - 1].id)
        }
        return
      }

      // Arrow Down - select next task
      if (
        event.key === 'ArrowDown' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        if (tasks.length === 0) return
        if (currentIndex === -1 || currentIndex === tasks.length - 1) {
          onSelectTask(tasks[0].id)
        } else {
          onSelectTask(tasks[currentIndex + 1].id)
        }
        return
      }

      // Enter - open selected task
      if (
        event.key === 'Enter' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        onOpenTask &&
        selectedTaskId
      ) {
        event.preventDefault()
        onOpenTask(selectedTaskId)
        return
      }

      // Space - toggle completion
      if (
        event.key === ' ' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        onToggleComplete &&
        selectedTaskId
      ) {
        event.preventDefault()
        onToggleComplete(selectedTaskId)
        return
      }

      // Backspace/Delete with Cmd/Ctrl - delete task
      if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        onDeleteTask &&
        selectedTaskId
      ) {
        event.preventDefault()
        onDeleteTask(selectedTaskId)
        return
      }

      // J key - move down (vim-style)
      if (
        event.key.toLowerCase() === 'j' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (tasks.length === 0) return
        if (currentIndex === -1 || currentIndex === tasks.length - 1) {
          onSelectTask(tasks[0].id)
        } else {
          onSelectTask(tasks[currentIndex + 1].id)
        }
        return
      }

      // K key - move up (vim-style)
      if (
        event.key.toLowerCase() === 'k' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (tasks.length === 0) return
        if (currentIndex === -1 || currentIndex === 0) {
          onSelectTask(tasks[tasks.length - 1].id)
        } else {
          onSelectTask(tasks[currentIndex - 1].id)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}

/**
 * Hook to register shortcuts from definitions
 */
export function useRegisteredShortcuts(
  shortcutHandlers: Record<string, KeyHandler>,
  options: {
    enabled?: boolean
    globalOnly?: boolean
  } = {}
) {
  const { enabled = true, globalOnly = false } = options
  const handlersRef = useRef(shortcutHandlers)
  handlersRef.current = shortcutHandlers

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const inInput = isInputElement(event.target)

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        // Skip non-global shortcuts if globalOnly is true
        if (globalOnly && !shortcut.global) continue

        // Skip shortcuts that should be ignored in inputs
        if (inInput && shouldIgnoreInInput(shortcut)) continue

        // Check if this shortcut matches the event
        if (!matchesShortcut(event, shortcut)) continue

        // Check if we have a handler for this shortcut
        const handler = handlersRef.current[shortcut.id]
        if (!handler) continue

        // Execute the handler
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        handler(event)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, globalOnly])
}

/**
 * Hook for detecting if any modal/dialog is open
 * This can be used to disable certain shortcuts when modals are open
 */
export function useModalOpen() {
  const checkModalOpen = useCallback(() => {
    // Check for common modal indicators
    const hasDialogOpen =
      document.querySelector('[role="dialog"]') !== null ||
      document.querySelector('[data-state="open"]') !== null ||
      document.querySelector('.modal-open') !== null

    return hasDialogOpen
  }, [])

  return checkModalOpen
}
