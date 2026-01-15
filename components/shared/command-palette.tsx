/**
 * CommandPalette Component
 * Enhanced quick action command palette (Cmd+K) with search integration
 *
 * Features:
 * - Global keyboard shortcut (Cmd/Ctrl+K)
 * - Full-text search for tasks and projects
 * - Recent items when no search query
 * - Navigation commands (Go to Today, Projects, etc.)
 * - Action commands (Create Task, Create Project)
 * - Keyboard navigation with arrow keys
 */

'use client'

import { type FC, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCommandPaletteSearch } from '@/hooks/use-search'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon?: React.ReactNode
  category?: 'navigation' | 'action' | 'search' | 'recent'
  action: () => void
}

interface CommandGroup {
  id: string
  label: string
  commands: Command[]
}

interface CommandPaletteProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  additionalCommands?: Command[]
}

// ============================================================================
// ICONS (inline SVGs to avoid dependencies)
// ============================================================================

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const HomeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)

const FolderIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
)

const CheckSquareIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <polyline points="9,11 12,14 22,4" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

// ============================================================================
// COMPONENT
// ============================================================================

export const CommandPalette: FC<CommandPaletteProps> = ({
  isOpen: controlledOpen,
  onOpenChange,
  onCreateTask,
  onCreateProject,
  additionalCommands = [],
}) => {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = controlledOpen ?? internalOpen

  const handleOpenChange = useCallback((open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalOpen(open)
    }
    if (!open) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [onOpenChange])

  // Search hook
  const {
    searchResults,
    hasSearchResults,
    isEmptySearch,
    recentItems,
    showingRecent,
    isLoading,
    query,
  } = useCommandPaletteSearch(search)

  // Default navigation commands
  const navigationCommands = useMemo<Command[]>(() => [
    {
      id: 'nav-home',
      label: 'Go to Dashboard',
      description: 'View your main dashboard',
      shortcut: 'G D',
      icon: <HomeIcon />,
      category: 'navigation',
      action: () => router.push('/'),
    },
    {
      id: 'nav-today',
      label: 'Go to Today',
      description: 'View tasks due today',
      shortcut: 'G T',
      icon: <CalendarIcon />,
      category: 'navigation',
      action: () => router.push('/today'),
    },
    {
      id: 'nav-upcoming',
      label: 'Go to Upcoming',
      description: 'View upcoming tasks',
      shortcut: 'G U',
      icon: <ClockIcon />,
      category: 'navigation',
      action: () => router.push('/upcoming'),
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'View all projects',
      shortcut: 'G P',
      icon: <FolderIcon />,
      category: 'navigation',
      action: () => router.push('/projects'),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Manage your preferences',
      shortcut: 'G S',
      icon: <SettingsIcon />,
      category: 'navigation',
      action: () => router.push('/settings'),
    },
  ], [router])

  // Default action commands
  const actionCommands = useMemo<Command[]>(() => [
    {
      id: 'action-new-task',
      label: 'Create New Task',
      description: 'Add a new task',
      shortcut: 'N',
      icon: <PlusIcon />,
      category: 'action',
      action: () => {
        handleOpenChange(false)
        onCreateTask?.()
      },
    },
    {
      id: 'action-new-project',
      label: 'Create New Project',
      description: 'Start a new project',
      shortcut: 'Shift+N',
      icon: <FolderIcon />,
      category: 'action',
      action: () => {
        handleOpenChange(false)
        onCreateProject?.()
      },
    },
  ], [handleOpenChange, onCreateTask, onCreateProject])

  // Build search result commands
  const searchResultCommands = useMemo<Command[]>(() => {
    if (!searchResults) return []

    const commands: Command[] = []

    // Add task results
    searchResults.tasks.forEach((task) => {
      commands.push({
        id: `task-${task.id}`,
        label: task.title,
        description: task.projectName || undefined,
        icon: <CheckSquareIcon />,
        category: 'search',
        action: () => {
          router.push(`/task/${task.id}`)
          handleOpenChange(false)
        },
      })
    })

    // Add project results
    searchResults.projects.forEach((project) => {
      commands.push({
        id: `project-${project.id}`,
        label: project.name,
        description: project.description || undefined,
        icon: (
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: project.color || '#6366f1' }}
          />
        ),
        category: 'search',
        action: () => {
          router.push(`/projects/${project.id}`)
          handleOpenChange(false)
        },
      })
    })

    return commands
  }, [searchResults, router, handleOpenChange])

  // Build recent item commands
  const recentCommands = useMemo<Command[]>(() => {
    return recentItems.map((item) => ({
      id: `recent-${item.type}-${item.id}`,
      label: item.title,
      description: item.type === 'task' ? 'Task' : 'Project',
      icon: item.type === 'task' ? (
        <CheckSquareIcon />
      ) : (
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: item.color || '#6366f1' }}
        />
      ),
      category: 'recent' as const,
      action: () => {
        const path = item.type === 'task' ? `/task/${item.id}` : `/projects/${item.id}`
        router.push(path)
        handleOpenChange(false)
      },
    }))
  }, [recentItems, router, handleOpenChange])

  // Build command groups based on search state
  const commandGroups = useMemo<CommandGroup[]>(() => {
    const groups: CommandGroup[] = []

    if (query) {
      // Searching - show search results and filtered commands
      if (searchResultCommands.length > 0) {
        groups.push({
          id: 'search-results',
          label: 'Search Results',
          commands: searchResultCommands,
        })
      }

      // Filter navigation and action commands by search query
      const filteredNavigation = navigationCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
      const filteredActions = actionCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
      const filteredAdditional = additionalCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )

      if (filteredNavigation.length > 0) {
        groups.push({
          id: 'navigation',
          label: 'Navigation',
          commands: filteredNavigation,
        })
      }

      if (filteredActions.length > 0) {
        groups.push({
          id: 'actions',
          label: 'Actions',
          commands: filteredActions,
        })
      }

      if (filteredAdditional.length > 0) {
        groups.push({
          id: 'additional',
          label: 'More',
          commands: filteredAdditional,
        })
      }
    } else {
      // Not searching - show recent items and default commands
      if (recentCommands.length > 0) {
        groups.push({
          id: 'recent',
          label: 'Recent',
          commands: recentCommands,
        })
      }

      groups.push({
        id: 'navigation',
        label: 'Navigation',
        commands: navigationCommands,
      })

      groups.push({
        id: 'actions',
        label: 'Actions',
        commands: actionCommands,
      })

      if (additionalCommands.length > 0) {
        groups.push({
          id: 'additional',
          label: 'More',
          commands: additionalCommands,
        })
      }
    }

    return groups
  }, [query, searchResultCommands, recentCommands, navigationCommands, actionCommands, additionalCommands])

  // Flatten all commands for keyboard navigation
  const allCommands = useMemo(() => {
    return commandGroups.flatMap((group) => group.commands)
  }, [commandGroups])

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleOpenChange(!isOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleOpenChange])

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, allCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (allCommands[selectedIndex]) {
          allCommands[selectedIndex].action()
        }
        break
      case 'Escape':
        e.preventDefault()
        handleOpenChange(false)
        break
    }
  }, [allCommands, selectedIndex, handleOpenChange])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Track flat index for keyboard navigation
  let flatIndex = -1

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-lg overflow-hidden"
        showCloseButton={false}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3" role="search">
          <SearchIcon aria-hidden="true" />
          <Input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, or type a command..."
            className="h-12 border-0 shadow-none focus-visible:ring-0 px-0"
            autoFocus
            aria-label="Search tasks, projects, or type a command"
            aria-describedby="command-palette-hints"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2"
        >
          {commandGroups.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              {query ? 'No results found' : 'Type to search or select a command'}
            </div>
          ) : (
            commandGroups.map((group) => (
              <div key={group.id} className="px-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.commands.map((cmd) => {
                  flatIndex++
                  const currentIndex = flatIndex
                  const isSelected = currentIndex === selectedIndex

                  return (
                    <button
                      key={cmd.id}
                      data-index={currentIndex}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 text-gray-500">
                        {cmd.icon}
                      </div>

                      {/* Label and description */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-sm">
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div className="truncate text-xs text-gray-500">
                            {cmd.description}
                          </div>
                        )}
                      </div>

                      {/* Shortcut */}
                      {cmd.shortcut && (
                        <kbd className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}

          {/* Search result counts */}
          {query && searchResults && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t mt-2">
              Found {searchResults.totalTasks} tasks and {searchResults.totalProjects} projects
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div id="command-palette-hints" className="flex items-center gap-4 border-t px-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Enter</kbd>
            <span>to select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Up/Down</kbd>
            <span>to navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">Esc</kbd>
            <span>to close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
