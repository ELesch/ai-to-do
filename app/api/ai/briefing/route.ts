/**
 * Daily Briefing API Route
 * GET /api/ai/briefing - Generate daily briefing with AI insights
 *
 * Features:
 * - Fetches tasks due today and overdue tasks
 * - Generates AI-powered insights and recommendations
 * - Caches briefing for 1 hour
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, activityLog } from '@/lib/db/schema'
import { aiClient, isAPIKeyConfigured, AIRateLimitError } from '@/lib/ai/client'
import { eq, and, gte, lte, lt, isNull, desc, sql } from 'drizzle-orm'

// =============================================================================
// TYPES
// =============================================================================

interface BriefingTask {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low' | 'none'
  dueDate: string | null
  status: string
  projectName: string | null
}

interface AIInsights {
  workloadAssessment: 'light' | 'moderate' | 'heavy'
  workloadExplanation: string
  priorityRecommendations: string[]
  timeBlockingSuggestions: string[]
  motivationalNote?: string
}

interface RecentActivity {
  completedToday: number
  completedThisWeek: number
  createdToday: number
}

interface DailyBriefing {
  tasksDueToday: BriefingTask[]
  overdueTasks: BriefingTask[]
  suggestedTasks: BriefingTask[]
  recentActivity: RecentActivity
  aiInsights: AIInsights
  generatedAt: string
  cachedUntil: string
}

interface CacheEntry {
  briefing: DailyBriefing
  expiresAt: number
}

// =============================================================================
// CACHE (In-memory)
// =============================================================================

const briefingCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Get cached briefing if valid
 */
function getCachedBriefing(userId: string): DailyBriefing | null {
  const entry = briefingCache.get(userId)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    briefingCache.delete(userId)
    return null
  }

  return entry.briefing
}

/**
 * Cache a briefing
 */
function cacheBriefing(userId: string, briefing: DailyBriefing): void {
  briefingCache.set(userId, {
    briefing,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

// Clean up expired cache entries periodically (every 15 minutes)
setInterval(
  () => {
    const now = Date.now()
    for (const [userId, entry] of briefingCache.entries()) {
      if (now > entry.expiresAt) {
        briefingCache.delete(userId)
      }
    }
  },
  15 * 60 * 1000
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get start and end of today
 */
function getTodayRange(): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

/**
 * Get start of this week (Monday)
 */
function getWeekStart(): Date {
  const date = new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Fetch tasks due today for a user
 */
async function fetchTasksDueToday(userId: string): Promise<BriefingTask[]> {
  const { start, end } = getTodayRange()

  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        gte(tasks.dueDate, start),
        lt(tasks.dueDate, end),
        eq(tasks.status, 'pending'),
        isNull(tasks.deletedAt)
      )
    )
    .orderBy(desc(tasks.priority))
    .limit(10)

  return taskResults.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as 'high' | 'medium' | 'low' | 'none',
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    projectName: null, // Could be fetched with a join if needed
  }))
}

/**
 * Fetch overdue tasks for a user
 */
async function fetchOverdueTasks(userId: string): Promise<BriefingTask[]> {
  const { start } = getTodayRange()

  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        lt(tasks.dueDate, start),
        eq(tasks.status, 'pending'),
        isNull(tasks.deletedAt)
      )
    )
    .orderBy(desc(tasks.dueDate))
    .limit(10)

  return taskResults.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as 'high' | 'medium' | 'low' | 'none',
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    projectName: null,
  }))
}

/**
 * Fetch suggested tasks (high priority without due dates or upcoming)
 */
async function fetchSuggestedTasks(userId: string): Promise<BriefingTask[]> {
  const { end } = getTodayRange()
  const nextWeek = new Date(end)
  nextWeek.setDate(nextWeek.getDate() + 7)

  // Get high priority tasks without due dates or due soon
  const taskResults = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'pending'),
        isNull(tasks.deletedAt),
        eq(tasks.priority, 'high')
      )
    )
    .orderBy(desc(tasks.priority))
    .limit(5)

  return taskResults.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as 'high' | 'medium' | 'low' | 'none',
    dueDate: t.dueDate?.toISOString() ?? null,
    status: t.status,
    projectName: null,
  }))
}

