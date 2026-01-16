/**
 * Task Enrichment Service
 * Provides AI-powered task enrichment including subtask generation,
 * duration estimation, due date suggestions, and historical learning.
 */

import { db } from '@/lib/db'
import {
  tasks,
  taskEnrichmentProposals,
  taskExecutionHistory,
  type Task,
  type TaskEnrichmentProposal,
  type ProposedSubtask,
  type SimilarityAnalysis,
} from '@/lib/db/schema'
import { eq, and, desc, isNull, or, ilike } from 'drizzle-orm'
import { providerRegistry, type ProviderMessage } from '@/lib/ai/providers'
import { getFeatureProviderConfig } from '@/lib/ai/config'
import { aiUsageService } from './ai-usage.service'
import type {
  EnrichmentProposal,
  EnrichmentInsights,
  SimilarTaskMatch,
  ConfidenceLevel,
} from '@/types/ai'
import type { TaskPriority } from '@/types/task'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for task enrichment
 */
export interface EnrichmentInput {
  title: string
  description?: string
  projectId?: string
  existingTags?: string[]
}

/**
 * Duration estimation result
 */
export interface DurationEstimate {
  minutes: number
  confidence: ConfidenceLevel
}

/**
 * Complete enrichment result with proposal, similar tasks, and insights
 */
export interface EnrichmentResult {
  proposalId: string
  proposal: EnrichmentProposal
  similarTasks: SimilarityAnalysis
  insights: EnrichmentInsights
}

/**
 * Historical execution data for learning
 */
interface ExecutionData {
  originalEstimatedMinutes: number | null
  finalActualMinutes: number | null
  estimationAccuracyRatio: number | null
  subtasksAddedMidExecution: number | null
  outcome: string
}

// ============================================================================
// PROMPTS
// ============================================================================

const TASK_ENRICHMENT_PROMPT = `You are a task planning expert. Your job is to help users by enriching their tasks with intelligent suggestions.

## Philosophy: Propose, Don't Ask
- Make intelligent assumptions rather than asking questions
- Provide complete, actionable suggestions
- The user can modify your suggestions - don't hold back
- Be specific and concrete, not vague

## What You Propose
1. **Refined Title**: Clear, action-oriented title starting with a verb
2. **Description**: Concrete definition of done, key constraints
3. **Estimated Duration**: In minutes, based on subtasks and history
4. **Suggested Due Date**: Based on complexity (or null if unclear)
5. **Priority**: Based on implied urgency and importance
6. **Subtasks**: 3-7 actionable steps with:
   - Clear, verb-starting titles
   - Time estimates in minutes
   - Type classification (action/research/draft/plan/review)
   - Flag if AI can help with this subtask

## Subtask Types AI Can Help With
- research: Gathering information, finding options, comparing alternatives
- draft: Writing emails, documents, outlines, plans
- plan: Creating step-by-step approaches, timelines, checklists

## Output Format
Return valid JSON matching this structure:
{
  "refinedTitle": "string",
  "description": "string",
  "estimatedMinutes": number,
  "suggestedDueDate": "ISO string or null",
  "priority": "high|medium|low|none",
  "subtasks": [
    {
      "title": "string",
      "estimatedMinutes": number,
      "type": "action|research|draft|plan|review",
      "aiCanDo": boolean,
      "suggestedOrder": number
    }
  ],
  "insights": {
    "estimationConfidence": "high|medium|low",
    "riskFactors": ["string"],
    "keyAssumptions": ["string"]
  }
}`

const SUBTASK_GENERATION_PROMPT = `You are a task decomposition expert. Based on the task provided and any similar completed tasks, generate appropriate subtasks.

## Guidelines
- Generate 3-7 actionable subtasks
- Each subtask should be specific and completable
- Use action verbs (Write, Research, Review, Create, etc.)
- Estimate time in minutes for each subtask
- Classify each subtask type: action, research, draft, plan, or review
- Mark subtasks that AI can help with (research, draft, plan types)
- Order subtasks logically

## Output Format
Return valid JSON array:
[
  {
    "title": "string",
    "estimatedMinutes": number,
    "type": "action|research|draft|plan|review",
    "aiCanDo": boolean,
    "suggestedOrder": number
  }
]`

