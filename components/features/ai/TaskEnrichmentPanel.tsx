/**
 * TaskEnrichmentPanel Component
 * Displays AI enrichment proposals for tasks with interactive acceptance controls
 */

'use client'

import { type FC, useState, useCallback, useMemo } from 'react'
import {
  AlertTriangle,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Flag,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  EnrichmentProposal,
  SimilarityAnalysis,
  EnrichmentInsights,
  ProposedSubtask,
  ConfidenceLevel,
} from '@/types/ai'
import type { TaskPriority } from '@/types/task'

// =============================================================================
// TYPES
// =============================================================================

interface TaskEnrichmentPanelProps {
  /** The enrichment proposal from AI */
  proposal: EnrichmentProposal | null
  /** Similar tasks analysis */
  similarTasks: SimilarityAnalysis | null
  /** AI insights about the proposal */
  insights: EnrichmentInsights | null
  /** Whether the enrichment is currently loading */
  isLoading: boolean
  /** Callback when user accepts fields */
  onAccept: (
    acceptedFields: string[],
    modifications?: Record<string, unknown>
  ) => void
  /** Callback when user dismisses the panel */
  onDismiss: () => void
}

/** Field identifiers for tracking selection */
type EnrichmentField =
  | 'title'
  | 'description'
  | 'dueDate'
  | 'estimatedMinutes'
  | 'priority'
  | 'subtasks'

/** Local state for edited values */
interface EditedValues {
  title?: string
  description?: string
  dueDate?: string | null
  estimatedMinutes?: number
  priority?: TaskPriority
  subtasks?: ProposedSubtask[]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format minutes as a human-readable duration
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format a date string for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Format a date string for input type="date"
 */
function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

/**
 * Get priority color classes
 */
function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'high':
      return 'text-red-500 dark:text-red-400'
    case 'medium':
      return 'text-orange-500 dark:text-orange-400'
    case 'low':
      return 'text-blue-500 dark:text-blue-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get confidence badge variant
 */
function getConfidenceBadgeVariant(
  confidence: ConfidenceLevel
): 'default' | 'secondary' | 'outline' {
  switch (confidence) {
    case 'high':
      return 'default'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
  }
}

/**
 * Get confidence display text
 */
function getConfidenceText(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return 'High confidence'
    case 'medium':
      return 'Medium confidence'
    case 'low':
      return 'Low confidence'
  }
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

/**
 * Editable field wrapper with selection checkbox
 */
interface FieldRowProps {
  field: EnrichmentField
  label: string
  icon: React.ReactNode
  isSelected: boolean
  isEditing: boolean
  onToggleSelect: () => void
  onToggleEdit: () => void
  children: React.ReactNode
  editContent?: React.ReactNode
  disabled?: boolean
}

const FieldRow: FC<FieldRowProps> = ({
  label,
  icon,
  isSelected,
  isEditing,
  onToggleSelect,
  onToggleEdit,
  children,
  editContent,
  disabled = false,
}) => {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-muted-foreground text-sm font-medium">
            {label}
          </span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleEdit}
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              disabled={disabled}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {isEditing && editContent ? editContent : children}
      </div>
    </div>
  )
}

/**
 * Subtask item with selection and AI indicator
 */
interface SubtaskItemProps {
  subtask: ProposedSubtask
  isSelected: boolean
  onToggleSelect: () => void
  disabled?: boolean
}

