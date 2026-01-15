/**
 * DraftEditor Component
 * Rich text editor for AI-assisted content drafting
 */

'use client'

import { type FC, useState, useCallback, useRef, useEffect } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Wand2,
  Sparkles,
  Maximize2,
  Minimize2,
  Save,
  Loader2,
  Clock,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useDraftContext, type SavedContext } from '@/hooks/use-ai-context'

// =============================================================================
// TYPES
// =============================================================================

export type DraftAction = 'generate' | 'improve' | 'expand' | 'summarize'

export interface DraftEditorProps {
  /** Task ID to associate drafts with */
  taskId: string
  /** Task title for context */
  taskTitle?: string
  /** Task description for context */
  taskDescription?: string
  /** Initial content for the editor */
  initialContent?: string
  /** Callback when draft is saved */
  onSave?: (content: string, title?: string) => void
  /** Callback when content changes */
  onChange?: (content: string) => void
  /** Whether the editor is in read-only mode */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

interface SelectionState {
  start: number
  end: number
  text: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Apply basic markdown formatting to selected text
 */
function applyFormatting(
  content: string,
  selection: SelectionState,
  format: 'bold' | 'italic' | 'list' | 'orderedList'
): { newContent: string; newCursorPos: number } {
  const before = content.substring(0, selection.start)
  const selected = selection.text
  const after = content.substring(selection.end)

  let formatted: string
  let offset: number

  switch (format) {
    case 'bold':
      formatted = `**${selected || 'bold text'}**`
      offset = selected ? 2 : 11
      break
    case 'italic':
      formatted = `*${selected || 'italic text'}*`
      offset = selected ? 1 : 12
      break
    case 'list':
      if (selected) {
        formatted = selected
          .split('\n')
          .map((line) => `- ${line}`)
          .join('\n')
      } else {
        formatted = '\n- '
      }
      offset = 2
      break
    case 'orderedList':
      if (selected) {
        formatted = selected
          .split('\n')
          .map((line, i) => `${i + 1}. ${line}`)
          .join('\n')
      } else {
        formatted = '\n1. '
      }
      offset = 3
      break
  }

  return {
    newContent: before + formatted + after,
    newCursorPos: selection.start + offset,
  }
}

// =============================================================================
// DRAFT EDITOR COMPONENT
// =============================================================================

export const DraftEditor: FC<DraftEditorProps> = ({
  taskId,
  taskTitle,
  taskDescription,
  initialContent = '',
  onSave,
  onChange,
  readOnly = false,
  className,
}) => {
  // State
  const [content, setContent] = useState(initialContent)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentAction, setCurrentAction] = useState<DraftAction | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([initialContent])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef<SelectionState>({ start: 0, end: 0, text: '' })

  // Hooks
  const {
    draftContexts,
    currentDraft,
    isLoading: isLoadingDrafts,
    saveDraft,
  } = useDraftContext(taskId)

  // Load initial draft if available
  useEffect(() => {
    if (currentDraft && !initialContent) {
      setContent(currentDraft.content)
      setHistory([currentDraft.content])
      setHistoryIndex(0)
    }
  }, [currentDraft, initialContent])

