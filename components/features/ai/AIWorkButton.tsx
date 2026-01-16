/**
 * AIWorkButton Component
 * Button that triggers AI work generation for subtasks with preview modal
 */

'use client'

import { type FC, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import {
  Sparkles,
  RefreshCw,
  Check,
  Edit,
  X,
  Loader2,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AIWorkArtifact, AIWorkType } from '@/types/ai'

// =============================================================================
// TYPES
// =============================================================================

interface AIWorkButtonProps {
  /** ID of the parent task */
  taskId: string
  /** ID of the subtask to generate work for */
  subtaskId: string
  /** Title of the subtask (used for display) */
  subtaskTitle: string
  /** Type of work to generate */
  workType: 'research' | 'draft' | 'plan'
  /** Callback when work is accepted */
  onComplete?: (artifact: AIWorkArtifact) => void
  /** Whether the button is disabled */
  disabled?: boolean
}

interface WorkResult {
  artifactId: string
  type: AIWorkType
  title: string
  content: string
  suggestedNextSteps?: string[]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the display label for a work type
 */
function getWorkTypeLabel(workType: 'research' | 'draft' | 'plan'): string {
  switch (workType) {
    case 'research':
      return 'Research'
    case 'draft':
      return 'Draft'
    case 'plan':
      return 'Plan'
    default:
      return 'Work'
  }
}

/**
 * Get the action label for a work type
 */
function getWorkTypeAction(workType: 'research' | 'draft' | 'plan'): string {
  switch (workType) {
    case 'research':
      return 'Researching'
    case 'draft':
      return 'Drafting'
    case 'plan':
      return 'Planning'
    default:
      return 'Working'
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AIWorkButton: FC<AIWorkButtonProps> = ({
  taskId,
  subtaskId,
  subtaskTitle,
  workType,
  onComplete,
  disabled = false,
}) => {
  // State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [workResult, setWorkResult] = useState<WorkResult | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * Call the AI work API
   */
  const generateWork = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/do-work', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          subtaskId,
          workType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 429) {
          throw new Error(
            errorData.error || 'Rate limit exceeded. Please try again later.'
          )
        }

        if (response.status === 404) {
          throw new Error(errorData.error || 'Task or subtask not found.')
        }

        throw new Error(errorData.error || 'Failed to generate work')
      }

      const data = await response.json()

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid response from server')
      }

      const result: WorkResult = {
        artifactId: data.data.artifactId,
        type: data.data.type,
        title: data.data.title,
        content: data.data.content,
        suggestedNextSteps: data.data.suggestedNextSteps,
      }

      setWorkResult(result)
      setEditedContent(result.content)
      setIsEditing(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      toast.error('Failed to generate work', {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [taskId, subtaskId, workType])

  /**
   * Handle button click to open modal and start generation
   */
  const handleClick = useCallback(() => {
    setIsModalOpen(true)
    setWorkResult(null)
    setError(null)
    setIsEditing(false)
    generateWork()
  }, [generateWork])

  /**
   * Handle regenerate
   */
  const handleRegenerate = useCallback(() => {
    setIsEditing(false)
    generateWork()
  }, [generateWork])

  /**
   * Handle accept
   */
  const handleAccept = useCallback(
    async (markComplete: boolean = false) => {
      if (!workResult) return

      try {
        // Create the artifact object to pass to callback
        const artifact: AIWorkArtifact = {
          id: workResult.artifactId,
          taskId,
          subtaskId,
          userId: '', // Will be filled by server
          type: workResult.type,
          title: workResult.title,
          content: isEditing ? editedContent : workResult.content,
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        // If content was edited, update the artifact on the server
        if (isEditing && editedContent !== workResult.content) {
          const response = await fetch(
            `/api/ai/artifacts/${workResult.artifactId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'modified',
                content: editedContent,
              }),
            }
          )

          if (!response.ok) {
            console.warn('Failed to update artifact content on server')
          }
        }

        // Update artifact status to accepted
        await fetch(`/api/ai/artifacts/${workResult.artifactId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: isEditing ? 'modified' : 'accepted',
          }),
        }).catch(() => {
          // Non-critical, don't block on this
          console.warn('Failed to update artifact status')
        })

        // Call the onComplete callback
        if (onComplete) {
          onComplete(artifact)
        }

        // Show success message
        toast.success(`${getWorkTypeLabel(workType)} accepted`, {
          description: markComplete ? 'Subtask marked as complete' : undefined,
        })

        // Close modal
        setIsModalOpen(false)
      } catch (err) {
        toast.error('Failed to accept work', {
          description:
            err instanceof Error ? err.message : 'An unexpected error occurred',
        })
      }
    },
    [
      workResult,
      taskId,
      subtaskId,
      isEditing,
      editedContent,
      workType,
      onComplete,
    ]
  )

  /**
   * Handle copy to clipboard
   */
  const handleCopy = useCallback(async () => {
    if (!workResult) return

    const contentToCopy = isEditing ? editedContent : workResult.content

    try {
      await navigator.clipboard.writeText(contentToCopy)
      setIsCopied(true)
      toast.success('Copied to clipboard')

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }, [workResult, isEditing, editedContent])

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (isLoading) {
      // Confirm before closing while loading
      if (
        !window.confirm(
          'Generation in progress. Are you sure you want to close?'
        )
      ) {
        return
      }
    }
    setIsModalOpen(false)
  }, [isLoading])

  /**
   * Toggle edit mode
   */
  const handleToggleEdit = useCallback(() => {
    if (!isEditing && workResult) {
      setEditedContent(workResult.content)
    }
    setIsEditing(!isEditing)
  }, [isEditing, workResult])

  // Render
  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>AI {getWorkTypeLabel(workType)}</span>
      </Button>

      {/* Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              AI {getWorkTypeLabel(workType)}
            </DialogTitle>
            <DialogDescription>{subtaskTitle}</DialogDescription>
          </DialogHeader>

          {/* Content Area */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
                <p className="text-muted-foreground text-sm">
                  {getWorkTypeAction(workType)}...
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  This may take a moment
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                <p className="font-medium text-red-700 dark:text-red-400">
                  Error
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  className="mt-3"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Result Content */}
            {workResult && !isLoading && !error && (
              <div className="flex h-full flex-col">
                {/* Action bar */}
                <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {workResult.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 px-2"
                    >
                      {isCopied ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant={isEditing ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={handleToggleEdit}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="ml-1.5">
                        {isEditing ? 'Preview' : 'Edit'}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Content display/edit */}
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
                  {isEditing ? (
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="h-full min-h-[300px] w-full resize-none border-0 focus-visible:ring-0"
                      placeholder="Edit the generated content..."
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-gray-800 dark:prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-headings:mt-4 prose-headings:mb-2 max-w-none p-4">
                      <ReactMarkdown>{workResult.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Suggested Next Steps */}
                {workResult.suggestedNextSteps &&
                  workResult.suggestedNextSteps.length > 0 && (
                    <div className="mt-3 flex-shrink-0">
                      <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                        Suggested Next Steps
                      </p>
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        {workResult.suggestedNextSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-1.5">
                            <span className="mt-0.5 text-blue-500">-</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter
            className={cn(
              'mt-4 flex-shrink-0 border-t pt-4',
              (!workResult || isLoading || error) && 'hidden'
            )}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isLoading}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAccept(false)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Accept
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AIWorkButton
