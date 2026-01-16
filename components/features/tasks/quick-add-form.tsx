/**
 * QuickAddForm Component
 * Quick task creation form with minimal fields and optional AI enrichment
 */

'use client'

import { type FC, useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TaskEnrichmentPanel } from '@/components/features/ai/TaskEnrichmentPanel'
import { useTaskEnrichment } from '@/hooks'
import type { ProposedSubtask, TaskPriority } from '@/types'

/**
 * Enriched task data that can be passed to onAddEnriched
 */
export interface EnrichedTaskData {
  title: string
  description?: string
  dueDate?: string | null
  estimatedMinutes?: number
  priority?: TaskPriority
  subtasks?: ProposedSubtask[]
}

interface QuickAddFormProps {
  /** Handler for basic task creation (title only) */
  onAdd?: (title: string) => Promise<void>
  /** Handler for enriched task creation (all fields) */
  onAddEnriched?: (data: EnrichedTaskData) => Promise<void>
  /** Placeholder text for the input */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to enable AI enrichment (default: true) */
  enableEnrichment?: boolean
  /** Project ID for context-aware enrichment */
  projectId?: string
}

export const QuickAddForm: FC<QuickAddFormProps> = ({
  onAdd,
  onAddEnriched,
  placeholder = 'Add a new task...',
  className = '',
  enableEnrichment = true,
  projectId,
}) => {
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showEnrichmentPanel, setShowEnrichmentPanel] = useState(true)
  const router = useRouter()

  // AI enrichment hook
  const {
    proposal,
    similarTasks,
    insights,
    isLoading: isEnriching,
    enrich,
    clear: clearEnrichment,
    cancel: cancelEnrichment,
  } = useTaskEnrichment({
    debounceMs: 500,
  })

  // Track the previous proposal to detect when a new one arrives
  const [lastSeenProposalTitle, setLastSeenProposalTitle] = useState<
    string | null
  >(null)

  // Trigger enrichment when title changes (debounced by hook)
  useEffect(() => {
    if (enableEnrichment && title.trim().length >= 3) {
      enrich(title, undefined, projectId)
    } else if (title.trim().length < 3) {
      clearEnrichment()
    }
  }, [title, enableEnrichment, projectId, enrich, clearEnrichment])

  // When a new proposal arrives (different from the last one we saw), show the panel
  // This avoids the anti-pattern of calling setState inside useEffect
  const currentProposalTitle = proposal?.proposedTitle ?? null
  if (currentProposalTitle !== lastSeenProposalTitle) {
    setLastSeenProposalTitle(currentProposalTitle)
    if (currentProposalTitle && !showEnrichmentPanel) {
      setShowEnrichmentPanel(true)
    }
  }

  /**
   * Handle basic form submission (without enrichment)
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!title.trim()) return

      // Cancel any pending enrichment
      cancelEnrichment()

      startTransition(async () => {
        if (onAdd) {
          await onAdd(title.trim())
        }
        setTitle('')
        clearEnrichment()
        router.refresh()
      })
    },
    [title, onAdd, cancelEnrichment, clearEnrichment, router]
  )

  /**
   * Handle accepting enriched data from the panel
   */
  const handleAcceptEnrichment = useCallback(
    (acceptedFields: string[], modifications?: Record<string, unknown>) => {
      if (!proposal) return

      // Build the enriched task data based on accepted fields
      const enrichedData: EnrichedTaskData = {
        title: title.trim(), // Default to original title
      }

      // Apply accepted fields from proposal (or modifications if provided)
      if (acceptedFields.includes('title')) {
        enrichedData.title =
          (modifications?.title as string) ?? proposal.proposedTitle
      }
      if (acceptedFields.includes('description')) {
        enrichedData.description =
          (modifications?.description as string) ?? proposal.proposedDescription
      }
      if (acceptedFields.includes('dueDate')) {
        enrichedData.dueDate =
          (modifications?.dueDate as string | null) ?? proposal.proposedDueDate
      }
      if (acceptedFields.includes('estimatedMinutes')) {
        enrichedData.estimatedMinutes =
          (modifications?.estimatedMinutes as number) ??
          proposal.proposedEstimatedMinutes
      }
      if (acceptedFields.includes('priority')) {
        enrichedData.priority =
          (modifications?.priority as TaskPriority) ?? proposal.proposedPriority
      }
      if (acceptedFields.includes('subtasks')) {
        enrichedData.subtasks =
          (modifications?.subtasks as ProposedSubtask[]) ??
          proposal.proposedSubtasks
      }

      startTransition(async () => {
        // Use enriched handler if available, otherwise fall back to basic handler
        if (onAddEnriched) {
          await onAddEnriched(enrichedData)
        } else if (onAdd) {
          // Fall back to basic handler with enriched title
          await onAdd(enrichedData.title)
        }
        setTitle('')
        clearEnrichment()
        setShowEnrichmentPanel(false)
        router.refresh()
      })
    },
    [proposal, title, onAddEnriched, onAdd, clearEnrichment, router]
  )

  /**
   * Handle dismissing the enrichment panel
   */
  const handleDismissEnrichment = useCallback(() => {
    setShowEnrichmentPanel(false)
  }, [])

  // Determine if we should show the subtle loading indicator
  const showLoadingIndicator =
    enableEnrichment && isEnriching && title.trim().length >= 3

  // Determine if we should show the enrichment panel
  const shouldShowPanel =
    enableEnrichment && showEnrichmentPanel && (isEnriching || proposal)

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            disabled={isPending}
            className="flex-1 pr-8"
          />
          {/* Subtle loading indicator */}
          {showLoadingIndicator && (
            <div className="absolute top-1/2 right-2 -translate-y-1/2">
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            </div>
          )}
          {/* AI indicator when proposal is ready */}
          {enableEnrichment &&
            proposal &&
            !isEnriching &&
            showEnrichmentPanel && (
              <div className="absolute top-1/2 right-2 -translate-y-1/2">
                <Sparkles className="text-primary h-4 w-4" />
              </div>
            )}
        </div>
        <Button type="submit" disabled={isPending || !title.trim()}>
          {isPending ? 'Adding...' : 'Add Task'}
        </Button>
      </form>

      {/* AI Enrichment Panel */}
      {shouldShowPanel && (
        <div className="mt-4">
          <TaskEnrichmentPanel
            proposal={proposal}
            similarTasks={similarTasks}
            insights={insights}
            isLoading={isEnriching}
            onAccept={handleAcceptEnrichment}
            onDismiss={handleDismissEnrichment}
          />
        </div>
      )}
    </div>
  )
}
