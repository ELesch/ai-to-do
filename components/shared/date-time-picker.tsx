/**
 * DateTimePicker Component
 * Combined date and time picker with preset quick options
 */

'use client'

import { type FC, useState, useCallback, useRef, useEffect } from 'react'
import { Calendar, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  format,
  startOfToday,
  startOfTomorrow,
  addDays,
  addWeeks,
  setHours,
  setMinutes,
  isBefore,
  isToday,
  isTomorrow,
  isThisWeek,
  parse,
} from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

interface DateTimePickerProps {
  /** Selected date/time value */
  value?: Date | null
  /** Callback when value changes */
  onChange?: (date: Date | null) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether to show time input */
  showTime?: boolean
  /** Whether the value includes time (vs date only) */
  hasTime?: boolean
  /** Callback when hasTime changes */
  onHasTimeChange?: (hasTime: boolean) => void
  /** Minimum date (dates before this are disabled) */
  minDate?: Date
  /** Maximum date (dates after this are disabled) */
  maxDate?: Date
  /** Custom class name */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_DATE_OPTIONS = [
  {
    id: 'today',
    label: 'Today',
    getDate: () => startOfToday(),
    check: (date: Date) => isToday(date),
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    getDate: () => startOfTomorrow(),
    check: (date: Date) => isTomorrow(date),
  },
  {
    id: 'next_week',
    label: 'Next Week',
    getDate: () => addWeeks(startOfToday(), 1),
    check: (date: Date) => !isThisWeek(date) && isBefore(date, addWeeks(startOfToday(), 2)),
  },
] as const

const QUICK_TIME_OPTIONS = [
  { id: 'morning', label: 'Morning', hour: 9, minute: 0 },
  { id: 'noon', label: 'Noon', hour: 12, minute: 0 },
  { id: 'afternoon', label: 'Afternoon', hour: 15, minute: 0 },
  { id: 'evening', label: 'Evening', hour: 18, minute: 0 },
] as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateDisplay(date: Date | null | undefined, hasTime: boolean): string {
  if (!date) return ''

  if (hasTime) {
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`
    }
    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`
    }
    return format(date, 'MMM d, yyyy h:mm a')
  }

  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d, yyyy')
}

