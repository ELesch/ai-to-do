/**
 * Shared Components Index
 * Re-exports all shared/cross-feature components
 */

export {
  KeyboardShortcutsDialog,
  ShortcutHint,
  useKeyboardShortcutsDialog,
} from './keyboard-shortcuts-dialog'

export { CommandPalette, type Command } from './command-palette'
export { DatePicker } from './date-picker'
export { DateTimePicker } from './date-time-picker'
export { RichTextEditor } from './rich-text-editor'

// Accessibility components
export { VisuallyHidden, useVisuallyHiddenStyles } from './VisuallyHidden'
