/**
 * TaskForm Component
 * Full task form with validation using React Hook Form + Zod
 */

'use client'

import { type FC, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Loader2, Bell, BellPlus, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/shared/date-picker'
import { DateTimePicker } from '@/components/shared/date-time-picker'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types/task'
import {
  format,
  addHours,
  addDays,
  setHours,
  setMinutes,
  startOfTomorrow,
  isBefore,
} from 'date-fns'

/**
 * Reminder preset type
 */
type ReminderPreset =
  | 'tomorrow_morning'
  | 'one_hour_before'
  | 'one_day_before'
  | 'custom'

/**
 * Reminder data for the form
 */
interface ReminderData {
  id: string
  preset?: ReminderPreset
  remindAt: Date
  label: string
}

/**
 * Form schema with Zod validation
 */
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  description: z.string().max(10000, 'Description is too long').optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']),
  dueDate: z.date().nullable().optional(),
  dueDateHasTime: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
  reminders: z
    .array(
      z.object({
        preset: z
          .enum([
            'tomorrow_morning',
            'one_hour_before',
            'one_day_before',
            'custom',
          ])
          .optional(),
        remindAt: z.date(),
      })
    )
    .optional(),
})

export type TaskFormValues = z.infer<typeof taskFormSchema>

interface Project {
  id: string
  name: string
  color: string
}

interface TaskFormProps {
  /** Initial values for editing */
  defaultValues?: Partial<TaskFormValues>
  /** Available projects for selection */
  projects?: Project[]
  /** Loading state for projects */
  projectsLoading?: boolean
  /** Form submission handler */
  onSubmit: (values: TaskFormValues) => void | Promise<void>
  /** Cancel handler */
  onCancel?: () => void
  /** Whether the form is submitting */
  isSubmitting?: boolean
  /** Submit button text */
  submitLabel?: string
  /** Custom class name */
  className?: string
  /** Show reminder section */
  showReminders?: boolean
}

/**
 * Label component for form fields
 */
function FormLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  )
}

/**
 * Error message component
 */
function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-500">{message}</p>
}

/**
 * Priority options with colors
 */
const priorityOptions: { value: TaskPriority; label: string; color: string }[] =
  [
    { value: 'none', label: 'No priority', color: 'text-muted-foreground' },
    { value: 'low', label: 'Low', color: 'text-blue-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-red-600' },
  ]

/**
 * Reminder preset options
 */
const REMINDER_PRESETS = [
  {
    id: 'tomorrow_morning' as ReminderPreset,
    label: 'Tomorrow at 9 AM',
    getTime: () => setMinutes(setHours(startOfTomorrow(), 9), 0),
  },
  {
    id: 'one_hour_before' as ReminderPreset,
    label: '1 hour before due',
    requiresDueDate: true,
    getTime: (dueDate?: Date | null) =>
      dueDate ? addHours(dueDate, -1) : addHours(new Date(), 1),
  },
  {
    id: 'one_day_before' as ReminderPreset,
    label: '1 day before due',
    requiresDueDate: true,
    getTime: (dueDate?: Date | null) =>
      dueDate ? addDays(dueDate, -1) : startOfTomorrow(),
  },
] as const

/**
 * Generate a unique ID for reminders
 */
