/**
 * Header Component
 * Top header with search, user menu, and actions
 * Integrates with CommandPalette for global search (Cmd+K)
 */

'use client'

import { type FC, useCallback, useState } from 'react'
import { Keyboard, Search, Menu, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ShortcutHint } from '@/components/shared/keyboard-shortcuts-dialog'
import { CommandPalette } from '@/components/shared/command-palette'
import { useOptionalKeyboardContext } from '@/providers/keyboard-provider'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle?: () => void
  onAIPanelToggle?: () => void
  onSearchFocus?: () => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  className?: string
}

export const Header: FC<HeaderProps> = ({
  onMenuToggle,
  onAIPanelToggle,
  onSearchFocus,
  onCreateTask,
  onCreateProject,
  className,
}) => {
  const keyboardContext = useOptionalKeyboardContext()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const handleKeyboardShortcuts = useCallback(() => {
    keyboardContext?.openShortcutsDialog()
  }, [keyboardContext])

  const handleSearchClick = useCallback(() => {
    setIsCommandPaletteOpen(true)
    onSearchFocus?.()
  }, [onSearchFocus])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Open command palette on any key press (except Tab for accessibility)
    if (e.key !== 'Tab' && e.key !== 'Escape') {
      e.preventDefault()
      setIsCommandPaletteOpen(true)
    }
  }, [])

  return (
    <TooltipProvider>
      <header
        className={cn(
          'h-14 border-b bg-white px-4 flex items-center justify-between',
          className
        )}
      >
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuToggle}
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Toggle sidebar</span>
                <ShortcutHint shortcutId="toggle-sidebar" />
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Search - opens command palette */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSearchClick}
                onKeyDown={handleSearchKeyDown}
                className="relative flex items-center gap-2 w-64 rounded-lg border pl-3 pr-12 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/30 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Search tasks and projects"
              >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  <ShortcutHint shortcutId="open-command-palette" />
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Search tasks, projects, and commands</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Keyboard shortcuts button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleKeyboardShortcuts}
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Keyboard shortcuts</span>
                <kbd className="text-[10px] font-mono bg-muted/50 px-1 py-0.5 rounded border">
                  ?
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* AI Panel toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAIPanelToggle}
                aria-label="Toggle AI panel"
              >
                <Bot className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>Toggle AI panel</span>
                <ShortcutHint shortcutId="toggle-ai-panel" />
              </div>
            </TooltipContent>
          </Tooltip>

          {/* User menu placeholder */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>User menu</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onCreateTask={onCreateTask}
        onCreateProject={onCreateProject}
      />
    </TooltipProvider>
  )
}
