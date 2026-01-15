/**
 * TaskDecomposition Component
 * AI-powered task breakdown dialog that helps users decompose tasks into subtasks
 */

'use client'

import { type FC, useState, useCallback, useEffect } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAIDecompose } from '@/hooks/use-ai-chat'

/**
 * Editable subtask item in the decomposition list
 */
interface SubtaskItem {
  id: string
  title: string
  isNew?: boolean
}

/**
 * Generate a unique ID for new subtasks
 */
function generateSubtaskId(): string {
  return `subtask-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface SubtaskRowProps {
  subtask: SubtaskItem
  index: number
  total: number
  onEdit: (id: string, title: string) => void
  onRemove: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  disabled?: boolean
}

/**
 * Individual subtask row with edit, remove, and reorder controls
 */
const SubtaskRow: FC<SubtaskRowProps> = ({
  subtask,
  index,
  total,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(subtask.isNew ?? false)
  const [editValue, setEditValue] = useState(subtask.title)

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onEdit(subtask.id, editValue.trim())
      setIsEditing(false)
    }
  }, [subtask.id, editValue, onEdit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(subtask.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-2 rounded-lg border bg-card',
        'hover:bg-accent/50 transition-colors',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Drag handle placeholder (for visual consistency) */}
      <div className="text-muted-foreground cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Index number */}
      <span className="w-6 text-center text-sm text-muted-foreground font-medium">
        {index + 1}.
      </span>

      {/* Title / Edit input */}
      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 h-8"
          autoFocus
          disabled={disabled}
        />
      ) : (
        <span
          className="flex-1 cursor-pointer hover:text-primary"
          onClick={() => !disabled && setIsEditing(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) setIsEditing(true)
          }}
        >
          {subtask.title}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move up */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMoveUp(subtask.id)}
          disabled={disabled || index === 0}
          title="Move up"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>

        {/* Move down */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMoveDown(subtask.id)}
          disabled={disabled || index === total - 1}
          title="Move down"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>

        {/* Remove */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(subtask.id)}
          disabled={disabled}
          title="Remove"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Task information for decomposition
 */
export interface DecompositionTask {
  id: string
  title: string
  description?: string | null
}

interface TaskDecompositionProps {
  /** The task to decompose */
  task: DecompositionTask
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog should close */
  onOpenChange: (open: boolean) => void
  /** Callback when user applies the subtasks */
  onApply: (subtasks: string[]) => void | Promise<void>
  /** Whether the apply operation is in progress */
  isApplying?: boolean
}

/**
 * TaskDecomposition Dialog
 * Shows AI-generated subtask suggestions with editing capabilities
 */
export const TaskDecomposition: FC<TaskDecompositionProps> = ({
  task,
  open,
  onOpenChange,
  onApply,
  isApplying = false,
}) => {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  const {
    subtasks: aiSubtasks,
    reasoning,
    isLoading,
    error,
    decompose,
    cancel,
  } = useAIDecompose(task.id)

  // Update subtasks when AI returns results
  useEffect(() => {
    if (aiSubtasks.length > 0) {
      setSubtasks(
        aiSubtasks.map((title) => ({
          id: generateSubtaskId(),
          title,
        }))
      )
      setHasGenerated(true)
    }
  }, [aiSubtasks])

  // Auto-generate on first open
  useEffect(() => {
    if (open && !hasGenerated && !isLoading) {
      decompose()
    }
  }, [open, hasGenerated, isLoading, decompose])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasGenerated(false)
      setSubtasks([])
      setNewSubtaskTitle('')
    }
  }, [open])

  // Handlers for subtask manipulation
  const handleEdit = useCallback((id: string, title: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title, isNew: false } : s))
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleMoveUp = useCallback((id: string) => {
    setSubtasks((prev) => {
      const index = prev.findIndex((s) => s.id === id)
      if (index <= 0) return prev
      const newList = [...prev]
      ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
      return newList
    })
  }, [])

  const handleMoveDown = useCallback((id: string) => {
    setSubtasks((prev) => {
      const index = prev.findIndex((s) => s.id === id)
      if (index < 0 || index >= prev.length - 1) return prev
      const newList = [...prev]
      ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
      return newList
    })
  }, [])

  const handleAddSubtask = useCallback(() => {
    if (newSubtaskTitle.trim()) {
      setSubtasks((prev) => [
        ...prev,
        {
          id: generateSubtaskId(),
          title: newSubtaskTitle.trim(),
          isNew: false,
        },
      ])
      setNewSubtaskTitle('')
    }
  }, [newSubtaskTitle])

  const handleRegenerate = useCallback(() => {
    setSubtasks([])
    setHasGenerated(false)
    decompose()
  }, [decompose])

  const handleApply = useCallback(async () => {
    const titles = subtasks.map((s) => s.title).filter((t) => t.trim())
    if (titles.length > 0) {
      await onApply(titles)
      onOpenChange(false)
    }
  }, [subtasks, onApply, onOpenChange])

  const handleClose = () => {
    if (isLoading) {
      cancel()
    }
    onOpenChange(false)
  }

  const isDisabled = isLoading || isApplying

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Break Down Task with AI
          </DialogTitle>
          <DialogDescription>
            AI will suggest subtasks to help you complete this task more efficiently.
          </DialogDescription>
        </DialogHeader>

        {/* Original task info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI reasoning (if available) */}
        {reasoning && !isLoading && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span className="font-medium">AI reasoning: </span>
            {reasoning}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
            {error.message}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing task and generating subtasks...</p>
          </div>
        )}

        {/* Subtasks list */}
        {!isLoading && subtasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Suggested Subtasks ({subtasks.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isDisabled}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {subtasks.map((subtask, index) => (
                <SubtaskRow
                  key={subtask.id}
                  subtask={subtask}
                  index={index}
                  total={subtasks.length}
                  onEdit={handleEdit}
                  onRemove={handleRemove}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  disabled={isDisabled}
                />
              ))}
            </div>

            {/* Add custom subtask */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add custom subtask..."
                className="flex-1 h-9"
                disabled={isDisabled}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSubtask}
                disabled={isDisabled || !newSubtaskTitle.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Empty state after generation */}
        {!isLoading && hasGenerated && subtasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-sm text-muted-foreground">
              No subtasks suggested. You can add custom subtasks or try regenerating.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isDisabled}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isDisabled || subtasks.length === 0}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Subtasks...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply {subtasks.length > 0 && `(${subtasks.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TaskDecomposition