function generateReminderId(): string {
  return `reminder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const TaskForm: FC<TaskFormProps> = ({
  defaultValues,
  projects = [],
  projectsLoading = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create Task',
  className,
  showReminders = true,
}) => {
  const [remindersList, setRemindersList] = useState<ReminderData[]>([])
  const [showReminderOptions, setShowReminderOptions] = useState(false)
  const [customReminderDate, setCustomReminderDate] = useState<Date | null>(
    null
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'none',
      dueDate: null,
      dueDateHasTime: false,
      projectId: null,
      reminders: [],
      ...defaultValues,
    },
  })

  const selectedPriority = watch('priority')
  const selectedDueDate = watch('dueDate')
  const selectedProjectId = watch('projectId')

  // Add a reminder from preset
  const handleAddReminderPreset = useCallback(
    (preset: (typeof REMINDER_PRESETS)[number]) => {
      const remindAt = preset.getTime(selectedDueDate)

      // Don't add if time is in the past
      if (isBefore(remindAt, new Date())) {
        return
      }

      const newReminder: ReminderData = {
        id: generateReminderId(),
        preset: preset.id,
        remindAt,
        label: preset.label,
      }

      setRemindersList((prev) => [...prev, newReminder])
      setValue('reminders', [
        ...remindersList.map((r) => ({
          preset: r.preset,
          remindAt: r.remindAt,
        })),
        { preset: preset.id, remindAt },
      ])
      setShowReminderOptions(false)
    },
    [selectedDueDate, remindersList, setValue]
  )

  // Add a custom reminder
  const handleAddCustomReminder = useCallback(() => {
    if (!customReminderDate || isBefore(customReminderDate, new Date())) {
      return
    }

    const newReminder: ReminderData = {
      id: generateReminderId(),
      preset: 'custom',
      remindAt: customReminderDate,
      label: format(customReminderDate, 'MMM d, h:mm a'),
    }

    setRemindersList((prev) => [...prev, newReminder])
    setValue('reminders', [
      ...remindersList.map((r) => ({ preset: r.preset, remindAt: r.remindAt })),
      { preset: 'custom', remindAt: customReminderDate },
    ])
    setCustomReminderDate(null)
    setShowReminderOptions(false)
  }, [customReminderDate, remindersList, setValue])

  // Remove a reminder
  const handleRemoveReminder = useCallback(
    (id: string) => {
      const updated = remindersList.filter((r) => r.id !== id)
      setRemindersList(updated)
      setValue(
        'reminders',
        updated.map((r) => ({ preset: r.preset, remindAt: r.remindAt }))
      )
    },
    [remindersList, setValue]
  )

  const handleFormSubmit = handleSubmit(async (values: TaskFormValues) => {
    // Include reminders in submission
    const formValues: TaskFormValues = {
      ...values,
      reminders: remindersList.map((r) => ({
        preset: r.preset,
        remindAt: r.remindAt,
      })),
    }
    await onSubmit(formValues)
  })

  return (
    <form onSubmit={handleFormSubmit} className={cn('space-y-6', className)}>
      {/* Title field */}
      <div className="space-y-2">
        <FormLabel htmlFor="title" required>
          Title
        </FormLabel>
        <Input
          id="title"
          placeholder="What needs to be done?"
          {...register('title')}
          aria-invalid={!!errors.title}
          autoFocus
        />
        <FormError message={errors.title?.message} />
      </div>

      {/* Description field */}
      <div className="space-y-2">
        <FormLabel htmlFor="description">Description</FormLabel>
        <Textarea
          id="description"
          placeholder="Add more details..."
          rows={4}
          {...register('description')}
          aria-invalid={!!errors.description}
        />
        <FormError message={errors.description?.message} />
      </div>

      {/* Priority and Due Date row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Priority select */}
        <div className="space-y-2">
          <FormLabel htmlFor="priority">Priority</FormLabel>
          <Select
            value={selectedPriority}
            onValueChange={(value) =>
              setValue('priority', value as TaskPriority)
            }
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due date picker */}
        <div className="space-y-2">
          <FormLabel htmlFor="dueDate">Due Date</FormLabel>
          <DatePicker
            value={selectedDueDate ?? undefined}
            onChange={(date) => setValue('dueDate', date ?? null)}
            placeholder="Select due date"
          />
        </div>
      </div>

      {/* Project select */}
      <div className="space-y-2">
        <FormLabel htmlFor="projectId">Project</FormLabel>
        <Select
          value={selectedProjectId ?? 'no-project'}
          onValueChange={(value) =>
            setValue('projectId', value === 'no-project' ? null : value)
          }
          disabled={projectsLoading}
        >
          <SelectTrigger id="projectId">
            <SelectValue
              placeholder={projectsLoading ? 'Loading...' : 'Select project'}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-project">
              <span className="text-muted-foreground">No project</span>
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reminders section */}
      {showReminders && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel htmlFor="reminders">Reminders</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowReminderOptions(!showReminderOptions)}
              className="text-muted-foreground hover:text-foreground"
            >
              <BellPlus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Current reminders list */}
          {remindersList.length > 0 && (
            <div className="space-y-2">
              {remindersList.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-900/30"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Bell className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="truncate text-sm text-blue-800 dark:text-blue-200">
                      {reminder.label}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {format(reminder.remindAt, 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveReminder(reminder.id)}
                    className="shrink-0 text-blue-400 hover:text-red-500 dark:text-blue-400 dark:hover:text-red-400"
                    aria-label={`Remove reminder: ${reminder.label}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reminder options panel */}
          {showReminderOptions && (
            <div className="bg-muted space-y-3 rounded-lg border p-3">
              <p className="text-muted-foreground text-sm font-medium">
                Quick options:
              </p>
              <div className="flex flex-wrap gap-2">
                {REMINDER_PRESETS.map((preset) => {
                  const isDisabled =
                    'requiresDueDate' in preset &&
                    preset.requiresDueDate &&
                    !selectedDueDate
                  const reminderTime = preset.getTime(selectedDueDate)
                  const isPast = isBefore(reminderTime, new Date())

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        !isDisabled &&
                        !isPast &&
                        handleAddReminderPreset(preset)
                      }
                      disabled={isDisabled || isPast}
                      className={cn(
                        'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                        isDisabled || isPast
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-background border-border border hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-900/30'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              {/* Custom date/time picker */}
              <div className="mt-3 border-t pt-3">
                <p className="text-muted-foreground mb-2 text-sm font-medium">
                  Custom time:
                </p>
                <div className="flex gap-2">
                  <DateTimePicker
                    value={customReminderDate}
                    onChange={setCustomReminderDate}
                    showTime={true}
                    minDate={new Date()}
                    placeholder="Select date & time"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomReminder}
                    disabled={
                      !customReminderDate ||
                      isBefore(customReminderDate, new Date())
                    }
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {remindersList.length === 0 && !showReminderOptions && (
            <p className="text-muted-foreground text-sm">
              No reminders set. Click &quot;Add&quot; to create one.
            </p>
          )}
        </div>
      )}

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

/**
 * Hook to use the task form with mutations
 */
export function useTaskForm(options: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  // This would integrate with useTaskMutations from hooks/use-tasks.ts
  // For now, return a placeholder that can be connected later
  return {
    handleCreate: async (values: TaskFormValues) => {
      console.log('Creating task:', values)
      options.onSuccess?.()
    },
    handleUpdate: async (taskId: string, values: TaskFormValues) => {
      console.log('Updating task:', taskId, values)
      options.onSuccess?.()
    },
    isSubmitting: false,
  }
}
