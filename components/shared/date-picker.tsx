/**
 * DatePicker Component
 * Date selection with smart suggestions
 */

'use client'

import { type FC, useState } from 'react'

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
}

export const DatePicker: FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const quickOptions = [
    { label: 'Today', getValue: () => new Date() },
    {
      label: 'Tomorrow',
      getValue: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      },
    },
    {
      label: 'Next week',
      getValue: () => {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        return d
      },
    },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? value.toLocaleDateString() : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border bg-white p-2 shadow-lg z-10">
          {/* Quick options */}
          <div className="space-y-1 mb-2">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  onChange?.(opt.getValue())
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="border-t pt-2">
            {/* TODO: Implement full calendar */}
            <p className="text-xs text-gray-500 text-center py-4">
              Full calendar coming soon
            </p>
          </div>

          {value && (
            <button
              onClick={() => {
                onChange?.(undefined)
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  )
}
