/**
 * AI Work Service
 * Handles AI-powered work generation for tasks (research, drafting, planning)
 */

import { db } from '@/lib/db'
import { aiWorkArtifacts, tasks } from '@/lib/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { providerRegistry } from '@/lib/ai/providers'
import { getFeatureProviderConfig } from '@/lib/ai/config'
import { aiUsageService } from './ai-usage.service'
import type {
  AIWorkType,
  SubtaskType,
  ArtifactStatus,
  AIWorkArtifact,
} from '@/types/ai'

// ============================================================================
// TYPES
// ============================================================================

interface TaskContext {
  title: string
  description?: string | null
}

interface WorkArtifactInput {
  taskId: string
  subtaskId?: string
  type: AIWorkType
  title: string
  content: string
  aiModel?: string
  aiProvider?: string
  promptUsed?: string
}

// ============================================================================
// PROMPTS
// ============================================================================

const RESEARCH_WORK_PROMPT = `You are a research assistant helping a user gather information for a task. Your goal is to provide comprehensive, well-organized research that directly supports task completion.

## Research Guidelines
1. Focus on actionable information relevant to the specific task
2. Organize findings in clear sections with headings
3. Include specific facts, statistics, or data points when relevant
4. Note important considerations or potential pitfalls
5. Suggest concrete next steps based on the research

## Response Format
Structure your research as follows:

### Overview
Brief summary of the research topic and key findings (2-3 sentences)

### Key Findings
- Main point 1 with supporting details
- Main point 2 with supporting details
- Main point 3 with supporting details

### Important Considerations
- Factors to keep in mind
- Potential challenges or risks
- Dependencies or prerequisites

### Recommended Next Steps
1. Specific action to take based on research
2. Additional research or verification needed
3. Resources for further exploration

Be thorough but focused. Prioritize quality over quantity.`

const DRAFT_EMAIL_PROMPT = `You are a professional writing assistant helping draft an email. Create a clear, professional email that accomplishes the user's goal.

## Email Guidelines
1. Use appropriate greeting and sign-off based on context
2. Get to the point quickly - busy recipients appreciate brevity
3. Include a clear call-to-action when appropriate
4. Maintain professional tone unless otherwise specified
5. Structure longer emails with clear paragraphs or bullet points

## Response Format
Provide the complete email draft ready for review:

Subject: [Clear, descriptive subject line]

[Greeting],

[Body paragraphs]

[Sign-off],
[Name placeholder]

---
Notes: [Any suggestions for customization or additional context needed]`

const DRAFT_DOCUMENT_PROMPT = `You are a professional writing assistant helping draft a document. Create a well-structured, comprehensive document that meets the user's needs.

## Document Guidelines
1. Use clear headings and structure
2. Be thorough but avoid unnecessary filler
3. Use bullet points for scannable sections
4. Include relevant details and context
5. Maintain consistent tone throughout

## Response Format
Provide a complete document draft with:

# [Document Title]

## Executive Summary / Introduction
[Brief overview of purpose and key points]

## [Main Section 1]
[Content with supporting details]

## [Main Section 2]
[Content with supporting details]

## [Additional Sections as Needed]

## Conclusion / Next Steps
[Summary and recommended actions]

---
Notes: [Suggestions for customization or areas needing more input]`

const DRAFT_OUTLINE_PROMPT = `You are a planning assistant helping create an outline. Create a clear, hierarchical outline that organizes ideas effectively.

## Outline Guidelines
1. Use clear hierarchical structure (I, A, 1, a)
2. Keep items concise but descriptive
3. Ensure logical flow between sections
4. Include enough detail to guide full development
5. Note areas that need more research or input

## Response Format
Provide a complete outline:

# [Title/Topic]

I. [Major Section 1]
   A. [Subsection 1.1]
      1. [Detail point]
      2. [Detail point]
   B. [Subsection 1.2]
      1. [Detail point]

II. [Major Section 2]
   A. [Subsection 2.1]
   B. [Subsection 2.2]

[Continue as needed]

---
Notes: [Areas needing more detail or research]`

const DRAFT_GENERAL_PROMPT = `You are a writing assistant helping create content. Create well-written content that meets the user's needs.

## Writing Guidelines
1. Match the appropriate tone and format for the content type
2. Be clear and well-organized
3. Use appropriate structure (paragraphs, bullets, headings)
4. Focus on clarity and actionability
5. Proofread for grammar and flow

## Response Format
Provide the complete content draft with appropriate formatting.

---
Notes: [Suggestions for customization]`

