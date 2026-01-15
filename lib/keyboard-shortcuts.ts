/**
 * Keyboard Shortcuts Definitions
 * Central registry for all keyboard shortcuts in the application
 */

export type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift'

export interface ShortcutDefinition {
  id: string
  key: string
  modifiers: ModifierKey[]
  label: string
  description: string
  category: ShortcutCategory
  // Whether this shortcut should be active globally or only in specific contexts
  global?: boolean
  // Whether to prevent default browser behavior
  preventDefault?: boolean
}

export type ShortcutCategory =
  | 'navigation'
  | 'tasks'
  | 'general'
  | 'ai'
  | 'editing'

export interface ShortcutGroup {
  category: ShortcutCategory
  label: string
  shortcuts: ShortcutDefinition[]
}

/**
 * Utility to detect if user is on macOS
 */
export function isMac(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

/**
 * Get the appropriate modifier key label based on platform
 */
export function getModifierLabel(modifier: ModifierKey): string {
  const mac = isMac()
  switch (modifier) {
    case 'meta':
      return mac ? '\u2318' : 'Ctrl'
    case 'ctrl':
      return mac ? '\u2303' : 'Ctrl'
    case 'alt':
      return mac ? '\u2325' : 'Alt'
    case 'shift':
      return mac ? '\u21E7' : 'Shift'
    default:
      return modifier
  }
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const mac = isMac()
  const parts: string[] = []

  // Order modifiers properly: Ctrl/Cmd, Alt, Shift
  const modifierOrder: ModifierKey[] = ['meta', 'ctrl', 'alt', 'shift']

  for (const mod of modifierOrder) {
    if (shortcut.modifiers.includes(mod)) {
      // On Mac, meta is Cmd; on Windows/Linux, meta maps to Windows key
      // We typically want Ctrl on Windows to match Meta on Mac
      if (mod === 'meta' || (mod === 'ctrl' && !mac)) {
        parts.push(getModifierLabel(mac ? 'meta' : 'ctrl'))
      } else if (mod === 'ctrl' && mac) {
        parts.push(getModifierLabel('ctrl'))
      } else {
        parts.push(getModifierLabel(mod))
      }
    }
  }

  // Format the key
  let keyLabel = shortcut.key.toUpperCase()
  if (shortcut.key === ' ') {
    keyLabel = 'Space'
  } else if (shortcut.key === 'Escape') {
    keyLabel = 'Esc'
  } else if (shortcut.key === 'ArrowUp') {
    keyLabel = '\u2191'
  } else if (shortcut.key === 'ArrowDown') {
    keyLabel = '\u2193'
  } else if (shortcut.key === 'ArrowLeft') {
    keyLabel = '\u2190'
  } else if (shortcut.key === 'ArrowRight') {
    keyLabel = '\u2192'
  } else if (shortcut.key === 'Enter') {
    keyLabel = mac ? '\u21A9' : 'Enter'
  } else if (shortcut.key === '?') {
    keyLabel = '?'
  }

  parts.push(keyLabel)

  return mac ? parts.join('') : parts.join('+')
}

/**
 * All keyboard shortcuts in the application
 */
export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation shortcuts
  {
    id: 'go-to-today',
    key: '1',
    modifiers: ['meta'],
    label: 'Go to Today',
    description: 'Navigate to the Today view',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-to-upcoming',
    key: '2',
    modifiers: ['meta'],
    label: 'Go to Upcoming',
    description: 'Navigate to the Upcoming view',
    category: 'navigation',
    global: true,
  },
  {
    id: 'go-to-projects',
    key: '3',
    modifiers: ['meta'],
    label: 'Go to Projects',
    description: 'Navigate to the Projects view',
    category: 'navigation',
    global: true,
  },

  // General shortcuts
  {
    id: 'open-command-palette',
    key: 'k',
    modifiers: ['meta'],
    label: 'Command Palette',
    description: 'Open the command palette for quick actions',
    category: 'general',
    global: true,
  },
  {
    id: 'open-shortcuts-dialog',
    key: '?',
    modifiers: [],
    label: 'Keyboard Shortcuts',
    description: 'Show all keyboard shortcuts',
    category: 'general',
    global: true,
    preventDefault: false,
  },
  {
    id: 'close-modal',
    key: 'Escape',
    modifiers: [],
    label: 'Close',
    description: 'Close current modal or dialog',
    category: 'general',
    global: true,
    preventDefault: false,
  },
  {
    id: 'search',
    key: '/',
    modifiers: [],
    label: 'Search',
    description: 'Focus the search input',
    category: 'general',
    global: true,
  },

  // Task shortcuts
  {
    id: 'new-task',
    key: 'n',
    modifiers: ['meta'],
    label: 'New Task',
    description: 'Create a new task',
    category: 'tasks',
    global: true,
  },
  {
    id: 'new-project',
    key: 'n',
    modifiers: ['meta', 'shift'],
    label: 'New Project',
    description: 'Create a new project',
    category: 'tasks',
    global: true,
  },
  {
    id: 'toggle-task-completion',
    key: ' ',
    modifiers: [],
    label: 'Toggle Complete',
    description: 'Mark selected task as complete/incomplete',
    category: 'tasks',
    global: false,
  },
  {
    id: 'open-task',
    key: 'Enter',
    modifiers: [],
    label: 'Open Task',
    description: 'Open selected task for editing',
    category: 'tasks',
    global: false,
  },
  {
    id: 'delete-task',
    key: 'Backspace',
    modifiers: ['meta'],
    label: 'Delete Task',
    description: 'Delete the selected task',
    category: 'tasks',
    global: false,
  },
  {
    id: 'navigate-up',
    key: 'ArrowUp',
    modifiers: [],
    label: 'Move Up',
    description: 'Select the previous task in the list',
    category: 'tasks',
    global: false,
    preventDefault: true,
  },
  {
    id: 'navigate-down',
    key: 'ArrowDown',
    modifiers: [],
    label: 'Move Down',
    description: 'Select the next task in the list',
    category: 'tasks',
    global: false,
    preventDefault: true,
  },

  // AI shortcuts
  {
    id: 'toggle-ai-panel',
    key: '/',
    modifiers: ['meta'],
    label: 'Toggle AI Panel',
    description: 'Show or hide the AI assistant panel',
    category: 'ai',
    global: true,
  },
  {
    id: 'ai-quick-ask',
    key: 'j',
    modifiers: ['meta'],
    label: 'AI Quick Ask',
    description: 'Open AI chat for quick questions',
    category: 'ai',
    global: true,
  },

  // Editing shortcuts
  {
    id: 'edit-task',
    key: 'e',
    modifiers: [],
    label: 'Edit Task',
    description: 'Edit the selected task',
    category: 'editing',
    global: false,
  },
  {
    id: 'save',
    key: 's',
    modifiers: ['meta'],
    label: 'Save',
    description: 'Save current changes',
    category: 'editing',
    global: false,
  },
]

/**
 * Get shortcuts grouped by category
 */
export function getShortcutsByCategory(): ShortcutGroup[] {
  const categoryLabels: Record<ShortcutCategory, string> = {
    navigation: 'Navigation',
    tasks: 'Tasks',
    general: 'General',
    ai: 'AI Assistant',
    editing: 'Editing',
  }

  const categoryOrder: ShortcutCategory[] = [
    'general',
    'navigation',
    'tasks',
    'ai',
    'editing',
  ]

  const grouped = new Map<ShortcutCategory, ShortcutDefinition[]>()

  for (const shortcut of KEYBOARD_SHORTCUTS) {
    const existing = grouped.get(shortcut.category) || []
    grouped.set(shortcut.category, [...existing, shortcut])
  }

  return categoryOrder
    .filter((cat) => grouped.has(cat))
    .map((category) => ({
      category,
      label: categoryLabels[category],
      shortcuts: grouped.get(category)!,
    }))
}

/**
 * Get a shortcut by its ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return KEYBOARD_SHORTCUTS.find((s) => s.id === id)
}

/**
 * Get global shortcuts only
 */
export function getGlobalShortcuts(): ShortcutDefinition[] {
  return KEYBOARD_SHORTCUTS.filter((s) => s.global === true)
}

/**
 * Get context-specific shortcuts
 */
export function getContextShortcuts(context: string): ShortcutDefinition[] {
  // For now, return non-global shortcuts
  // This can be extended to support different contexts
  return KEYBOARD_SHORTCUTS.filter((s) => s.global !== true)
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition
): boolean {
  // Check key match (case insensitive for letters)
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()

  if (!keyMatches) return false

  // Check all required modifiers are pressed
  const modifiersMatch = shortcut.modifiers.every((mod) => {
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

  if (!modifiersMatch) return false

  // Check no extra modifiers are pressed (unless they're in the required list)
  const noExtraModifiers =
    (shortcut.modifiers.includes('ctrl') || !event.ctrlKey) &&
    (shortcut.modifiers.includes('meta') || !event.metaKey) &&
    (shortcut.modifiers.includes('alt') || !event.altKey) &&
    (shortcut.modifiers.includes('shift') || !event.shiftKey)

  return noExtraModifiers
}

/**
 * Check if the event target is an input element
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  const isInput = tagName === 'input' || tagName === 'textarea'
  const isContentEditable = target.isContentEditable

  return isInput || isContentEditable
}

/**
 * Check if a shortcut should be ignored when typing in input fields
 */
export function shouldIgnoreInInput(shortcut: ShortcutDefinition): boolean {
  // Shortcuts with no modifiers should generally be ignored in inputs
  // Exception: Escape key to close modals
  if (shortcut.modifiers.length === 0) {
    return shortcut.key !== 'Escape'
  }
  return false
}