/**
 * Fetch recent activity stats
 */
async function fetchRecentActivity(userId: string): Promise<RecentActivity> {
  const { start: todayStart } = getTodayRange()
  const weekStart = getWeekStart()

  // Count tasks completed today
  const completedTodayResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'completed'),
        gte(tasks.completedAt, todayStart)
      )
    )

  // Count tasks completed this week
  const completedWeekResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'completed'),
        gte(tasks.completedAt, weekStart)
      )
    )

  // Count tasks created today
  const createdTodayResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.createdAt, todayStart)))

  return {
    completedToday: completedTodayResult[0]?.count ?? 0,
    completedThisWeek: completedWeekResult[0]?.count ?? 0,
    createdToday: createdTodayResult[0]?.count ?? 0,
  }
}

/**
 * Generate AI insights for the briefing
 */
async function generateAIInsights(
  userId: string,
  tasksDueToday: BriefingTask[],
  overdueTasks: BriefingTask[],
  recentActivity: RecentActivity
): Promise<AIInsights> {
  // If AI is not configured, return default insights
  if (!isAPIKeyConfigured()) {
    return generateDefaultInsights(
      tasksDueToday,
      overdueTasks,
      recentActivity
    )
  }

  const totalTasks = tasksDueToday.length + overdueTasks.length
  const highPriorityTasks = [...tasksDueToday, ...overdueTasks].filter(
    (t) => t.priority === 'high'
  )

  const prompt = `You are a productivity assistant analyzing a user's daily task load. Based on the following data, provide helpful insights.

## Current Task Load
- Tasks due today: ${tasksDueToday.length}
- Overdue tasks: ${overdueTasks.length}
- High priority tasks: ${highPriorityTasks.length}
- Tasks completed today so far: ${recentActivity.completedToday}
- Tasks completed this week: ${recentActivity.completedThisWeek}

## Today's Tasks
${tasksDueToday.map((t) => `- ${t.title} (Priority: ${t.priority})`).join('\n') || 'No tasks due today'}

## Overdue Tasks
${overdueTasks.map((t) => `- ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate})`).join('\n') || 'No overdue tasks'}

Please respond in the following JSON format only (no markdown, no code blocks, just raw JSON):
{
  "workloadAssessment": "light" | "moderate" | "heavy",
  "workloadExplanation": "Brief explanation of the workload assessment",
  "priorityRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "timeBlockingSuggestions": ["Suggestion 1", "Suggestion 2"],
  "motivationalNote": "A brief, personalized encouraging note"
}

Guidelines:
- Workload is "light" if < 3 tasks, "moderate" if 3-6 tasks, "heavy" if > 6 tasks
- Give 2-3 specific, actionable priority recommendations
- Give 1-2 time blocking suggestions based on the task types
- Keep the motivational note brief and genuine, not generic`

  try {
    const response = await aiClient.complete(
      prompt,
      'You are a helpful productivity assistant. Always respond with valid JSON only.',
      { userId, maxTokens: 500 }
    )

    // Parse the JSON response
    const cleanedResponse = response.trim()
    const insights = JSON.parse(cleanedResponse) as AIInsights

    // Validate the response structure
    if (
      !insights.workloadAssessment ||
      !insights.workloadExplanation ||
      !Array.isArray(insights.priorityRecommendations) ||
      !Array.isArray(insights.timeBlockingSuggestions)
    ) {
      throw new Error('Invalid AI response structure')
    }

    return insights
  } catch (error) {
    console.error('AI insights generation failed:', error)
    // Fall back to default insights
    return generateDefaultInsights(
      tasksDueToday,
      overdueTasks,
      recentActivity
    )
  }
}

/**
 * Generate default insights when AI is unavailable
 */
