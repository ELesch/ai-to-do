/**
 * Similar Task Matcher Service
 * Implements hybrid keyword + AI analysis approach for finding similar completed tasks
 */

import { db } from '@/lib/db'
import { tasks, taskExecutionHistory } from '@/lib/db/schema'
import { eq, and, or, ilike, isNull, desc } from 'drizzle-orm'
import { providerRegistry, type ProviderMessage } from '@/lib/ai/providers'
import { getFeatureProviderConfig } from '@/lib/ai/config'
import { aiUsageService } from './ai-usage.service'
import type {
  SimilarTaskMatch,
  ExecutionInsights,
  SimilarityAnalysis,
  AggregatedInsights,
} from '@/types/ai'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Task with execution history data for similarity matching
 */
export interface TaskWithHistory {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  estimatedMinutes: number | null
  actualMinutes: number | null
  completedAt: Date | null
  executionHistory?: {
    originalEstimatedMinutes: number | null
    finalActualMinutes: number | null
    estimationAccuracyRatio: number | null
    subtasksAddedMidExecution: number | null
    addedSubtaskTitles: string[] | null
    stallEvents: StallEventData[] | null
    outcome: string
    taskCategory: string | null
    keywordFingerprint: string[] | null
  } | null
}

/**
 * Stall event data from execution history
 */
interface StallEventData {
  startTime: string
  endTime: string
  durationMinutes: number
  reason?: string
  subtaskId?: string
}

/**
 * AI similarity analysis result
 */
interface AISimilarityResult {
  matches: Array<{
    index: number
    score: number
    reasons: string[]
  }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Common English stop words to filter out during keyword extraction
 */
const STOP_WORDS = new Set([
  // Articles
  'a',
  'an',
  'the',
  // Pronouns
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
  // Prepositions
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  // Conjunctions
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  // Auxiliary verbs
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
  'would',
  'should',
  'could',
  'ought',
  'will',
  'shall',
  'can',
  'may',
  'might',
  'must',
  // Common task-related words that are too generic
  'task',
  'tasks',
  'todo',
  'item',
  'items',
  'work',
  'need',
  'needs',
  'make',
  'get',
  'got',
  'go',
  'going',
  'went',
  'thing',
  'things',
  'some',
  'any',
  'all',
  'each',
  'every',
  'more',
  'most',
  'other',
  'such',
  'no',
  'just',
  'also',
])

/**
 * Minimum keyword length to consider
 */
const MIN_KEYWORD_LENGTH = 3

/**
 * Default limit for keyword filter phase
 */
const DEFAULT_KEYWORD_FILTER_LIMIT = 20

/**
 * Default limit for final results
 */
const DEFAULT_RESULT_LIMIT = 5

// ============================================================================
// SERVICE CLASS
// ============================================================================

class SimilarTaskMatcherService {
  // ============================================================================
  // MAIN PUBLIC METHOD
  // ============================================================================

  /**
   * Find similar completed tasks using hybrid keyword + AI analysis approach
   * This is the main entry point that combines both phases
   */
  async findSimilarTasks(
    userId: string,
    title: string,
    description?: string,
    limit: number = DEFAULT_RESULT_LIMIT
  ): Promise<SimilarityAnalysis> {
    try {
      // Phase 1: Fast keyword filtering (database-side)
      const candidates = await this.keywordFilter(
        userId,
        title,
        description,
        DEFAULT_KEYWORD_FILTER_LIMIT
      )

      if (candidates.length === 0) {
        return this.createEmptyAnalysis()
      }

      // Phase 2: AI-based semantic analysis on filtered candidates
      const matches = await this.aiAnalyzeSimilarity(
        userId,
        { title, description },
        candidates
      )

      // Sort by score and take top results
      const topMatches = matches
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit)

      // Build aggregated insights from top matches
      const aggregatedInsights = this.buildAggregatedInsights(topMatches)

      return {
        matchedTasks: topMatches,
        aggregatedInsights,
      }
    } catch (error) {
      console.error(
        '[SimilarTaskMatcherService.findSimilarTasks] Error:',
        error
      )
      // Return empty analysis on error to avoid breaking the enrichment flow
      return this.createEmptyAnalysis()
    }
  }

  // ============================================================================
  // PHASE 1: KEYWORD FILTERING
  // ============================================================================

