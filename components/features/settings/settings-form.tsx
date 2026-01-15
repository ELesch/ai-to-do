'use client'

/**
 * Settings Form Components
 * Reusable form sections with auto-save functionality
 */

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { UserPreferences } from '@/lib/db/schema'

// ============================================================================
// Types
// ============================================================================

export interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

export interface AutoSaveOptions {
  debounceMs?: number
  onSave: (value: unknown) => Promise<void>
  onError?: (error: Error) => void
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for debounced auto-save functionality
 */
export function useAutoSave<T>({
  debounceMs = 500,
  onSave,
  onError,
}: AutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingValueRef = useRef<T | null>(null)

  const save = useCallback(
    async (value: T) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Store the pending value
      pendingValueRef.current = value

      // Set a new timeout
      timeoutRef.current = setTimeout(async () => {
        if (pendingValueRef.current === null) return

        setIsSaving(true)
        try {
          await onSave(pendingValueRef.current)
          pendingValueRef.current = null
        } catch (error) {
          if (onError && error instanceof Error) {
            onError(error)
          } else {
            console.error('Auto-save error:', error)
          }
        } finally {
          setIsSaving(false)
        }
      }, debounceMs)
    },
    [debounceMs, onSave, onError]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { save, isSaving }
}

// ============================================================================
// Settings Section Component
// ============================================================================

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}

// ============================================================================
// Form Field Components
// ============================================================================

interface SettingsFieldProps {
  label: string
  description?: string
  children: React.ReactNode
}

export function SettingsField({ label, description, children }: SettingsFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// Switch Field
// ============================================================================

interface SwitchFieldProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: SwitchFieldProps) {
  return (
    <SettingsField label={label} description={description}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </SettingsField>
  )
}

// ============================================================================
// Select Field
// ============================================================================

interface SelectFieldProps {
  label: string
  description?: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
}

export function SelectField({
  label,
  description,
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled,
}: SelectFieldProps) {
  return (
    <SettingsField label={label} description={description}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  )
}

// ============================================================================
// Input Field
// ============================================================================

interface InputFieldProps {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'time'
  placeholder?: string
  disabled?: boolean
}

export function InputField({
  label,
  description,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: InputFieldProps) {
  return (
    <SettingsField label={label} description={description}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-[180px]"
      />
    </SettingsField>
  )
}

// ============================================================================
// API Helper
// ============================================================================

export async function updatePreferences(
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  const response = await fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update preferences')
  }

  const data = await response.json()
  return data.data.preferences
}

export async function updateProfile(
  profile: { name?: string; image?: string | null }
): Promise<void> {
  const response = await fetch('/api/user', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update profile')
  }
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch('/api/user', {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete account')
  }
}

// ============================================================================
// Settings Provider (for managing state across sections)
// ============================================================================

interface SettingsContextType {
  preferences: UserPreferences
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void
  isSaving: boolean
}

const SettingsContext = React.createContext<SettingsContextType | null>(null)

export function useSettings() {
  const context = React.useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  initialPreferences: UserPreferences
  children: React.ReactNode
}

export function SettingsProvider({
  initialPreferences,
  children,
}: SettingsProviderProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences)

  const { save, isSaving } = useAutoSave<Partial<UserPreferences>>({
    debounceMs: 500,
    onSave: async (value) => {
      await updatePreferences(value as Partial<UserPreferences>)
      toast.success('Settings saved')
    },
    onError: (error) => {
      toast.error('Failed to save settings', {
        description: error.message,
      })
    },
  })

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({ ...prev, [key]: value }))
      save({ [key]: value } as Partial<UserPreferences>)
    },
    [save]
  )

  return (
    <SettingsContext.Provider value={{ preferences, updatePreference, isSaving }}>
      {children}
    </SettingsContext.Provider>
  )
}