const SubtaskItem: FC<SubtaskItemProps> = ({
  subtask,
  isSelected,
  onToggleSelect,
  disabled = false,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border p-2 transition-colors',
        isSelected
          ? 'bg-primary/5 border-primary/20'
          : 'bg-muted/30 border-transparent'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        disabled={disabled}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{subtask.title}</span>
          {subtask.aiCanDo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-xs"
                >
                  <Bot className="h-3 w-3" />
                  AI
                </Badge>
              </TooltipTrigger>
              <TooltipContent>AI can help with this subtask</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          {subtask.estimatedMinutes && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatDuration(subtask.estimatedMinutes)}
            </span>
          )}
          {subtask.type && (
            <Badge variant="outline" className="px-1.5 py-0 text-xs capitalize">
              {subtask.type}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Similar task insight card
 */
interface SimilarTaskCardProps {
  task: SimilarityAnalysis['matchedTasks'][0]
}

const SimilarTaskCard: FC<SimilarTaskCardProps> = ({ task }) => {
  const accuracyRatio = task.executionInsights.estimatedVsActual
  const accuracyDisplay = accuracyRatio
    ? `${Math.round(accuracyRatio * 100)}%`
    : 'N/A'

  return (
    <div className="border-border bg-card/50 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-1 text-sm font-medium">{task.title}</h4>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {task.similarityScore}% match
        </Badge>
      </div>
      <div className="mt-2 space-y-1">
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {task.executionInsights.outcome}
          </span>
          {accuracyRatio && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {accuracyDisplay} estimate accuracy
            </span>
          )}
        </div>
        {task.matchReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.matchReasons.slice(0, 3).map((reason, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {reason}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Confidence and risk factors section
 */
interface InsightsSectionProps {
  insights: EnrichmentInsights
}

const InsightsSection: FC<InsightsSectionProps> = ({ insights }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge
          variant={getConfidenceBadgeVariant(insights.estimationConfidence)}
        >
          {getConfidenceText(insights.estimationConfidence)}
        </Badge>
        <span className="text-muted-foreground text-sm">
          {insights.successPrediction}% predicted success
        </span>
      </div>
      {insights.riskFactors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            Risk Factors
          </div>
          <ul className="space-y-1 pl-6">
            {insights.riskFactors.map((risk, idx) => (
              <li key={idx} className="text-muted-foreground list-disc text-sm">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * TaskEnrichmentPanel
 * Displays AI enrichment proposals with accept/reject controls
 */
export const TaskEnrichmentPanel: FC<TaskEnrichmentPanelProps> = ({
  proposal,
  similarTasks,
  insights,
  isLoading,
  onAccept,
  onDismiss,
}) => {
  // Selection state for each field
  const [selectedFields, setSelectedFields] = useState<Set<EnrichmentField>>(
    new Set([
      'title',
      'description',
      'dueDate',
      'estimatedMinutes',
      'priority',
      'subtasks',
    ])
  )

  // Track which subtasks the user has deselected (starts empty = all selected)
  const [deselectedSubtasks, setDeselectedSubtasks] = useState<Set<number>>(
    new Set()
  )

  // Compute selected subtasks from proposal and deselection set
  const selectedSubtasks = useMemo(() => {
    if (!proposal?.proposedSubtasks) return new Set<number>()
    const allIndices = new Set(proposal.proposedSubtasks.map((_, i) => i))
    deselectedSubtasks.forEach((i) => allIndices.delete(i))
    return allIndices
  }, [proposal, deselectedSubtasks])

  // Editing state for each field
  const [editingField, setEditingField] = useState<EnrichmentField | null>(null)

  // Edited values (overrides proposal values when set)
  const [editedValues, setEditedValues] = useState<EditedValues>({})

  // Similar tasks section expanded state
  const [similarTasksExpanded, setSimilarTasksExpanded] = useState(false)

  // Toggle field selection
  const toggleFieldSelection = useCallback((field: EnrichmentField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) {
        next.delete(field)
      } else {
        next.add(field)
      }
      return next
    })
  }, [])

  // Toggle subtask selection (add/remove from deselection set)
  const toggleSubtaskSelection = useCallback((index: number) => {
    setDeselectedSubtasks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        // Was deselected, now select it
        next.delete(index)
      } else {
        // Was selected, now deselect it
        next.add(index)
      }
      return next
    })
  }, [])

  // Select all subtasks (clear deselection set)
  const selectAllSubtasks = useCallback(() => {
    setDeselectedSubtasks(new Set())
  }, [])

  // Deselect all subtasks (add all indices to deselection set)
  const deselectAllSubtasks = useCallback(() => {
    if (proposal?.proposedSubtasks) {
      setDeselectedSubtasks(new Set(proposal.proposedSubtasks.map((_, i) => i)))
    }
  }, [proposal])

  // Start editing a field
  const startEditing = useCallback((field: EnrichmentField) => {
    setEditingField(field)
  }, [])

  // Stop editing and save
  const stopEditing = useCallback(() => {
    setEditingField(null)
  }, [])

  // Update edited value
  const updateEditedValue = useCallback(
    <K extends keyof EditedValues>(key: K, value: EditedValues[K]) => {
      setEditedValues((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Handle accept all
  const handleAcceptAll = useCallback(() => {
    if (!proposal) return

    const fields = Array.from(selectedFields)
    const modifications: Record<string, unknown> = {}

    // Include edited values
    if (editedValues.title !== undefined) {
      modifications.title = editedValues.title
    }
    if (editedValues.description !== undefined) {
      modifications.description = editedValues.description
    }
    if (editedValues.dueDate !== undefined) {
      modifications.dueDate = editedValues.dueDate
    }
    if (editedValues.estimatedMinutes !== undefined) {
      modifications.estimatedMinutes = editedValues.estimatedMinutes
    }
    if (editedValues.priority !== undefined) {
      modifications.priority = editedValues.priority
    }

    // Include selected subtasks
    if (selectedFields.has('subtasks')) {
      const subtasks = proposal.proposedSubtasks.filter((_, i) =>
        selectedSubtasks.has(i)
      )
      modifications.subtasks = subtasks
    }

    onAccept(
      fields,
      Object.keys(modifications).length > 0 ? modifications : undefined
    )
  }, [proposal, selectedFields, selectedSubtasks, editedValues, onAccept])

  // Handle accept selected
  const handleAcceptSelected = useCallback(() => {
    handleAcceptAll()
  }, [handleAcceptAll])

  // Check if any fields are selected
  const hasSelectedFields = selectedFields.size > 0

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Analyzing task and generating suggestions...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No proposal state
  if (!proposal) {
    return null
  }

  return (
    <Card className="border-primary/20 from-primary/5 bg-gradient-to-br to-transparent">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary h-5 w-5" />
            AI Enrichment Suggestions
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Insights Section */}
        {insights && <InsightsSection insights={insights} />}

        {/* Proposed Fields */}
        <div className="space-y-2">
          {/* Title */}
          <FieldRow
            field="title"
            label="Title"
            icon={<Sparkles className="h-4 w-4" />}
            isSelected={selectedFields.has('title')}
            isEditing={editingField === 'title'}
            onToggleSelect={() => toggleFieldSelection('title')}
            onToggleEdit={() => startEditing('title')}
            editContent={
              <div className="flex gap-2">
                <Input
                  value={editedValues.title ?? proposal.proposedTitle}
                  onChange={(e) => updateEditedValue('title', e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={stopEditing}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <p className="text-sm font-medium">
              {editedValues.title ?? proposal.proposedTitle}
            </p>
          </FieldRow>

          {/* Description */}
          <FieldRow
            field="description"
            label="Description"
            icon={<Edit2 className="h-4 w-4" />}
            isSelected={selectedFields.has('description')}
            isEditing={editingField === 'description'}
            onToggleSelect={() => toggleFieldSelection('description')}
            onToggleEdit={() => startEditing('description')}
            editContent={
              <div className="space-y-2">
                <Textarea
                  value={
                    editedValues.description ?? proposal.proposedDescription
                  }
                  onChange={(e) =>
                    updateEditedValue('description', e.target.value)
                  }
                  className="min-h-[80px]"
                  autoFocus
                />
                <Button size="sm" onClick={stopEditing}>
                  <Check className="mr-1 h-4 w-4" />
                  Done
                </Button>
              </div>
            }
          >
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {(editedValues.description ?? proposal.proposedDescription) ||
                'No description'}
            </p>
          </FieldRow>

          {/* Due Date */}
          <FieldRow
            field="dueDate"
            label="Due Date"
            icon={<Calendar className="h-4 w-4" />}
            isSelected={selectedFields.has('dueDate')}
            isEditing={editingField === 'dueDate'}
            onToggleSelect={() => toggleFieldSelection('dueDate')}
            onToggleEdit={() => startEditing('dueDate')}
            editContent={
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={formatDateForInput(
                    editedValues.dueDate ?? proposal.proposedDueDate
                  )}
                  onChange={(e) =>
                    updateEditedValue('dueDate', e.target.value || null)
                  }
                  className="w-auto"
                  autoFocus
                />
                <Button size="sm" onClick={stopEditing}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <p className="text-sm">
              {formatDate(editedValues.dueDate ?? proposal.proposedDueDate)}
            </p>
          </FieldRow>

          {/* Estimated Time */}
          <FieldRow
            field="estimatedMinutes"
            label="Estimated Time"
            icon={<Clock className="h-4 w-4" />}
            isSelected={selectedFields.has('estimatedMinutes')}
            isEditing={editingField === 'estimatedMinutes'}
            onToggleSelect={() => toggleFieldSelection('estimatedMinutes')}
            onToggleEdit={() => startEditing('estimatedMinutes')}
            editContent={
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={
                    editedValues.estimatedMinutes ??
                    proposal.proposedEstimatedMinutes
                  }
                  onChange={(e) =>
                    updateEditedValue(
                      'estimatedMinutes',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-24"
                  autoFocus
                />
                <span className="text-muted-foreground text-sm">minutes</span>
                <Button size="sm" onClick={stopEditing}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <p className="text-sm">
              {formatDuration(
                editedValues.estimatedMinutes ??
                  proposal.proposedEstimatedMinutes
              )}
            </p>
          </FieldRow>

          {/* Priority */}
          <FieldRow
            field="priority"
            label="Priority"
            icon={<Flag className="h-4 w-4" />}
            isSelected={selectedFields.has('priority')}
            isEditing={editingField === 'priority'}
            onToggleSelect={() => toggleFieldSelection('priority')}
            onToggleEdit={() => startEditing('priority')}
            editContent={
              <div className="flex gap-2">
                <Select
                  value={editedValues.priority ?? proposal.proposedPriority}
                  onValueChange={(value) =>
                    updateEditedValue('priority', value as TaskPriority)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={stopEditing}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <p
              className={cn(
                'text-sm capitalize',
                getPriorityColor(
                  editedValues.priority ?? proposal.proposedPriority
                )
              )}
            >
              {editedValues.priority ?? proposal.proposedPriority}
            </p>
          </FieldRow>
        </div>

        {/* Subtasks Section */}
        {proposal.proposedSubtasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedFields.has('subtasks')}
                  onCheckedChange={() => toggleFieldSelection('subtasks')}
                />
                <span className="text-sm font-medium">
                  Subtasks ({selectedSubtasks.size}/
                  {proposal.proposedSubtasks.length} selected)
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllSubtasks}
                  disabled={!selectedFields.has('subtasks')}
                  className="text-xs"
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllSubtasks}
                  disabled={!selectedFields.has('subtasks')}
                  className="text-xs"
                >
                  Deselect all
                </Button>
              </div>
            </div>
            <div
              className={cn(
                'max-h-[240px] space-y-2 overflow-y-auto',
                !selectedFields.has('subtasks') &&
                  'pointer-events-none opacity-50'
              )}
            >
              {proposal.proposedSubtasks.map((subtask, index) => (
                <SubtaskItem
                  key={index}
                  subtask={subtask}
                  isSelected={selectedSubtasks.has(index)}
                  onToggleSelect={() => toggleSubtaskSelection(index)}
                  disabled={!selectedFields.has('subtasks')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Similar Tasks Section */}
        {similarTasks && similarTasks.matchedTasks.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setSimilarTasksExpanded(!similarTasksExpanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                {similarTasksExpanded ? (
                  <ChevronDown className="text-muted-foreground h-4 w-4" />
                ) : (
                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  Similar Tasks ({similarTasks.matchedTasks.length})
                </span>
              </div>
              {similarTasks.aggregatedInsights && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(similarTasks.aggregatedInsights.successRate)}%
                  success rate
                </Badge>
              )}
            </button>

            {similarTasksExpanded && (
              <div className="mt-3 space-y-2">
                {/* Aggregated insights */}
                {similarTasks.aggregatedInsights && (
                  <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Avg. estimate accuracy:{' '}
                        <span className="text-foreground font-medium">
                          {Math.round(
                            similarTasks.aggregatedInsights
                              .avgEstimationAccuracy * 100
                          )}
                          %
                        </span>
                      </span>
                    </div>
                    {similarTasks.aggregatedInsights.commonStallPoints.length >
                      0 && (
                      <div>
                        <span className="text-muted-foreground">
                          Common stall points:{' '}
                        </span>
                        <span className="text-foreground">
                          {similarTasks.aggregatedInsights.commonStallPoints
                            .slice(0, 3)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual similar tasks */}
                <div className="space-y-2">
                  {similarTasks.matchedTasks.slice(0, 5).map((task) => (
                    <SimilarTaskCard key={task.taskId} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAcceptSelected}
              disabled={!hasSelectedFields}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accept Selected
            </Button>
            <Button
              onClick={() => {
                // Select all fields first, then accept
                setSelectedFields(
                  new Set([
                    'title',
                    'description',
                    'dueDate',
                    'estimatedMinutes',
                    'priority',
                    'subtasks',
                  ])
                )
                selectAllSubtasks()
                setTimeout(handleAcceptAll, 0)
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Accept All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskEnrichmentPanel
