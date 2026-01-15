/**
 * TaskReminders Component
 * Display and manage reminders for a task
 */

'use client'

import { type FC, useState, useCallback } from 'react'
import { Bell, BellPlus, Trash2, Clock, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isBefore, addHours, addDays, setHours, setMinutes, startOfTomorrow } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

interface Reminder {
  id: string
  taskId: string
  remindAt: Date | string
  type: string
  isSent: boolean
  sentAt: Date | string | null
}

interface TaskRemindersProps {
  /** Task ID */
  taskId: string
  /** Task due date for calculating relative reminders */
  taskDueDate?: Date | null
  /** Existing reminders */
  reminders?: Reminder[]
  /** Loading state */
  isLoading?: boolean
  /** Callback when a reminder is created */
  onCreateReminder?: (data: {
    preset?: 'tomorrow_morning' | 'one_hour_before' | 'one_day_before'
    remindAt?: string
    type?: 'due_date' | 'scheduled' | 'custom' | 'follow_up'
  }) => Promise<void>
  /** Callback when a reminder is deleted */
  onDeleteReminder?: (reminderId: string) => Promise<void>
  /** Custom class name */
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

interface QuickOption {
  id: 'tomorrow_morning' | 'one_hour_before' | 'one_day_before'
  label: string
  icon: typeof Calendar
  requiresDueDate?: boolean
  getTime: (dueDate?: Date | null) => Date
}

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: 'tomorrow_morning',
    label: 'Tomorrow at 9 AM',
    icon: Calendar,
    requiresDueDate: false,
    getTime: () => setMinutes(setHours(startOfTomorrow(), 9), 0),
  },
  {
    id: 'one_hour_before',
    label: '1 hour before due',
    icon: Clock,
    requiresDueDate: true,
    getTime: (dueDate?: Date | null) => dueDate ? addHours(dueDate, -1) : addHours(new Date(), 1),
  },
  {
    id: 'one_day_before',
    label: '1 day before due',
    icon: Clock,
    requiresDueDate: true,
    getTime: (dueDate?: Date | null) => dueDate ? addDays(dueDate, -1) : startOfTomorrow(),
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatReminderTime(remindAt: Date | string): string {
  const date = typeof remindAt === 'string' ? new Date(remindAt) : remindAt
  const now = new Date()

  if (isBefore(date, now)) {
    return `Overdue (${format(date, 'MMM d, h:mm a')})`
  }

  return `${formatDistanceToNow(date, { addSuffix: true })} (${format(date, 'MMM d, h:mm a')})`
}

function getReminderTypeLabel(type: string): string {
  switch (type) {
    case 'due_date':
      return 'Due date reminder'
    case 'scheduled':
      return 'Scheduled'
    case 'custom':
      return 'Custom reminder'
    case 'follow_up':
      return 'Follow-up'
    default:
      return 'Reminder'
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single reminder item
 */
const ReminderItem: FC<{
  reminder: Reminder
  onDelete?: () => void
  isDeleting?: boolean
}> = ({ reminder, onDelete, isDeleting }) => {
  const remindAt = typeof reminder.remindAt === 'string'
    ? new Date(reminder.remindAt)
    : reminder.remindAt
  const isPast = isBefore(remindAt, new Date())

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-lg border',
        isPast && !reminder.isSent && 'border-yellow-300 bg-yellow-50',
        reminder.isSent && 'border-green-300 bg-green-50 opacity-75'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'p-2 rounded-full',
            isPast && !reminder.isSent ? 'bg-yellow-100' : 'bg-gray-100',
            reminder.isSent && 'bg-green-100'
          )}
        >
          <Bell
            className={cn(
              'h-4 w-4',
              isPast && !reminder.isSent ? 'text-yellow-600' : 'text-gray-600',
              reminder.isSent && 'text-green-600'
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {formatReminderTime(remindAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getReminderTypeLabel(reminder.type)}
            {reminder.isSent && ' - Sent'}
          </p>
        </div>
      </div>

      {onDelete && !reminder.isSent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground hover:text-red-600"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

/**
 * Add reminder dialog
 */
const AddReminderDialog: FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  taskDueDate?: Date | null
  onSelect: (option: QuickOption) => void
  isCreating?: boolean
}> = ({ open, onOpenChange, taskDueDate, onSelect, isCreating }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
          <DialogDescription>
            Choose when you&apos;d like to be reminded about this task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {QUICK_OPTIONS.map((option) => {
            const isDisabled = option.requiresDueDate && !taskDueDate
            const reminderTime = option.getTime(taskDueDate ?? undefined)
            const isPast = isBefore(reminderTime, new Date())

            return (
              <button
                key={option.id}
                onClick={() => !isDisabled && !isPast && !isCreating && onSelect(option)}
                disabled={isDisabled || isPast || isCreating}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                  isDisabled || isPast
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 hover:border-gray-300',
                  isCreating && 'opacity-50 cursor-wait'
                )}
              >
                <div className="p-2 bg-gray-100 rounded-full">
                  <option.icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPast ? (
                      'Time has passed'
                    ) : isDisabled ? (
                      'Requires due date'
                    ) : (
                      format(reminderTime, 'MMM d, h:mm a')
                    )}
                  </p>
                </div>
                {isCreating && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TaskReminders: FC<TaskRemindersProps> = ({
  taskId,
  taskDueDate,
  reminders = [],
  isLoading = false,
  onCreateReminder,
  onDeleteReminder,
  className,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pendingReminders = reminders.filter((r) => !r.isSent)
  const sentReminders = reminders.filter((r) => r.isSent)

  const handleSelectQuickOption = useCallback(
    async (option: QuickOption) => {
      if (!onCreateReminder) return

      setIsCreating(true)
      try {
        await onCreateReminder({
          preset: option.id,
        })
        setIsDialogOpen(false)
      } catch (error) {
        console.error('Failed to create reminder:', error)
      } finally {
        setIsCreating(false)
      }
    },
    [onCreateReminder]
  )

  const handleDeleteReminder = useCallback(
    async (reminderId: string) => {
      if (!onDeleteReminder) return

      setDeletingId(reminderId)
      try {
        await onDeleteReminder(reminderId)
      } catch (error) {
        console.error('Failed to delete reminder:', error)
      } finally {
        setDeletingId(null)
      }
    },
    [onDeleteReminder]
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Reminders</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Reminders</span>
          {pendingReminders.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {pendingReminders.length}
            </span>
          )}
        </div>

        {onCreateReminder && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <BellPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No reminders set for this task.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Pending reminders */}
          {pendingReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onDelete={onDeleteReminder ? () => handleDeleteReminder(reminder.id) : undefined}
              isDeleting={deletingId === reminder.id}
            />
          ))}

          {/* Sent reminders (collapsed) */}
          {sentReminders.length > 0 && (
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">
                  &rsaquo;
                </span>
                {sentReminders.length} sent reminder{sentReminders.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2 pl-4">
                {sentReminders.map((reminder) => (
                  <ReminderItem key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <AddReminderDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        taskDueDate={taskDueDate}
        onSelect={handleSelectQuickOption}
        isCreating={isCreating}
      />
    </div>
  )
}

/**
 * Compact reminder button for task cards
 */
export const TaskReminderButton: FC<{
  hasReminders?: boolean
  reminderCount?: number
  onClick?: () => void
  className?: string
}> = ({ hasReminders, reminderCount = 0, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs rounded-md px-2 py-1 transition-colors',
        hasReminders
          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          : 'text-muted-foreground hover:bg-gray-100',
        className
      )}
    >
      <Bell className="h-3 w-3" />
      {hasReminders && reminderCount > 0 && (
        <span>{reminderCount}</span>
      )}
    </button>
  )
}
