/**
 * Keyboard Shortcuts Dialog
 * Displays all available keyboard shortcuts in a modal
 */

'use client'

import { type FC, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  getShortcutsByCategory,
  formatShortcut,
  isMac,
  type ShortcutDefinition,
  type ShortcutGroup,
} from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Individual shortcut item
 */
function ShortcutItem({ shortcut }: { shortcut: ShortcutDefinition }) {
  const [formattedKey, setFormattedKey] = useState('')

  // Format shortcut on client side to get correct platform keys
  useEffect(() => {
    setFormattedKey(formatShortcut(shortcut))
  }, [shortcut])

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{shortcut.label}</span>
        <span className="text-xs text-muted-foreground">
          {shortcut.description}
        </span>
      </div>
      <kbd
        className={cn(
          'ml-4 inline-flex items-center gap-1 rounded border bg-muted px-2 py-1',
          'text-xs font-mono font-semibold text-muted-foreground',
          'min-w-[2rem] justify-center'
        )}
      >
        {formattedKey}
      </kbd>
    </div>
  )
}

/**
 * Group of shortcuts
 */
function ShortcutGroup({ group }: { group: ShortcutGroup }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground px-3 py-2 border-b">
        {group.label}
      </h3>
      <div className="space-y-0.5">
        {group.shortcuts.map((shortcut) => (
          <ShortcutItem key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  )
}

/**
 * Platform indicator
 */
function PlatformIndicator() {
  const [platform, setPlatform] = useState<'mac' | 'other'>('other')

  useEffect(() => {
    setPlatform(isMac() ? 'mac' : 'other')
  }, [])

  return (
    <div className="text-xs text-muted-foreground text-center pb-2">
      {platform === 'mac'
        ? 'Showing shortcuts for macOS'
        : 'Showing shortcuts for Windows/Linux'}
    </div>
  )
}

export const KeyboardShortcutsDialog: FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [shortcutGroups, setShortcutGroups] = useState<ShortcutGroup[]>([])

  useEffect(() => {
    setShortcutGroups(getShortcutsByCategory())
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick actions to navigate and manage your tasks efficiently.
            <span className="block mt-1">
              Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border font-mono">?</kbd> to toggle this dialog.
            </span>
          </DialogDescription>
        </DialogHeader>

        <PlatformIndicator />

        <div className="grid gap-6 md:grid-cols-2">
          {shortcutGroups.map((group) => (
            <ShortcutGroup key={group.category} group={group} />
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Pro tip: Use arrow keys or <kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">J</kbd>/<kbd className="px-1 py-0.5 text-xs bg-muted rounded border font-mono">K</kbd> to navigate through tasks
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Shortcut hint component for displaying inline hints
 */
export function ShortcutHint({
  shortcutId,
  className,
}: {
  shortcutId: string
  className?: string
}) {
  const [formattedKey, setFormattedKey] = useState('')

  useEffect(() => {
    const groups = getShortcutsByCategory()
    for (const group of groups) {
      const shortcut = group.shortcuts.find((s) => s.id === shortcutId)
      if (shortcut) {
        setFormattedKey(formatShortcut(shortcut))
        break
      }
    }
  }, [shortcutId])

  if (!formattedKey) return null

  return (
    <kbd
      className={cn(
        'hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/50 px-1.5 py-0.5',
        'text-[10px] font-mono text-muted-foreground',
        className
      )}
    >
      {formattedKey}
    </kbd>
  )
}

/**
 * Hook for using the keyboard shortcuts dialog
 */
export function useKeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  const openDialog = () => setOpen(true)
  const closeDialog = () => setOpen(false)
  const toggleDialog = () => setOpen((prev) => !prev)

  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    toggleDialog,
  }
}
