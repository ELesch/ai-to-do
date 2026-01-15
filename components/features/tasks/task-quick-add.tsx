/**
 * TaskQuickAdd Component
 * Compact inline form for quick task creation with title and optional due date
 */

'use client'

import { type FC, useState, useRef, useCallback } from 'react'
import { Calendar, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/shared/date-picker'
import { cn } from '@/lib/utils'

interface TaskQuickAddProps {
  /** Handler for task creation */
  onAdd: (data: { title: string; dueDate?: Date }) => void | Promise<void>
  /** Default project ID for new tasks */
  projectId?: string
  /** Placeholder text */
  placeholder?: string
  /** Show date picker inline */
  showDatePicker?: boolean
  /** Auto-focus on mount */
  autoFocus?: boolean
  /** Expand on focus */
  expandOnFocus?: boolean
  /** Custom class name */
  className?: string
}

export const TaskQuickAdd: FC<TaskQuickAddProps> = ({
  onAdd,
  placeholder = 'Add a task...',
  showDatePicker = true,
  autoFocus = false,
  expandOnFocus = true,
  className,
}) => {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!expandOnFocus)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd({
        title: title.trim(),
        dueDate: dueDate,
      })
      // Reset form on success
      setTitle('')
      setDueDate(undefined)
      // Keep focus on input for rapid entry
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }, [title, dueDate, isSubmitting, onAdd])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setTitle('')
      setDueDate(undefined)
      setIsExpanded(false)
      inputRef.current?.blur()
    }
  }

  const handleFocus = () => {
    if (expandOnFocus) {
      setIsExpanded(true)
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Don't collapse if clicking within the component
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }
    // Don't collapse if there's content
    if (title.trim() || dueDate) {
      return
    }
    if (expandOnFocus) {
      setIsExpanded(false)
    }
  }

  const canSubmit = title.trim().length > 0 && !isSubmitting

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-all duration-200',
        isExpanded ? 'p-4 shadow-sm' : 'p-3',
        className
      )}
      onBlur={handleBlur}
    >
      <div className="flex items-center gap-2">
        {/* Plus icon */}
        <div className="shrink-0 text-muted-foreground">
          <Plus className="h-5 w-5" />
        </div>

        {/* Title input */}
        <Input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={isSubmitting}
          className={cn(
            'border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1',
            'placeholder:text-muted-foreground/70'
          )}
          autoFocus={autoFocus}
        />

        {/* Submit button (always visible when expanded or has content) */}
        {(isExpanded || title.trim()) && (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Add'
            )}
          </Button>
        )}
      </div>

      {/* Date picker row (shown when expanded) */}
      {isExpanded && showDatePicker && (
        <div className="mt-3 flex items-center gap-2 pl-7">
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="Add due date"
          />
          {dueDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDueDate(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      {isExpanded && title.trim() && (
        <div className="mt-2 pl-7 text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to add,{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to cancel
        </div>
      )}
    </div>
  )
}

/**
 * Compact version - just an input that looks like text
 */
export const TaskQuickAddCompact: FC<TaskQuickAddProps> = ({
  onAdd,
  placeholder = 'Add a task...',
  className,
}) => {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd({ title: title.trim() })
      setTitle('')
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent/50',
        'transition-colors cursor-text',
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        className={cn(
          'flex-1 bg-transparent border-0 outline-none text-sm',
          'placeholder:text-muted-foreground/70'
        )}
      />
      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  )
}

/**
 * Floating action button version
 */
export const TaskQuickAddFab: FC<{
  onClick: () => void
  className?: string
}> = ({ onClick, className }) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg',
        'hover:shadow-xl transition-shadow',
        className
      )}
    >
      <Plus className="h-6 w-6" />
      <span className="sr-only">Add task</span>
    </Button>
  )
}