const PLAN_WORK_PROMPT = `You are a planning assistant helping create an actionable plan for completing a task or subtask. Create a detailed, step-by-step plan that guides successful completion.

## Planning Guidelines
1. Break down work into clear, manageable steps
2. Include time estimates where appropriate
3. Identify dependencies and prerequisites
4. Note potential blockers and mitigation strategies
5. Include checkpoints or milestones for tracking progress

## Response Format
Provide a comprehensive plan:

### Goal
[Clear statement of what this plan accomplishes]

### Prerequisites
- [What needs to be in place before starting]
- [Required resources, access, or information]

### Step-by-Step Plan

**Step 1: [Action]** (Estimated time: X minutes/hours)
- Details and considerations
- Expected outcome

**Step 2: [Action]** (Estimated time: X minutes/hours)
- Details and considerations
- Expected outcome

[Continue for all steps]

### Potential Blockers
- [Risk 1]: Mitigation strategy
- [Risk 2]: Mitigation strategy

### Success Criteria
- [How to know the task is complete]
- [Quality checks]

### Timeline
[Overall estimated time and suggested scheduling]`

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AIWorkService {
  /**
   * Subtask types that AI can perform work for
   */
  private readonly WORKABLE_SUBTASK_TYPES: SubtaskType[] = [
    'research',
    'draft',
    'plan',
  ]

  /**
   * Check if AI can do work for a given subtask type
   */
  canDoWork(subtaskType: string): boolean {
    return this.WORKABLE_SUBTASK_TYPES.includes(subtaskType as SubtaskType)
  }

  /**
   * Main method to perform work on a subtask
   */
  async doWork(
    userId: string,
    taskId: string,
    subtaskId: string,
    workType: AIWorkType,
    context?: string
  ): Promise<AIWorkArtifact> {
    // Get task and subtask context
    const task = await this.getTaskContext(userId, taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const subtask = await this.getTaskContext(userId, subtaskId)
    if (!subtask) {
      throw new Error('Subtask not found')
    }

    const taskContext: TaskContext = {
      title: task.title,
      description: task.description,
    }

    // Route to appropriate work method
    let artifact: AIWorkArtifact
    switch (workType) {
      case 'research':
        artifact = await this.doResearch(
          userId,
          taskId,
          subtaskId,
          taskContext,
          subtask.title,
          context
        )
        break
      case 'draft':
        // Determine draft type from subtask title/description
        const draftType = this.inferDraftType(
          subtask.title,
          subtask.description
        )
        artifact = await this.doDraft(
          userId,
          taskId,
          subtaskId,
          taskContext,
          subtask.title,
          draftType,
          context
        )
        break
      case 'plan':
        artifact = await this.doPlan(
          userId,
          taskId,
          subtaskId,
          taskContext,
          subtask.title,
          context
        )
        break
      case 'outline':
        artifact = await this.doDraft(
          userId,
          taskId,
          subtaskId,
          taskContext,
          subtask.title,
          'outline',
          context
        )
        break
      default:
        throw new Error(`Unsupported work type: ${workType}`)
    }

    return artifact
  }

  /**
   * Perform research for a subtask
   */
  async doResearch(
    userId: string,
    taskId: string,
    subtaskId: string,
    taskContext: TaskContext,
    subtaskTitle: string,
    additionalContext?: string
  ): Promise<AIWorkArtifact> {
    const config = getFeatureProviderConfig('research')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    const userMessage = this.buildResearchMessage(
      taskContext,
      subtaskTitle,
      additionalContext
    )

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt: RESEARCH_WORK_PROMPT,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'research',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Save artifact
    const artifact = await this.saveArtifact(userId, taskId, subtaskId, {
      taskId,
      subtaskId,
      type: 'research',
      title: `Research: ${subtaskTitle}`,
      content: response.content,
      aiModel: response.model,
      aiProvider: response.provider,
      promptUsed: userMessage,
    })

    return artifact
  }

  /**
   * Draft content for a subtask
   */
  async doDraft(
    userId: string,
    taskId: string,
    subtaskId: string,
    taskContext: TaskContext,
    subtaskTitle: string,
    draftType: 'email' | 'document' | 'outline' | 'general',
    additionalContext?: string
  ): Promise<AIWorkArtifact> {
    const config = getFeatureProviderConfig('draft')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    const systemPrompt = this.getDraftPrompt(draftType)
    const userMessage = this.buildDraftMessage(
      taskContext,
      subtaskTitle,
      draftType,
      additionalContext
    )

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'draft',
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Determine artifact type based on draft type
    const artifactType: AIWorkType =
      draftType === 'outline' ? 'outline' : 'draft'

    // Save artifact
    const artifact = await this.saveArtifact(userId, taskId, subtaskId, {
      taskId,
      subtaskId,
      type: artifactType,
      title: `${draftType.charAt(0).toUpperCase() + draftType.slice(1)}: ${subtaskTitle}`,
      content: response.content,
      aiModel: response.model,
      aiProvider: response.provider,
      promptUsed: userMessage,
    })

    return artifact
  }

  /**
   * Create a plan for a subtask
   */
  async doPlan(
    userId: string,
    taskId: string,
    subtaskId: string,
    taskContext: TaskContext,
    subtaskTitle: string,
    additionalContext?: string
  ): Promise<AIWorkArtifact> {
    const config = getFeatureProviderConfig('research') // Use research config for planning
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    const userMessage = this.buildPlanMessage(
      taskContext,
      subtaskTitle,
      additionalContext
    )

    const response = await provider.chat({
      messages: [{ role: 'user', content: userMessage }],
      systemPrompt: PLAN_WORK_PROMPT,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      userId,
      taskId,
    })

    // Track usage
    await aiUsageService.trackUsage(
      userId,
      response.provider,
      response.model,
      'research', // Track under research for now
      response.usage.inputTokens,
      response.usage.outputTokens
    )

    // Save artifact
    const artifact = await this.saveArtifact(userId, taskId, subtaskId, {
      taskId,
      subtaskId,
      type: 'plan',
      title: `Plan: ${subtaskTitle}`,
      content: response.content,
      aiModel: response.model,
      aiProvider: response.provider,
      promptUsed: userMessage,
    })

    return artifact
  }

  /**
   * Save a work artifact to the database
   */
  async saveArtifact(
    userId: string,
    taskId: string,
    subtaskId: string | undefined,
    artifact: WorkArtifactInput
  ): Promise<AIWorkArtifact> {
    const [saved] = await db
      .insert(aiWorkArtifacts)
      .values({
        userId,
        taskId: artifact.taskId,
        subtaskId: artifact.subtaskId ?? null,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
        status: 'generated',
        aiModel: artifact.aiModel ?? null,
        aiProvider: artifact.aiProvider ?? null,
        promptUsed: artifact.promptUsed ?? null,
      })
      .returning()

    return this.mapToAIWorkArtifact(saved)
  }

  /**
   * Get artifacts for a task
   */
  async getArtifacts(
    taskId: string,
    userId: string
  ): Promise<AIWorkArtifact[]> {
    const artifacts = await db.query.aiWorkArtifacts.findMany({
      where: and(
        eq(aiWorkArtifacts.taskId, taskId),
        eq(aiWorkArtifacts.userId, userId)
      ),
      orderBy: [desc(aiWorkArtifacts.createdAt)],
    })

    return artifacts.map(this.mapToAIWorkArtifact)
  }

  /**
   * Get a single artifact by ID
   */
  async getArtifact(
    artifactId: string,
    userId: string
  ): Promise<AIWorkArtifact | null> {
    const artifact = await db.query.aiWorkArtifacts.findFirst({
      where: and(
        eq(aiWorkArtifacts.id, artifactId),
        eq(aiWorkArtifacts.userId, userId)
      ),
    })

    return artifact ? this.mapToAIWorkArtifact(artifact) : null
  }

  /**
   * Update artifact status with optional feedback
   */
  async updateArtifactStatus(
    artifactId: string,
    userId: string,
    status: ArtifactStatus,
    feedback?: { rating?: number; text?: string }
  ): Promise<AIWorkArtifact> {
    // Verify ownership
    const existing = await db.query.aiWorkArtifacts.findFirst({
      where: and(
        eq(aiWorkArtifacts.id, artifactId),
        eq(aiWorkArtifacts.userId, userId)
      ),
    })

    if (!existing) {
      throw new Error('Artifact not found')
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    }

    if (feedback?.rating !== undefined) {
      updateData.userRating = feedback.rating
    }
    if (feedback?.text !== undefined) {
      updateData.userFeedback = feedback.text
    }

    const [updated] = await db
      .update(aiWorkArtifacts)
      .set(updateData)
      .where(eq(aiWorkArtifacts.id, artifactId))
      .returning()

    return this.mapToAIWorkArtifact(updated)
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get task context for AI operations
   */
  private async getTaskContext(
    userId: string,
    taskId: string
  ): Promise<{ title: string; description: string | null } | null> {
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      ),
    })

    if (!task) {
      return null
    }

    return {
      title: task.title,
      description: task.description,
    }
  }

  /**
   * Infer draft type from subtask title and description
   */
  private inferDraftType(
    title: string,
    description?: string | null
  ): 'email' | 'document' | 'outline' | 'general' {
    const combined = `${title} ${description ?? ''}`.toLowerCase()

    if (
      combined.includes('email') ||
      combined.includes('mail') ||
      combined.includes('message to') ||
      combined.includes('respond to')
    ) {
      return 'email'
    }

    if (
      combined.includes('outline') ||
      combined.includes('structure') ||
      combined.includes('organize')
    ) {
      return 'outline'
    }

    if (
      combined.includes('document') ||
      combined.includes('report') ||
      combined.includes('proposal') ||
      combined.includes('memo') ||
      combined.includes('brief')
    ) {
      return 'document'
    }

    return 'general'
  }

  /**
   * Get the appropriate draft prompt based on type
   */
  private getDraftPrompt(
    draftType: 'email' | 'document' | 'outline' | 'general'
  ): string {
    switch (draftType) {
      case 'email':
        return DRAFT_EMAIL_PROMPT
      case 'document':
        return DRAFT_DOCUMENT_PROMPT
      case 'outline':
        return DRAFT_OUTLINE_PROMPT
      default:
        return DRAFT_GENERAL_PROMPT
    }
  }

  /**
   * Build the user message for research
   */
  private buildResearchMessage(
    taskContext: TaskContext,
    subtaskTitle: string,
    additionalContext?: string
  ): string {
    let message = `## Parent Task
Title: ${taskContext.title}
Description: ${taskContext.description ?? 'None provided'}

## Research Request
${subtaskTitle}`

    if (additionalContext) {
      message += `

## Additional Context
${additionalContext}`
    }

    message += `

Please conduct thorough research to help complete this subtask. Focus on actionable information that directly supports task completion.`

    return message
  }

  /**
   * Build the user message for drafting
   */
  private buildDraftMessage(
    taskContext: TaskContext,
    subtaskTitle: string,
    draftType: 'email' | 'document' | 'outline' | 'general',
    additionalContext?: string
  ): string {
    let message = `## Parent Task
Title: ${taskContext.title}
Description: ${taskContext.description ?? 'None provided'}

## Draft Request
Type: ${draftType}
Subject/Topic: ${subtaskTitle}`

    if (additionalContext) {
      message += `

## Additional Instructions
${additionalContext}`
    }

    message += `

Please create a ${draftType} draft that addresses this request. Make it ready for review with appropriate formatting and structure.`

    return message
  }

  /**
   * Build the user message for planning
   */
  private buildPlanMessage(
    taskContext: TaskContext,
    subtaskTitle: string,
    additionalContext?: string
  ): string {
    let message = `## Parent Task
Title: ${taskContext.title}
Description: ${taskContext.description ?? 'None provided'}

## Planning Request
${subtaskTitle}`

    if (additionalContext) {
      message += `

## Additional Context
${additionalContext}`
    }

    message += `

Please create a detailed, actionable plan for completing this subtask. Include specific steps, time estimates, and potential blockers.`

    return message
  }

  /**
   * Map database artifact to AIWorkArtifact type
   */
  private mapToAIWorkArtifact(
    artifact: typeof aiWorkArtifacts.$inferSelect
  ): AIWorkArtifact {
    return {
      id: artifact.id,
      taskId: artifact.taskId,
      subtaskId: artifact.subtaskId ?? undefined,
      userId: artifact.userId,
      type: artifact.type as AIWorkType,
      title: artifact.title,
      content: artifact.content,
      status: artifact.status as ArtifactStatus,
      aiModel: artifact.aiModel ?? undefined,
      aiProvider: artifact.aiProvider ?? undefined,
      promptUsed: artifact.promptUsed ?? undefined,
      userRating: artifact.userRating ?? undefined,
      userFeedback: artifact.userFeedback ?? undefined,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    }
  }
}

export const aiWorkService = new AIWorkService()
