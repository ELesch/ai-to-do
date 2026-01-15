/**
 * QuickAddForm Component
 * Quick task creation form with minimal fields
 */

'use client'

import { type FC, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface QuickAddFormProps {
  onAdd?: (title: string) => Promise<void>
  placeholder?: string
  className?: string
}

export const QuickAddForm: FC<QuickAddFormProps> = ({
  onAdd,
  placeholder = 'Add a new task...',
  className = '',
}) => {
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    startTransition(async () => {
      if (onAdd) {
        await onAdd(title.trim())
      }
      setTitle('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={isPending}
        className="flex-1"
      />
      <Button type="submit" disabled={isPending || !title.trim()}>
        {isPending ? 'Adding...' : 'Add Task'}
      </Button>
    </form>
  )
}