  // Track selection
  const updateSelection = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      selectionRef.current = {
        start,
        end,
        text: content.substring(start, end),
      }
    }
  }, [content])

  // Add to history
  const addToHistory = useCallback((newContent: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newContent)
      // Keep only last 20 entries
      if (newHistory.length > 20) {
        newHistory.shift()
      }
      return newHistory
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 19))
  }, [historyIndex])

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange]
  )

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setContent(history[newIndex])
      onChange?.(history[newIndex])
    }
  }, [historyIndex, history, onChange])

  // Apply formatting
  const handleFormat = useCallback(
    (format: 'bold' | 'italic' | 'list' | 'orderedList') => {
      updateSelection()
      const { newContent, newCursorPos } = applyFormatting(
        content,
        selectionRef.current,
        format
      )
      handleContentChange(newContent)
      addToHistory(newContent)

      // Set cursor position after React re-render
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    },
    [content, handleContentChange, addToHistory, updateSelection]
  )

  // AI Draft Action
  const handleAIAction = useCallback(
    async (action: DraftAction) => {
      setIsGenerating(true)
      setCurrentAction(action)
      setError(null)

      updateSelection()
      const selectedText = selectionRef.current.text

      try {
        const response = await fetch('/api/ai/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            taskId,
            taskContext: {
              title: taskTitle,
              description: taskDescription,
            },
            content: content,
            selectedText: selectedText || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Request failed: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.data?.content) {
          let newContent: string

          if (action === 'generate') {
            // Replace entire content with generated draft
            newContent = data.data.content
          } else if (selectedText) {
            // Replace selected text with modified version
            const before = content.substring(0, selectionRef.current.start)
            const after = content.substring(selectionRef.current.end)
            newContent = before + data.data.content + after
          } else {
            // Append to existing content or replace for summarize
            if (action === 'summarize') {
              newContent = data.data.content
            } else {
              newContent = content + '\n\n' + data.data.content
            }
          }

          handleContentChange(newContent)
          addToHistory(newContent)
        }
      } catch (err) {
        console.error('AI draft action error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsGenerating(false)
        setCurrentAction(null)
      }
    },
    [taskId, taskTitle, taskDescription, content, handleContentChange, addToHistory, updateSelection]
  )

  // Save draft
  const handleSave = useCallback(async () => {
    if (!content.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      await saveDraft(content, taskTitle ? `Draft for: ${taskTitle}` : 'Draft')
      setLastSaved(new Date())
      onSave?.(content, taskTitle)
    } catch (err) {
      console.error('Save draft error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }, [content, taskTitle, saveDraft, onSave])

  // Load a previous version
  const handleLoadVersion = useCallback((ctx: SavedContext) => {
    setContent(ctx.content)
    addToHistory(ctx.content)
    onChange?.(ctx.content)
  }, [addToHistory, onChange])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Draft Editor</CardTitle>
          {lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 p-2 rounded-md bg-muted/50 border">
            {/* Formatting buttons */}
            <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleFormat('bold')}
                    disabled={isGenerating}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleFormat('italic')}
                    disabled={isGenerating}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleFormat('list')}
                    disabled={isGenerating}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleFormat('orderedList')}
                    disabled={isGenerating}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>
            </div>

            {/* AI action buttons */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIAction('generate')}
                    disabled={isGenerating}
                    className="gap-1.5"
                  >
                    {currentAction === 'generate' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    Generate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Generate initial draft based on task context
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIAction('improve')}
                    disabled={isGenerating || !content.trim()}
                    className="gap-1.5"
                  >
                    {currentAction === 'improve' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Improve
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Improve selected text or entire content
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIAction('expand')}
                    disabled={isGenerating || !content.trim()}
                    className="gap-1.5"
                  >
                    {currentAction === 'expand' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    Expand
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Expand and elaborate on selected text or content
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIAction('summarize')}
                    disabled={isGenerating || !content.trim()}
                    className="gap-1.5"
                  >
                    {currentAction === 'summarize' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Minimize2 className="h-3.5 w-3.5" />
                    )}
                    Summarize
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Summarize and condense content</TooltipContent>
              </Tooltip>
            </div>

            {/* Undo button */}
            <div className="ml-auto flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleUndo}
                    disabled={historyIndex === 0 || isGenerating}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* Editor */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={updateSelection}
          onKeyUp={updateSelection}
          onClick={updateSelection}
          placeholder={
            readOnly
              ? 'No draft content'
              : 'Start typing or click "Generate" to create a draft based on your task...'
          }
          readOnly={readOnly}
          className={cn(
            'flex-1 min-h-[200px] resize-none font-mono text-sm',
            isGenerating && 'opacity-50'
          )}
          disabled={isGenerating}
        />

        {/* Footer with save and version info */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className="gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Draft
              </Button>
            )}
          </div>

          {/* Version history */}
          {draftContexts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {draftContexts.length} saved version{draftContexts.length !== 1 ? 's' : ''}
              </span>
              {draftContexts.length > 1 && (
                <select
                  className="text-xs px-2 py-1 rounded border bg-background"
                  onChange={(e) => {
                    const ctx = draftContexts.find((c) => c.id === e.target.value)
                    if (ctx) handleLoadVersion(ctx)
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Load version...
                  </option>
                  {draftContexts.map((ctx) => (
                    <option key={ctx.id} value={ctx.id}>
                      v{ctx.version} - {new Date(ctx.updatedAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {isLoadingDrafts && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DraftEditor