const DURATION_ESTIMATION_PROMPT = `You are a time estimation expert. Estimate how long a task will take based on the task details, subtasks, and historical data from similar tasks.

## Guidelines
- Provide a realistic estimate in minutes
- Account for common delays and interruptions
- Consider the complexity of subtasks
- Learn from historical accuracy if provided
- Provide a confidence level: high (>80% sure), medium (50-80%), low (<50%)

## Output Format
Return valid JSON:
{
  "minutes": number,
  "confidence": "high|medium|low",
  "reasoning": "string"
}`

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Cached proposal data for temporary storage before task creation
 */
interface CachedProposal {
  proposal: EnrichmentProposal
  similarityAnalysis: SimilarityAnalysis
  metadata: {
    model: string
    provider: string
    inputTokens: number
    outputTokens: number
    processingTimeMs: number
  }
  userId: string
  createdAt: Date
}

class TaskEnrichmentService {
  /**
   * Temporary cache for proposals before task creation
   * In production, this should be Redis or similar
   */
  private proposalCache: Map<string, CachedProposal> = new Map()

  /**
   * Cache TTL in milliseconds (5 minutes)
   */
  private readonly CACHE_TTL_MS = 5 * 60 * 1000
  // ==========================================================================
  // MAIN ENRICHMENT METHOD
  // ==========================================================================

  /**
   * Enriches a task with AI-generated suggestions
   * Main orchestration method that coordinates subtask generation,
   * duration estimation, due date suggestion, and similar task analysis.
   *
   * @param userId - The ID of the user requesting enrichment
   * @param input - The task input to enrich
   * @returns Complete enrichment result with proposal, similar tasks, and insights
   */
  async enrichTask(
    userId: string,
    input: EnrichmentInput
  ): Promise<EnrichmentResult> {
    const startTime = Date.now()

    // Get provider configuration for enrichment
    const config = getFeatureProviderConfig('enrich')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    // Step 1: Find similar completed tasks for context
    const similarTasks = await this.findSimilarTasks(
      userId,
      input.title,
      input.description
    )

    // Step 2: Get historical execution data
    const historicalData = await this.getHistoricalData(userId, similarTasks)

    // Step 3: Build the enrichment prompt with context
    const contextPrompt = this.buildEnrichmentContext(
      input,
      similarTasks,
      historicalData
    )

    // Step 4: Call AI for enrichment
    const messages: ProviderMessage[] = [
      { role: 'user', content: contextPrompt },
    ]

    const response = await provider.chat({
      messages,
      systemPrompt: TASK_ENRICHMENT_PROMPT,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
    })

    // Parse the AI response
    const parsed = this.parseEnrichmentResponse(response.content)

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'enrich' as 'chat', // Cast to compatible type for tracking
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Build similarity analysis from similar tasks
    const similarityAnalysis: SimilarityAnalysis = {
      matchedTasks: similarTasks.map((task) => ({
        taskId: task.taskId,
        title: task.title,
        similarityScore: task.similarityScore,
        matchReasons: task.matchReasons,
        executionInsights: task.executionInsights,
      })),
      aggregatedInsights: this.aggregateInsights(similarTasks),
    }

    // Build the proposal
    const proposal: EnrichmentProposal = {
      proposedTitle: parsed.refinedTitle,
      proposedDescription: parsed.description,
      proposedDueDate: parsed.suggestedDueDate,
      proposedEstimatedMinutes: parsed.estimatedMinutes,
      proposedPriority: parsed.priority as TaskPriority,
      proposedSubtasks: parsed.subtasks,
    }

    // Build insights
    const insights: EnrichmentInsights = {
      estimationConfidence: parsed.insights.estimationConfidence,
      riskFactors: parsed.insights.riskFactors,
      successPrediction: this.calculateSuccessPrediction(
        similarTasks,
        parsed.insights.estimationConfidence
      ),
    }

    const processingTimeMs = Date.now() - startTime

    // Save the proposal to the database (we need a taskId, so create a placeholder)
    // In practice, this is called after task creation, but for now we save without taskId
    const proposalId = await this.saveProposalWithoutTask(
      userId,
      proposal,
      similarityAnalysis,
      {
        model: response.model,
        provider: response.provider,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        processingTimeMs,
      }
    )

    return {
      proposalId,
      proposal,
      similarTasks: similarityAnalysis,
      insights,
    }
  }