function generateDefaultInsights(
  tasksDueToday: BriefingTask[],
  overdueTasks: BriefingTask[],
  recentActivity: RecentActivity
): AIInsights {
  const totalTasks = tasksDueToday.length + overdueTasks.length

  let workloadAssessment: 'light' | 'moderate' | 'heavy'
  let workloadExplanation: string

  if (totalTasks < 3) {
    workloadAssessment = 'light'
    workloadExplanation = `You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} to focus on today. A manageable day ahead.`
  } else if (totalTasks <= 6) {
    workloadAssessment = 'moderate'
    workloadExplanation = `You have ${totalTasks} tasks requiring attention. Stay focused and prioritize.`
  } else {
    workloadAssessment = 'heavy'
    workloadExplanation = `You have ${totalTasks} tasks on your plate. Consider delegating or rescheduling lower priority items.`
  }

  const priorityRecommendations: string[] = []
  const highPriorityTasks = [...tasksDueToday, ...overdueTasks].filter(
    (t) => t.priority === 'high'
  )

  if (overdueTasks.length > 0) {
    priorityRecommendations.push(
      `Address your ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} first`
    )
  }

  if (highPriorityTasks.length > 0) {
    priorityRecommendations.push(
      `Focus on your ${highPriorityTasks.length} high-priority task${highPriorityTasks.length !== 1 ? 's' : ''}`
    )
  }

  if (tasksDueToday.length > 0 && overdueTasks.length === 0) {
    priorityRecommendations.push('Complete your daily tasks to stay on track')
  }

  if (priorityRecommendations.length === 0) {
    priorityRecommendations.push(
      'Consider planning tasks for the upcoming days'
    )
  }

  const timeBlockingSuggestions: string[] = []

  if (highPriorityTasks.length > 0) {
    timeBlockingSuggestions.push(
      'Block 1-2 hours in the morning for high-priority work'
    )
  }

  if (totalTasks > 3) {
    timeBlockingSuggestions.push(
      'Schedule short breaks between tasks to maintain focus'
    )
  } else {
    timeBlockingSuggestions.push(
      'Use focused work sessions of 25-50 minutes'
    )
  }

  let motivationalNote: string | undefined
  if (recentActivity.completedToday > 0) {
    motivationalNote = `Great job completing ${recentActivity.completedToday} task${recentActivity.completedToday !== 1 ? 's' : ''} already today!`
  } else if (recentActivity.completedThisWeek > 5) {
    motivationalNote = `You've completed ${recentActivity.completedThisWeek} tasks this week. Keep up the momentum!`
  }

  return {
    workloadAssessment,
    workloadExplanation,
    priorityRecommendations,
    timeBlockingSuggestions,
    motivationalNote,
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

/**
 * GET /api/ai/briefing - Get daily briefing
 *
 * Query Parameters:
 * - refresh: boolean - Force refresh, bypassing cache
 *
 * Response:
 * - { success: true, data: DailyBriefing }
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check for refresh parameter
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Return cached briefing if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedBriefing(user.id)
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
        })
      }
    }

    // Fetch all data in parallel
    const [tasksDueToday, overdueTasks, suggestedTasks, recentActivity] =
      await Promise.all([
        fetchTasksDueToday(user.id),
        fetchOverdueTasks(user.id),
        fetchSuggestedTasks(user.id),
        fetchRecentActivity(user.id),
      ])

    // Generate AI insights
    const aiInsights = await generateAIInsights(
      user.id,
      tasksDueToday,
      overdueTasks,
      recentActivity
    )

    // Build briefing
    const now = new Date()
    const cachedUntil = new Date(now.getTime() + CACHE_TTL_MS)

    const briefing: DailyBriefing = {
      tasksDueToday,
      overdueTasks,
      suggestedTasks,
      recentActivity,
      aiInsights,
      generatedAt: now.toISOString(),
      cachedUntil: cachedUntil.toISOString(),
    }

    // Cache the briefing
    cacheBriefing(user.id, briefing)

    return NextResponse.json({
      success: true,
      data: briefing,
      cached: false,
    })
  } catch (error) {
    console.error('Daily briefing error:', error)

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { success: false, error: 'AI rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate daily briefing' },
      { status: 500 }
    )
  }
}