  /**
   * Phase 1: Fast keyword filtering using database ilike queries
   * Finds completed tasks that share keywords with the new task
   */
  async keywordFilter(
    userId: string,
    title: string,
    description?: string,
    limit: number = DEFAULT_KEYWORD_FILTER_LIMIT
  ): Promise<TaskWithHistory[]> {
    // Extract keywords from title and description
    const text = `${title} ${description ?? ''}`
    const keywords = this.extractKeywords(text)

    if (keywords.length === 0) {
      return []
    }

    // Build OR conditions for keyword matching
    const keywordConditions = keywords.flatMap((kw) => [
      ilike(tasks.title, `%${kw}%`),
      ilike(tasks.description, `%${kw}%`),
    ])

    // Query completed tasks matching any keywords
    const matchingTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        estimatedMinutes: tasks.estimatedMinutes,
        actualMinutes: tasks.actualMinutes,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'completed'),
          isNull(tasks.deletedAt),
          or(...keywordConditions)
        )
      )
      .orderBy(desc(tasks.completedAt))
      .limit(limit)

    // Fetch execution history for matching tasks
    const tasksWithHistory = await Promise.all(
      matchingTasks.map(async (task) => {
        const history = await this.getExecutionHistory(task.id)
        return {
          ...task,
          executionHistory: history,
        } as TaskWithHistory
      })
    )

    return tasksWithHistory
  }

  // ============================================================================
  // PHASE 2: AI SIMILARITY ANALYSIS
  // ============================================================================

  /**
   * Phase 2: AI-based semantic analysis on filtered candidates
   * Uses AI to score similarity based on task type, domain, complexity, etc.
   */
  async aiAnalyzeSimilarity(
    userId: string,
    newTask: { title: string; description?: string },
    candidates: TaskWithHistory[]
  ): Promise<SimilarTaskMatch[]> {
    if (candidates.length === 0) {
      return []
    }

    // Get provider configuration for analysis (using research config for complex reasoning)
    const config = getFeatureProviderConfig('research')
    const provider =
      providerRegistry.get(config.provider) ?? providerRegistry.getDefault()

    // Build the analysis prompt
    const prompt = this.buildSimilarityPrompt(newTask, candidates)

    try {
      const response = await provider.chat({
        messages: [{ role: 'user', content: prompt }] as ProviderMessage[],
        systemPrompt: this.getSimilaritySystemPrompt(),
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
        'research',
        response.usage.inputTokens,
        response.usage.outputTokens
      )

      // Parse the AI response
      const analysisResult = this.parseAIResponse(response.content)

      // Map results back to SimilarTaskMatch format
      return this.mapAnalysisToMatches(candidates, analysisResult)
    } catch (error) {
      console.error(
        '[SimilarTaskMatcherService.aiAnalyzeSimilarity] Error:',
        error
      )
      // Return basic matches without AI scoring on error
      return this.createBasicMatches(candidates)
    }
  }

  // ============================================================================
  // KEYWORD EXTRACTION
  // ============================================================================

  /**
   * Extract meaningful keywords from task text
   * Filters out stop words and short words
   */
  extractKeywords(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return []
    }

    // Normalize text: lowercase and split on non-alphanumeric characters
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= MIN_KEYWORD_LENGTH)

    // Filter out stop words and deduplicate
    const keywords = [...new Set(words.filter((word) => !STOP_WORDS.has(word)))]

    // Return up to 10 most significant keywords
    return keywords.slice(0, 10)
  }

  // ============================================================================
  // EXECUTION HISTORY
  // ============================================================================

  /**
   * Get execution history for a specific task
   */
  async getExecutionHistory(
    taskId: string
  ): Promise<TaskWithHistory['executionHistory']> {
    try {
      const history = await db.query.taskExecutionHistory.findFirst({
        where: eq(taskExecutionHistory.taskId, taskId),
      })

      if (!history) {
        return null
      }

      return {
        originalEstimatedMinutes: history.originalEstimatedMinutes,
        finalActualMinutes: history.finalActualMinutes,
        estimationAccuracyRatio: history.estimationAccuracyRatio,
        subtasksAddedMidExecution: history.subtasksAddedMidExecution,
        addedSubtaskTitles: history.addedSubtaskTitles,
        stallEvents: history.stallEvents as StallEventData[] | null,
        outcome: history.outcome,
        taskCategory: history.taskCategory,
        keywordFingerprint: history.keywordFingerprint,
      }
    } catch (error) {
      console.error(
        '[SimilarTaskMatcherService.getExecutionHistory] Error:',
        error
      )
      return null
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build the similarity analysis prompt for the AI
   */
  private buildSimilarityPrompt(
    newTask: { title: string; description?: string },
    candidates: TaskWithHistory[]
  ): string {
    const candidatesList = candidates
      .map((task, index) => {
        const historyInfo = task.executionHistory
          ? `
    - Estimated: ${task.executionHistory.originalEstimatedMinutes ?? 'N/A'} mins, Actual: ${task.executionHistory.finalActualMinutes ?? 'N/A'} mins
    - Subtasks added during execution: ${task.executionHistory.subtasksAddedMidExecution ?? 0}
    - Outcome: ${task.executionHistory.outcome ?? 'completed'}`
          : ''

        return `[${index}] Title: "${task.title}"
    Description: ${task.description ?? 'No description'}${historyInfo}`
      })
      .join('\n\n')

    return `Analyze the similarity between the new task and these completed tasks.
Score each completed task from 0-100 based on:
- Task type similarity (e.g., both are "planning" tasks, "writing" tasks, etc.)
- Domain similarity (e.g., both involve "meetings", "reports", "events", etc.)
- Complexity similarity (simple vs complex tasks)
- Required skills/resources overlap

New Task:
Title: "${newTask.title}"
Description: ${newTask.description ?? 'No description'}

Completed Tasks:
${candidatesList}

Return ONLY valid JSON in this exact format:
{
  "matches": [
    {
      "index": 0,
      "score": 85,
      "reasons": ["Both are planning tasks", "Similar complexity level"]
    }
  ]
}

Include all tasks that have a score of 20 or higher. Be specific in your reasons.`
  }

  /**
   * Get the system prompt for similarity analysis
   */
  private getSimilaritySystemPrompt(): string {
    return `You are a task similarity analyzer. Your job is to compare tasks and identify meaningful similarities.

Focus on:
1. Task type/category (planning, writing, research, meeting, etc.)
2. Domain/subject matter
3. Complexity and scope
4. Required actions and skills

Be objective and specific in your scoring. A score of:
- 90-100: Nearly identical tasks
- 70-89: Very similar tasks
- 50-69: Moderately similar tasks
- 30-49: Some similarities
- 0-29: Minimal or no meaningful similarity

Always respond with valid JSON only.`
  }

  /**
   * Parse the AI response to extract similarity results
   */
  private parseAIResponse(content: string): AISimilarityResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('[SimilarTaskMatcherService] No JSON found in AI response')
        return { matches: [] }
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate the structure
      if (!parsed.matches || !Array.isArray(parsed.matches)) {
        console.warn('[SimilarTaskMatcherService] Invalid response structure')
        return { matches: [] }
      }

      return parsed as AISimilarityResult
    } catch (error) {
      console.error(
        '[SimilarTaskMatcherService.parseAIResponse] Parse error:',
        error
      )
      return { matches: [] }
    }
  }

  /**
   * Map AI analysis results back to SimilarTaskMatch format
   */
  private mapAnalysisToMatches(
    candidates: TaskWithHistory[],
    analysis: AISimilarityResult
  ): SimilarTaskMatch[] {
    return analysis.matches
      .filter((match) => match.index >= 0 && match.index < candidates.length)
      .map((match) => {
        const task = candidates[match.index]
        return {
          taskId: task.id,
          title: task.title,
          similarityScore: Math.min(100, Math.max(0, match.score)),
          matchReasons: match.reasons,
          executionInsights: this.buildExecutionInsights(task),
        }
      })
  }

  /**
   * Build execution insights from task history
   */
  private buildExecutionInsights(task: TaskWithHistory): ExecutionInsights {
    const history = task.executionHistory

    return {
      estimatedVsActual: history?.estimationAccuracyRatio ?? undefined,
      subtasksAdded: history?.subtasksAddedMidExecution ?? 0,
      stallPoints:
        (history?.stallEvents
          ?.map((e) => e.reason)
          .filter(Boolean) as string[]) ?? [],
      outcome: history?.outcome ?? 'completed',
    }
  }

  /**
   * Create basic matches without AI scoring (fallback)
   */
  private createBasicMatches(
    candidates: TaskWithHistory[]
  ): SimilarTaskMatch[] {
    return candidates.map((task) => ({
      taskId: task.id,
      title: task.title,
      similarityScore: 50, // Default moderate similarity
      matchReasons: ['Matched by keywords'],
      executionInsights: this.buildExecutionInsights(task),
    }))
  }

  /**
   * Build aggregated insights from matched tasks
   */
  private buildAggregatedInsights(
    matches: SimilarTaskMatch[]
  ): AggregatedInsights {
    if (matches.length === 0) {
      return {
        avgEstimationAccuracy: 1.0,
        commonSubtasksAdded: [],
        commonStallPoints: [],
        successRate: 100,
      }
    }

    // Calculate average estimation accuracy
    const accuracies = matches
      .map((m) => m.executionInsights.estimatedVsActual)
      .filter((a): a is number => a !== undefined && a > 0)
    const avgAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length
        : 1.0

    // Collect common stall points
    const allStallPoints = matches.flatMap(
      (m) => m.executionInsights.stallPoints ?? []
    )
    const stallPointCounts = new Map<string, number>()
    allStallPoints.forEach((point) => {
      stallPointCounts.set(point, (stallPointCounts.get(point) ?? 0) + 1)
    })
    const commonStallPoints = [...stallPointCounts.entries()]
      .filter((entry) => entry[1] > 1)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])
      .slice(0, 5)

    // Calculate success rate
    const completedCount = matches.filter(
      (m) => m.executionInsights.outcome === 'completed'
    ).length
    const successRate = (completedCount / matches.length) * 100

    return {
      avgEstimationAccuracy: avgAccuracy,
      commonSubtasksAdded: [], // Would need to track common subtask titles
      commonStallPoints,
      successRate,
    }
  }

  /**
   * Create an empty similarity analysis result
   */
  private createEmptyAnalysis(): SimilarityAnalysis {
    return {
      matchedTasks: [],
      aggregatedInsights: {
        avgEstimationAccuracy: 1.0,
        commonSubtasksAdded: [],
        commonStallPoints: [],
        successRate: 100,
      },
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const similarTaskMatcherService = new SimilarTaskMatcherService()