  // ==========================================================================
  // SUBTASK GENERATION
  // ==========================================================================

  /**
   * Generates proposed subtasks for a task
   *
   * @param userId - The ID of the user
   * @param task - The task to generate subtasks for
   * @param similarTasks - Similar completed tasks for context
   * @returns Array of proposed subtasks
   */
  async generateSubtasks(
    userId: string,
    task: { title: string; description?: string },
    similarTasks: SimilarTaskMatch[]
  ): Promise<ProposedSubtask[]> {
    const config = getFeatureProviderConfig('enrich')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    // Build context with similar task patterns
    const similarTaskContext =
      similarTasks.length > 0
        ? `

Similar completed tasks and their patterns:
${similarTasks.map((t) => `- "${t.title}": ${t.matchReasons.join(', ')}`).join('\n')}`
        : ''

    const userMessage = `Task to decompose:
Title: ${task.title}
Description: ${task.description ?? 'No description provided'}
${similarTaskContext}

Generate appropriate subtasks for this task.`

    const messages: ProviderMessage[] = [{ role: 'user', content: userMessage }]

    const response = await provider.chat({
      messages,
      systemPrompt: SUBTASK_GENERATION_PROMPT,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
    })

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'decompose',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Parse subtasks from response
    return this.parseSubtasksResponse(response.content)
  }

  // ==========================================================================
  // DURATION ESTIMATION
  // ==========================================================================

  /**
   * Estimates the duration of a task based on its details and historical data
   *
   * @param userId - The ID of the user
   * @param task - The task to estimate
   * @param subtasks - Proposed subtasks for the task
   * @param historicalData - Historical execution data from similar tasks
   * @returns Duration estimate with confidence level
   */
  async estimateDuration(
    userId: string,
    task: { title: string; description?: string },
    subtasks: ProposedSubtask[],
    historicalData: ExecutionData[]
  ): Promise<DurationEstimate> {
    const config = getFeatureProviderConfig('enrich')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    // Calculate subtask total as baseline
    const subtaskTotal = subtasks.reduce(
      (sum, s) => sum + (s.estimatedMinutes ?? 0),
      0
    )

    // Build historical context
    const historicalContext =
      historicalData.length > 0
        ? `

Historical data from similar tasks:
${historicalData
  .filter((h) => h.originalEstimatedMinutes && h.finalActualMinutes)
  .map(
    (h) =>
      `- Estimated: ${h.originalEstimatedMinutes}min, Actual: ${h.finalActualMinutes}min (Accuracy: ${((h.estimationAccuracyRatio ?? 1) * 100).toFixed(0)}%)`
  )
  .join('\n')}`
        : ''

    const userMessage = `Task to estimate:
Title: ${task.title}
Description: ${task.description ?? 'No description provided'}

Proposed subtasks (total: ${subtaskTotal} minutes):
${subtasks.map((s) => `- ${s.title}: ${s.estimatedMinutes ?? '?'}min`).join('\n')}
${historicalContext}

Provide a time estimate for completing this task.`

    const messages: ProviderMessage[] = [{ role: 'user', content: userMessage }]

    const response = await provider.chat({
      messages,
      systemPrompt: DURATION_ESTIMATION_PROMPT,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
    })

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'suggestions',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Parse duration response
    return this.parseDurationResponse(response.content, subtaskTotal)
  }

  // ==========================================================================
  // DUE DATE SUGGESTION
  // ==========================================================================