function parseTimeInput(timeStr: string): { hour: number; minute: number } | null {
  // Try parsing various time formats
  const formats = ['h:mm a', 'H:mm', 'h:mma', 'ha', 'H']

  for (const fmt of formats) {
    try {
      const parsed = parse(timeStr, fmt, new Date())
      if (!isNaN(parsed.getTime())) {
        return {
          hour: parsed.getHours(),
          minute: parsed.getMinutes(),
        }
      }
    } catch {
      // Continue to next format
    }
  }

  return null
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Simple calendar grid component
 */
const CalendarGrid: FC<{
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  minDate?: Date
  maxDate?: Date
}> = ({ selectedDate, onSelectDate, minDate, maxDate }) => {
  const [viewMonth, setViewMonth] = useState(() => selectedDate || new Date())

  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate()

  const firstDayOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  ).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const isDateDisabled = (day: number) => {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    if (minDate && isBefore(date, minDate)) return true
    if (maxDate && isBefore(maxDate, date)) return true
    return false
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth.getMonth() &&
      selectedDate.getFullYear() === viewMonth.getFullYear()
    )
  }

  return (
    <div className="p-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          &lsaquo;
        </button>
        <span className="text-sm font-medium">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          &rsaquo;
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-xs text-center text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => (
          <button
            key={day}
            onClick={() =>
              !isDateDisabled(day) &&
              onSelectDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))
            }
            disabled={isDateDisabled(day)}
            className={cn(
              'h-8 w-8 rounded text-sm transition-colors',
              isDateSelected(day)
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-100',
              isDateDisabled(day) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Time picker section
 */
const TimePicker: FC<{
  value: Date | null
  onChange: (date: Date) => void
}> = ({ value, onChange }) => {
  const [timeInput, setTimeInput] = useState(() =>
    value ? format(value, 'h:mm a') : ''
  )

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeInput(e.target.value)
  }

  const handleTimeBlur = () => {
    if (!timeInput) return

    const parsed = parseTimeInput(timeInput)
    if (parsed && value) {
      const newDate = setMinutes(setHours(value, parsed.hour), parsed.minute)
      onChange(newDate)
      setTimeInput(format(newDate, 'h:mm a'))
    }
  }

  const handleQuickTime = (hour: number, minute: number) => {
    const baseDate = value || new Date()
    const newDate = setMinutes(setHours(baseDate, hour), minute)
    onChange(newDate)
    setTimeInput(format(newDate, 'h:mm a'))
  }

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Time</span>
      </div>

      {/* Time input */}
      <Input
        type="text"
        value={timeInput}
        onChange={handleTimeChange}
        onBlur={handleTimeBlur}
        placeholder="Enter time (e.g., 9:00 AM)"
        className="mb-2"
      />

      {/* Quick time options */}
      <div className="flex flex-wrap gap-1">
        {QUICK_TIME_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleQuickTime(option.hour, option.minute)}
            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DateTimePicker: FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  showTime = true,
  hasTime = false,
  onHasTimeChange,
  minDate,
  maxDate,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [includeTime, setIncludeTime] = useState(hasTime)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectDate = useCallback(
    (date: Date) => {
      // Preserve existing time if value has time
      if (value && includeTime) {
        const newDate = new Date(date)
        newDate.setHours(value.getHours(), value.getMinutes(), 0, 0)
        onChange?.(newDate)
      } else {
        onChange?.(date)
      }
    },
    [value, includeTime, onChange]
  )

  const handleTimeChange = useCallback(
    (date: Date) => {
      onChange?.(date)
      if (!includeTime) {
        setIncludeTime(true)
        onHasTimeChange?.(true)
      }
    },
    [includeTime, onChange, onHasTimeChange]
  )

  const handleQuickDateSelect = useCallback(
    (getDate: () => Date) => {
      const date = getDate()
      // If time is included, set a default time
      if (includeTime) {
        const withTime = setMinutes(setHours(date, 9), 0)
        onChange?.(withTime)
      } else {
        onChange?.(date)
      }
      setIsOpen(false)
    },
    [includeTime, onChange]
  )

  const handleClear = useCallback(() => {
    onChange?.(null)
    setIncludeTime(false)
    onHasTimeChange?.(false)
  }, [onChange, onHasTimeChange])

  const toggleTime = useCallback(() => {
    const newIncludeTime = !includeTime
    setIncludeTime(newIncludeTime)
    onHasTimeChange?.(newIncludeTime)

    if (newIncludeTime && value) {
      // Add default time (9:00 AM)
      const withTime = setMinutes(setHours(value, 9), 0)
      onChange?.(withTime)
    }
  }, [includeTime, value, onChange, onHasTimeChange])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm text-left transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
          isOpen && 'ring-2 ring-blue-500 ring-offset-1'
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={cn('flex-1 truncate', !value && 'text-muted-foreground')}>
          {value ? formatDateDisplay(value, includeTime) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border bg-white shadow-lg z-50">
          {/* Quick date options */}
          <div className="p-2 border-b">
            <div className="flex flex-wrap gap-1">
              {QUICK_DATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickDateSelect(option.getDate)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded transition-colors',
                    value && option.check(value)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 hover:bg-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <CalendarGrid
            selectedDate={value ?? null}
            onSelectDate={handleSelectDate}
            minDate={minDate}
            maxDate={maxDate}
          />

          {/* Time toggle & picker */}
          {showTime && (
            <div className="border-t p-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTime}
                  onChange={toggleTime}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include time</span>
              </label>

              {includeTime && value && (
                <TimePicker value={value} onChange={handleTimeChange} />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="border-t p-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple time-only picker
 */
export const TimePicker2: FC<{
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}> = ({ value, onChange, placeholder = 'Select time', className, disabled }) => {
  const [inputValue, setInputValue] = useState(() =>
    value ? format(value, 'h:mm a') : ''
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleBlur = () => {
    if (!inputValue) {
      onChange?.(null)
      return
    }

    const parsed = parseTimeInput(inputValue)
    if (parsed) {
      const date = setMinutes(setHours(new Date(), parsed.hour), parsed.minute)
      onChange?.(date)
      setInputValue(format(date, 'h:mm a'))
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  )
}
