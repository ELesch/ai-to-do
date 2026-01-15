/**
 * ProjectForm Component
 * Full project form with validation using React Hook Form + Zod
 */

'use client'

import { type FC } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  Folder,
  Hash,
  Briefcase,
  Code,
  Home,
  BookOpen,
  Heart,
  Zap,
  Target,
  Rocket,
  Music,
  Camera,
  Globe,
  Coffee,
  Flame,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/**
 * Form schema with Zod validation
 */
const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  icon: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>

/**
 * Preset colors for project selection
 */
const presetColors = [
  { value: '#ef4444', name: 'Red' },
  { value: '#f97316', name: 'Orange' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#eab308', name: 'Yellow' },
  { value: '#84cc16', name: 'Lime' },
  { value: '#22c55e', name: 'Green' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#06b6d4', name: 'Cyan' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#6366f1', name: 'Indigo' },
  { value: '#8b5cf6', name: 'Violet' },
  { value: '#a855f7', name: 'Purple' },
  { value: '#d946ef', name: 'Fuchsia' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#f43f5e', name: 'Rose' },
  { value: '#6b7280', name: 'Gray' },
]

/**
 * Available icons for projects
 */
const availableIcons: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'hash', label: 'Hash', icon: Hash },
  { value: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'code', label: 'Code', icon: Code },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'book-open', label: 'Book', icon: BookOpen },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'rocket', label: 'Rocket', icon: Rocket },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'coffee', label: 'Coffee', icon: Coffee },
  { value: 'flame', label: 'Flame', icon: Flame },
  { value: 'star', label: 'Star', icon: Star },
]

interface ProjectFormProps {
  /** Initial values for editing */
  defaultValues?: Partial<ProjectFormValues>
  /** Form submission handler */
  onSubmit: (values: ProjectFormValues) => void | Promise<void>
  /** Cancel handler */
  onCancel?: () => void
  /** Whether the form is submitting */
  isSubmitting?: boolean
  /** Submit button text */
  submitLabel?: string
  /** Custom class name */
  className?: string
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
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

/**
 * Error message component
 */
function FormError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-red-500 mt-1">{message}</p>
}

/**
 * Color picker component
 */
function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {presetColors.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.name}
            className={cn(
              'h-8 w-8 rounded-full transition-all duration-200',
              'ring-offset-2 ring-offset-background',
              'hover:scale-110 hover:ring-2 hover:ring-primary/50',
              value === color.value && 'ring-2 ring-primary scale-110'
            )}
            style={{ backgroundColor: color.value }}
            onClick={() => onChange(color.value)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-md border"
          style={{ backgroundColor: value }}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="w-28 font-mono text-sm"
          maxLength={7}
        />
      </div>
    </div>
  )
}

/**
 * Icon selector component
 */
function IconSelector({
  value,
  selectedColor,
  onChange,
}: {
  value: string
  selectedColor: string
  onChange: (icon: string) => void
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {availableIcons.map((item) => {
        const IconComponent = item.icon
        const isSelected = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            title={item.label}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200',
              'hover:bg-accent',
              isSelected
                ? 'ring-2 ring-primary bg-accent'
                : 'border border-transparent hover:border-border'
            )}
            onClick={() => onChange(item.value)}
          >
            <IconComponent
              className="h-5 w-5"
              style={{ color: isSelected ? selectedColor : undefined }}
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Live preview component
 */
function ProjectPreview({
  name,
  color,
  icon,
}: {
  name: string
  color: string
  icon: string
}) {
  const iconConfig = availableIcons.find((i) => i.value === icon)
  const IconComponent = iconConfig?.icon || Folder

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-2">Preview</p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <IconComponent className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <h4 className="font-medium">{name || 'Project Name'}</h4>
          <p className="text-sm text-muted-foreground">0 tasks</p>
        </div>
      </div>
    </div>
  )
}

export const ProjectForm: FC<ProjectFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create Project',
  className,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#6366f1',
      icon: 'folder',
      ...defaultValues,
    },
  })

  const selectedColor = watch('color')
  const selectedIcon = watch('icon') || 'folder'
  const projectName = watch('name')

  const handleFormSubmit = handleSubmit(async (values: ProjectFormValues) => {
    await onSubmit(values)
  })

  return (
    <form onSubmit={handleFormSubmit} className={cn('space-y-6', className)}>
      {/* Name field */}
      <div className="space-y-2">
        <FormLabel htmlFor="name" required>
          Project Name
        </FormLabel>
        <Input
          id="name"
          placeholder="My Awesome Project"
          {...register('name')}
          aria-invalid={!!errors.name}
          autoFocus
        />
        <FormError message={errors.name?.message} />
      </div>

      {/* Description field */}
      <div className="space-y-2">
        <FormLabel htmlFor="description">Description</FormLabel>
        <Textarea
          id="description"
          placeholder="What is this project about?"
          rows={3}
          {...register('description')}
          aria-invalid={!!errors.description}
        />
        <FormError message={errors.description?.message} />
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <FormLabel htmlFor="color">Color</FormLabel>
        <ColorPicker
          value={selectedColor}
          onChange={(color) => setValue('color', color)}
        />
        <FormError message={errors.color?.message} />
      </div>

      {/* Icon selector */}
      <div className="space-y-2">
        <FormLabel htmlFor="icon">Icon</FormLabel>
        <IconSelector
          value={selectedIcon}
          selectedColor={selectedColor}
          onChange={(icon) => setValue('icon', icon)}
        />
      </div>

      {/* Preview */}
      <ProjectPreview
        name={projectName}
        color={selectedColor}
        icon={selectedIcon}
      />

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
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
 * Hook to use the project form with mutations
 */
export function useProjectForm(options: {
  onSuccess?: () => void
  onError?: (error: Error) => void
}) {
  // This would integrate with useProjectMutations from hooks/use-projects.ts
  // For now, return a placeholder that can be connected later
  return {
    handleCreate: async (values: ProjectFormValues) => {
      console.log('Creating project:', values)
      options.onSuccess?.()
    },
    handleUpdate: async (projectId: string, values: ProjectFormValues) => {
      console.log('Updating project:', projectId, values)
      options.onSuccess?.()
    },
    isSubmitting: false,
  }
}