  /**
   * Suggests a due date based on estimated duration and priority
   *
   * @param userId - The ID of the user
   * @param estimatedMinutes - Estimated task duration in minutes
   * @param priority - Task priority level
   * @returns Suggested due date or null if not applicable
   */
  async suggestDueDate(
    userId: string,
    estimatedMinutes: number,
    priority?: string
  ): Promise<Date | null> {
    // Calculate working days needed (assuming 4 productive hours/day)
    const productiveMinutesPerDay = 240 // 4 hours
    const workingDaysNeeded = Math.ceil(
      estimatedMinutes / productiveMinutesPerDay
    )

    // Add buffer based on priority
    let bufferDays: number
    switch (priority) {
      case 'high':
        bufferDays = 1
        break
      case 'medium':
        bufferDays = 2
        break
      case 'low':
        bufferDays = 3
        break
      default:
        bufferDays = 2
    }

    // Calculate due date
    const now = new Date()
    const dueDate = new Date(now)

    // Add working days (skip weekends)
    let daysToAdd = workingDaysNeeded + bufferDays
    while (daysToAdd > 0) {
      dueDate.setDate(dueDate.getDate() + 1)
      const dayOfWeek = dueDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysToAdd--
      }
    }

    // Set to end of business day
    dueDate.setHours(17, 0, 0, 0)

    return dueDate
  }

  // ==========================================================================
  // APPLY ENRICHMENT
  // ==========================================================================

  /**
   * Applies accepted enrichment fields to a task
   *
   * @param userId - The ID of the user
   * @param taskId - The ID of the task to enrich
   * @param proposalId - The ID of the enrichment proposal
   * @param acceptedFields - Array of field names to accept
   * @param modifications - Optional user modifications to proposed values
   * @returns The updated task
   */
  async applyEnrichment(
    userId: string,
    taskId: string,
    proposalId: string,
    acceptedFields: string[],
    modifications?: Record<string, unknown>
  ): Promise<Task> {
    // Get the proposal
    const proposal = await this.getProposal(proposalId, userId)
    if (!proposal) {
      throw new Error('Enrichment proposal not found')
    }

    // Verify task ownership
    const existingTask = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!existingTask) {
      throw new Error('Task not found')
    }

    // Build update object based on accepted fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (acceptedFields.includes('title')) {
      updateData.title = modifications?.title ?? proposal.proposedTitle
    }

    if (acceptedFields.includes('description')) {
      updateData.description =
        modifications?.description ?? proposal.proposedDescription
    }

    if (acceptedFields.includes('dueDate') && proposal.proposedDueDate) {
      updateData.dueDate = modifications?.dueDate
        ? new Date(modifications.dueDate as string)
        : proposal.proposedDueDate
    }

    if (acceptedFields.includes('estimatedMinutes')) {
      updateData.estimatedMinutes =
        modifications?.estimatedMinutes ?? proposal.proposedEstimatedMinutes
    }

    if (acceptedFields.includes('priority')) {
      updateData.priority = modifications?.priority ?? proposal.proposedPriority
    }

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning()

    // Create subtasks if accepted
    if (
      acceptedFields.includes('subtasks') &&
      proposal.proposedSubtasks &&
      Array.isArray(proposal.proposedSubtasks)
    ) {
      const proposedSubtasks = proposal.proposedSubtasks as ProposedSubtask[]
      for (const subtask of proposedSubtasks) {
        await db.insert(tasks).values({
          userId,
          parentTaskId: taskId,
          title: subtask.title,
          estimatedMinutes: subtask.estimatedMinutes ?? null,
          sortOrder: subtask.suggestedOrder,
          status: 'pending',
          priority: 'none',
          projectId: updatedTask.projectId,
          metadata: {
            source: 'ai_suggested',
            subtaskType: subtask.type,
            aiCanDo: subtask.aiCanDo,
          },
        })
      }
    }

    // Update proposal status
    await db
      .update(taskEnrichmentProposals)
      .set({
        status: acceptedFields.length > 0 ? 'accepted' : 'rejected',
        acceptedFields,
        userModifications: modifications ?? null,
        respondedAt: new Date(),
      })
      .where(eq(taskEnrichmentProposals.id, proposalId))

    return updatedTask
  }

  // ==========================================================================
  // EXECUTION HISTORY
  // ==========================================================================

  /**
   * Records execution history when a task is completed
   * This data is used for learning and improving future estimates.
   *
   * @param userId - The ID of the user
   * @param taskId - The ID of the completed task
   */
  async recordExecutionHistory(userId: string, taskId: string): Promise<void> {
    // Get the completed task
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        eq(tasks.status, 'completed')
      ),
    })

    if (!task) {
      throw new Error('Completed task not found')
    }

    // Get subtasks
    const subtasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.parentTaskId, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    // Calculate metrics
    const estimationAccuracyRatio =
      task.estimatedMinutes && task.actualMinutes
        ? task.actualMinutes / task.estimatedMinutes
        : null

    const originalSubtaskCount = subtasks.filter(
      (s) =>
        s.metadata &&
        typeof s.metadata === 'object' &&
        'source' in s.metadata &&
        s.metadata.source === 'ai_suggested'
    ).length

    const addedSubtasks = subtasks.filter(
      (s) =>
        !s.metadata ||
        typeof s.metadata !== 'object' ||
        !('source' in s.metadata) ||
        s.metadata.source !== 'ai_suggested'
    )

    const daysOverdue =
      task.dueDate && task.completedAt
        ? Math.max(
            0,
            Math.floor(
              (task.completedAt.getTime() - task.dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0

    // Determine outcome
    let outcome:
      | 'completed'
      | 'completed_late'
      | 'abandoned'
      | 'delegated'
      | 'deferred'
    if (daysOverdue > 0) {
      outcome = 'completed_late'
    } else {
      outcome = 'completed'
    }

    // Extract keywords for fingerprint
    const keywordFingerprint = this.extractKeywords(
      `${task.title} ${task.description ?? ''}`
    )

    // Insert execution history
    await db.insert(taskExecutionHistory).values({
      taskId,
      userId,
      originalEstimatedMinutes: task.estimatedMinutes,
      finalActualMinutes: task.actualMinutes,
      estimationAccuracyRatio,
      originalSubtaskCount,
      subtasksAddedMidExecution: addedSubtasks.length,
      addedSubtaskTitles: addedSubtasks.map((s) => s.title),
      stallEvents: [],
      totalStallTimeMinutes: 0,
      outcome,
      completionDate: task.completedAt,
      daysOverdue,
      keywordFingerprint,
    })
  }

  // ==========================================================================
  // PROPOSAL MANAGEMENT
  // ==========================================================================

  /**
   * Gets an enrichment proposal by ID
   *
   * @param proposalId - The ID of the proposal
   * @param userId - The ID of the user (for authorization)
   * @returns The proposal or null if not found
   */
  async getProposal(
    proposalId: string,
    userId: string
  ): Promise<TaskEnrichmentProposal | null> {
    const proposal = await db.query.taskEnrichmentProposals.findFirst({
      where: and(
        eq(taskEnrichmentProposals.id, proposalId),
        eq(taskEnrichmentProposals.userId, userId)
      ),
    })

    return proposal ?? null
  }

  /**
   * Checks if a task has any accepted enrichment proposals
   *
   * @param taskId - The ID of the task to check
   * @param userId - The ID of the user (for authorization)
   * @returns True if the task has accepted enrichment proposals
   */
  async taskHasEnrichmentProposals(
    taskId: string,
    userId: string
  ): Promise<boolean> {
    const proposal = await db.query.taskEnrichmentProposals.findFirst({
      where: and(
        eq(taskEnrichmentProposals.taskId, taskId),
        eq(taskEnrichmentProposals.userId, userId),
        eq(taskEnrichmentProposals.status, 'accepted')
      ),
      columns: { id: true },
    })

    return proposal !== undefined
  }

  /**
   * Saves a new enrichment proposal for a task
   *
   * @param userId - The ID of the user
   * @param taskId - The ID of the task
   * @param proposal - The enrichment proposal to save
   * @returns The ID of the saved proposal
   */
  async saveProposal(
    userId: string,
    taskId: string,
    proposal: EnrichmentProposal,
    metadata?: {
      similarityAnalysis?: SimilarityAnalysis
      model?: string
      provider?: string
      inputTokens?: number
      outputTokens?: number
      processingTimeMs?: number
    }
  ): Promise<string> {
    const [saved] = await db
      .insert(taskEnrichmentProposals)
      .values({
        taskId,
        userId,
        proposedTitle: proposal.proposedTitle,
        proposedDescription: proposal.proposedDescription,
        proposedDueDate: proposal.proposedDueDate
          ? new Date(proposal.proposedDueDate)
          : null,
        proposedEstimatedMinutes: proposal.proposedEstimatedMinutes,
        proposedPriority: proposal.proposedPriority,
        proposedSubtasks: proposal.proposedSubtasks,
        similarityAnalysis: metadata?.similarityAnalysis,
        aiModel: metadata?.model,
        aiProvider: metadata?.provider,
        inputTokens: metadata?.inputTokens,
        outputTokens: metadata?.outputTokens,
        processingTimeMs: metadata?.processingTimeMs,
        status: 'pending',
      })
      .returning({ id: taskEnrichmentProposals.id })

    return saved.id
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Saves a proposal without associating it to a task yet
   * Used when enriching during task creation
   *
   * The proposal is cached temporarily and can be persisted via
   * saveProposal once the task is created.
   *
   * @param userId - The user ID
   * @param proposal - The enrichment proposal
   * @param similarityAnalysis - Analysis of similar tasks
   * @param metadata - AI call metadata
   * @returns A temporary proposal ID for later retrieval
   */
  private async saveProposalWithoutTask(
    userId: string,
    proposal: EnrichmentProposal,
    similarityAnalysis: SimilarityAnalysis,
    metadata: {
      model: string
      provider: string
      inputTokens: number
      outputTokens: number
      processingTimeMs: number
    }
  ): Promise<string> {
    // Clean up expired cache entries
    this.cleanupExpiredCache()

    // Generate a unique ID for this proposal
    const proposalId = crypto.randomUUID()

    // Cache the proposal data for later persistence
    this.proposalCache.set(proposalId, {
      proposal,
      similarityAnalysis,
      metadata,
      userId,
      createdAt: new Date(),
    })

    return proposalId
  }

  /**
   * Retrieves a cached proposal by ID
   *
   * @param proposalId - The temporary proposal ID
   * @returns The cached proposal data or null if not found/expired
   */
  getCachedProposal(proposalId: string): CachedProposal | null {
    const cached = this.proposalCache.get(proposalId)
    if (!cached) {
      return null
    }

    // Check if expired
    if (Date.now() - cached.createdAt.getTime() > this.CACHE_TTL_MS) {
      this.proposalCache.delete(proposalId)
      return null
    }

    return cached
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()
    for (const [id, cached] of this.proposalCache.entries()) {
      if (now - cached.createdAt.getTime() > this.CACHE_TTL_MS) {
        this.proposalCache.delete(id)
      }
    }
  }

  /**
   * Finds similar completed tasks for a user
   */
  private async findSimilarTasks(
    userId: string,
    title: string,
    description?: string,
    limit: number = 5
  ): Promise<SimilarTaskMatch[]> {
    // Extract keywords from the new task
    const keywords = this.extractKeywords(`${title} ${description ?? ''}`)

    if (keywords.length === 0) {
      return []
    }

    // Build keyword search conditions
    const searchConditions = keywords.flatMap((kw) => [
      ilike(tasks.title, `%${kw}%`),
      ilike(tasks.description, `%${kw}%`),
    ])

    // Query completed tasks with keyword matches
    const candidates = await db.query.tasks.findMany({
      where: and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'completed'),
        isNull(tasks.deletedAt),
        or(...searchConditions)
      ),
      orderBy: [desc(tasks.completedAt)],
      limit: limit * 2, // Get more candidates for filtering
    })

    // Score and filter candidates
    const scoredTasks: SimilarTaskMatch[] = candidates.map((task) => {
      const taskText = `${task.title} ${task.description ?? ''}`.toLowerCase()
      const matchedKeywords = keywords.filter((kw) =>
        taskText.includes(kw.toLowerCase())
      )

      const score = (matchedKeywords.length / keywords.length) * 100

      return {
        taskId: task.id,
        title: task.title,
        similarityScore: Math.round(score),
        matchReasons: matchedKeywords.map((kw) => `Contains "${kw}"`),
        executionInsights: {
          estimatedVsActual:
            task.estimatedMinutes && task.actualMinutes
              ? task.actualMinutes / task.estimatedMinutes
              : undefined,
          subtasksAdded: 0, // Would need to query subtasks
          stallPoints: [],
          outcome: 'completed',
        },
      }
    })

    // Return top matches
    return scoredTasks
      .filter((t) => t.similarityScore > 20)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)
  }

  /**
   * Gets historical execution data for similar tasks
   */
  private async getHistoricalData(
    userId: string,
    similarTasks: SimilarTaskMatch[]
  ): Promise<ExecutionData[]> {
    if (similarTasks.length === 0) {
      return []
    }

    const taskIds = similarTasks.map((t) => t.taskId)

    const history = await db.query.taskExecutionHistory.findMany({
      where: and(
        eq(taskExecutionHistory.userId, userId),
        or(...taskIds.map((id) => eq(taskExecutionHistory.taskId, id)))
      ),
      limit: 10,
    })

    return history.map((h) => ({
      originalEstimatedMinutes: h.originalEstimatedMinutes,
      finalActualMinutes: h.finalActualMinutes,
      estimationAccuracyRatio: h.estimationAccuracyRatio,
      subtasksAddedMidExecution: h.subtasksAddedMidExecution,
      outcome: h.outcome,
    }))
  }

  /**
   * Builds the enrichment context prompt
   */
  private buildEnrichmentContext(
    input: EnrichmentInput,
    similarTasks: SimilarTaskMatch[],
    historicalData: ExecutionData[]
  ): string {
    let context = `Task to enrich:
Title: ${input.title}
Description: ${input.description ?? 'No description provided'}
Project ID: ${input.projectId ?? 'None'}
Existing Tags: ${input.existingTags?.join(', ') ?? 'None'}`

    if (similarTasks.length > 0) {
      context += `

Similar completed tasks:
${similarTasks.map((t) => `- "${t.title}" (${t.similarityScore}% match)`).join('\n')}`
    }

    if (historicalData.length > 0) {
      const avgAccuracy =
        historicalData
          .filter((h) => h.estimationAccuracyRatio)
          .reduce((sum, h) => sum + (h.estimationAccuracyRatio ?? 0), 0) /
        historicalData.filter((h) => h.estimationAccuracyRatio).length

      context += `

Historical insights:
- Average estimation accuracy: ${(avgAccuracy * 100).toFixed(0)}%
- Tasks with added subtasks: ${historicalData.filter((h) => (h.subtasksAddedMidExecution ?? 0) > 0).length}/${historicalData.length}`
    }

    context += `

Provide enrichment suggestions in the specified JSON format.`

    return context
  }

  /**
   * Parses the AI enrichment response
   */
  private parseEnrichmentResponse(content: string): {
    refinedTitle: string
    description: string
    estimatedMinutes: number
    suggestedDueDate: string | null
    priority: string
    subtasks: ProposedSubtask[]
    insights: {
      estimationConfidence: ConfidenceLevel
      riskFactors: string[]
      keyAssumptions: string[]
    }
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        refinedTitle: parsed.refinedTitle ?? '',
        description: parsed.description ?? '',
        estimatedMinutes: parsed.estimatedMinutes ?? 60,
        suggestedDueDate: parsed.suggestedDueDate ?? null,
        priority: parsed.priority ?? 'none',
        subtasks: (parsed.subtasks ?? []).map(
          (s: Record<string, unknown>, i: number) => ({
            title: s.title ?? '',
            estimatedMinutes: s.estimatedMinutes ?? 15,
            type: s.type ?? 'action',
            aiCanDo: s.aiCanDo ?? false,
            suggestedOrder: s.suggestedOrder ?? i,
          })
        ),
        insights: {
          estimationConfidence:
            parsed.insights?.estimationConfidence ?? 'medium',
          riskFactors: parsed.insights?.riskFactors ?? [],
          keyAssumptions: parsed.insights?.keyAssumptions ?? [],
        },
      }
    } catch {
      // Return defaults on parse error
      return {
        refinedTitle: '',
        description: '',
        estimatedMinutes: 60,
        suggestedDueDate: null,
        priority: 'none',
        subtasks: [],
        insights: {
          estimationConfidence: 'low',
          riskFactors: ['Could not parse AI response'],
          keyAssumptions: [],
        },
      }
    }
  }

  /**
   * Parses subtask generation response
   */
  private parseSubtasksResponse(content: string): ProposedSubtask[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return parsed.map((s: Record<string, unknown>, i: number) => ({
        title: s.title ?? '',
        estimatedMinutes: s.estimatedMinutes ?? 15,
        type: s.type ?? 'action',
        aiCanDo: s.aiCanDo ?? false,
        suggestedOrder: s.suggestedOrder ?? i,
      }))
    } catch {
      return []
    }
  }

  /**
   * Parses duration estimation response
   */
  private parseDurationResponse(
    content: string,
    fallbackMinutes: number
  ): DurationEstimate {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        minutes: parsed.minutes ?? fallbackMinutes,
        confidence: parsed.confidence ?? 'medium',
      }
    } catch {
      return {
        minutes: fallbackMinutes,
        confidence: 'low',
      }
    }
  }

  /**
   * Extracts keywords from text for similarity matching
   */
  private extractKeywords(text: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'i',
      'me',
      'my',
      'myself',
      'we',
      'our',
      'ours',
      'ourselves',
      'you',
      'your',
      'yours',
      'yourself',
      'yourselves',
      'he',
      'him',
      'his',
      'himself',
      'she',
      'her',
      'hers',
      'herself',
      'it',
      'its',
      'itself',
      'they',
      'them',
      'their',
      'theirs',
      'themselves',
      'what',
      'which',
      'who',
      'whom',
      'this',
      'that',
      'these',
      'those',
      'am',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'having',
      'do',
      'does',
      'did',
      'doing',
      'a',
      'an',
      'the',
      'and',
      'but',
      'if',
      'or',
      'because',
      'as',
      'until',
      'while',
    ])

    // Split text and filter
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 10) // Limit to top 10 keywords
  }

  /**
   * Aggregates insights from similar tasks
   */
  private aggregateInsights(
    similarTasks: SimilarTaskMatch[]
  ): SimilarityAnalysis['aggregatedInsights'] {
    if (similarTasks.length === 0) {
      return {
        avgEstimationAccuracy: 1,
        commonSubtasksAdded: [],
        commonStallPoints: [],
        successRate: 100,
      }
    }

    const accuracies = similarTasks
      .map((t) => t.executionInsights.estimatedVsActual)
      .filter((a): a is number => a !== undefined)

    const avgAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
        : 1

    const successCount = similarTasks.filter(
      (t) => t.executionInsights.outcome === 'completed'
    ).length

    return {
      avgEstimationAccuracy: avgAccuracy,
      commonSubtasksAdded: [],
      commonStallPoints: [],
      successRate: (successCount / similarTasks.length) * 100,
    }
  }

  /**
   * Calculates success prediction based on similar tasks and confidence
   */
  private calculateSuccessPrediction(
    similarTasks: SimilarTaskMatch[],
    confidence: ConfidenceLevel
  ): number {
    if (similarTasks.length === 0) {
      // Base prediction on confidence alone
      switch (confidence) {
        case 'high':
          return 80
        case 'medium':
          return 65
        case 'low':
          return 50
      }
    }

    const insights = this.aggregateInsights(similarTasks)
    let prediction = insights.successRate

    // Adjust based on confidence
    switch (confidence) {
      case 'high':
        prediction = Math.min(prediction + 10, 95)
        break
      case 'low':
        prediction = Math.max(prediction - 15, 30)
        break
    }

    return Math.round(prediction)
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const taskEnrichmentService = new TaskEnrichmentService()
