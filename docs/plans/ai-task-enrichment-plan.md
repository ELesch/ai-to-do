# AI-Powered Task Enrichment - Implementation Plan

## Executive Summary

This feature will automatically enrich user tasks at creation time by:

1. Proposing refined title, description, duration estimates, due dates, and subtasks
2. Finding similar completed tasks using a hybrid keyword + AI analysis approach
3. Learning from historical patterns (actual vs estimated time, common stall points)
4. Offering to perform certain subtask types (research, drafting, planning)

## Core Philosophy

**Propose, Don't Ask** - The AI makes intelligent assumptions and presents complete suggestions. The user's job is approval/editing, not generation.

---

## 1. Database Schema Changes

Location: `lib/db/schema.ts`

### 1.1 New Table: `task_enrichment_proposals`

Stores AI-generated enrichment proposals for user review.

```typescript
export const taskEnrichmentProposals = pgTable(
  'task_enrichment_proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Proposed enrichments
    proposedTitle: varchar('proposed_title', { length: 500 }),
    proposedDescription: text('proposed_description'),
    proposedDueDate: timestamp('proposed_due_date', { withTimezone: true }),
    proposedEstimatedMinutes: integer('proposed_estimated_minutes'),
    proposedPriority: taskPriorityEnum('proposed_priority'),
    proposedSubtasks: jsonb('proposed_subtasks')
      .$type<ProposedSubtask[]>()
      .default([]),

    // Similar tasks analysis
    similarTaskIds: uuid('similar_task_ids').array(),
    similarityAnalysis: jsonb(
      'similarity_analysis'
    ).$type<SimilarityAnalysis>(),

    // User response tracking
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    acceptedFields: text('accepted_fields').array(),
    userModifications:
      jsonb('user_modifications').$type<Record<string, unknown>>(),

    // Metadata
    aiModel: varchar('ai_model', { length: 100 }),
    aiProvider: varchar('ai_provider', { length: 50 }),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    processingTimeMs: integer('processing_time_ms'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => ({
    taskIdIdx: index('task_enrichment_proposals_task_id_idx').on(table.taskId),
    userStatusIdx: index('task_enrichment_proposals_user_status_idx').on(
      table.userId,
      table.status
    ),
  })
)
```

### 1.2 New Table: `task_execution_history`

Tracks actual execution patterns for learning.

```typescript
export const taskExecutionHistory = pgTable(
  'task_execution_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Timing analysis
    originalEstimatedMinutes: integer('original_estimated_minutes'),
    finalActualMinutes: integer('final_actual_minutes'),
    estimationAccuracyRatio: real('estimation_accuracy_ratio'),

    // Subtask evolution
    originalSubtaskCount: integer('original_subtask_count').default(0),
    subtasksAddedMidExecution: integer('subtasks_added_mid_execution').default(
      0
    ),
    addedSubtaskTitles: text('added_subtask_titles').array(),

    // Stall point tracking
    stallEvents: jsonb('stall_events').$type<StallEvent[]>().default([]),
    totalStallTimeMinutes: integer('total_stall_time_minutes').default(0),

    // Outcome tracking
    outcome: varchar('outcome', { length: 20 }).notNull(),
    completionDate: timestamp('completion_date', { withTimezone: true }),
    daysOverdue: integer('days_overdue').default(0),

    // Task fingerprint for similarity matching
    taskCategory: varchar('task_category', { length: 100 }),
    keywordFingerprint: text('keyword_fingerprint').array(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('task_execution_history_user_id_idx').on(table.userId),
    categoryIdx: index('task_execution_history_category_idx').on(
      table.userId,
      table.taskCategory
    ),
    outcomeIdx: index('task_execution_history_outcome_idx').on(
      table.userId,
      table.outcome
    ),
  })
)
```

### 1.3 New Table: `ai_work_artifacts`

Stores AI-generated work artifacts (research, drafts, plans).

```typescript
export const aiWorkArtifacts = pgTable(
  'ai_work_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    subtaskId: uuid('subtask_id').references(() => tasks.id, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Artifact details
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),

    // Status tracking
    status: varchar('status', { length: 20 }).default('generated').notNull(),

    // AI metadata
    aiModel: varchar('ai_model', { length: 100 }),
    aiProvider: varchar('ai_provider', { length: 50 }),
    promptUsed: text('prompt_used'),

    // User feedback
    userRating: integer('user_rating'),
    userFeedback: text('user_feedback'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskIdIdx: index('ai_work_artifacts_task_id_idx').on(table.taskId),
    typeIdx: index('ai_work_artifacts_type_idx').on(table.userId, table.type),
  })
)
```

### 1.4 Type Definitions

Add to `types/ai.ts`:

```typescript
export interface ProposedSubtask {
  title: string
  estimatedMinutes?: number
  type?: 'action' | 'research' | 'draft' | 'plan' | 'review'
  aiCanDo?: boolean
  suggestedOrder: number
}

export interface SimilarityAnalysis {
  matchedTasks: Array<{
    taskId: string
    title: string
    similarityScore: number
    matchReasons: string[]
    executionInsights: {
      estimatedVsActual?: number
      subtasksAdded?: number
      stallPoints?: string[]
      outcome: string
    }
  }>
  aggregatedInsights: {
    avgEstimationAccuracy: number
    commonSubtasksAdded: string[]
    commonStallPoints: string[]
    successRate: number
  }
}

export interface StallEvent {
  startTime: string
  endTime: string
  durationMinutes: number
  reason?: string
  subtaskId?: string
}
```

---

## 2. API Endpoints

### 2.1 `POST /api/ai/enrich`

Main enrichment endpoint - called when user creates/edits a task.

**Location:** `app/api/ai/enrich/route.ts`

```typescript
// Request
interface EnrichmentRequest {
  title: string
  description?: string
  projectId?: string
  existingTags?: string[]
}

// Response
interface EnrichmentResponse {
  success: boolean
  data: {
    proposal: {
      proposedTitle: string
      proposedDescription: string
      proposedDueDate: string | null
      proposedEstimatedMinutes: number
      proposedPriority: 'high' | 'medium' | 'low' | 'none'
      proposedSubtasks: ProposedSubtask[]
    }
    similarTasks: SimilarityAnalysis
    insights: {
      estimationConfidence: 'high' | 'medium' | 'low'
      riskFactors: string[]
      successPrediction: number
    }
  }
}
```

### 2.2 `POST /api/ai/enrich/apply`

Apply user-accepted enrichment to task.

**Location:** `app/api/ai/enrich/apply/route.ts`

```typescript
interface ApplyEnrichmentRequest {
  taskId: string
  proposalId: string
  acceptedFields: string[]
  modifications?: {
    title?: string
    description?: string
    // ... user modifications to proposals
  }
}
```

### 2.3 `POST /api/ai/similar-tasks`

Find similar completed tasks.

**Location:** `app/api/ai/similar-tasks/route.ts`

```typescript
interface SimilarTasksRequest {
  title: string
  description?: string
  limit?: number
}

interface SimilarTasksResponse {
  tasks: Array<{
    id: string
    title: string
    similarityScore: number
    matchReasons: string[]
    executionData: {
      estimatedMinutes: number
      actualMinutes: number
      subtasksAdded: number
      outcome: string
    }
  }>
}
```

### 2.4 `POST /api/ai/do-work`

AI performs subtask work (research, drafting, planning).

**Location:** `app/api/ai/do-work/route.ts`

```typescript
interface DoWorkRequest {
  taskId: string
  subtaskId: string
  workType: 'research' | 'draft' | 'plan' | 'outline'
  context?: string
}

interface DoWorkResponse {
  success: boolean
  data: {
    artifactId: string
    type: string
    title: string
    content: string
    suggestedNextSteps?: string[]
  }
}
```

### 2.5 `GET /api/ai/execution-insights/[taskId]`

Get execution insights for a specific task.

**Location:** `app/api/ai/execution-insights/[taskId]/route.ts`

---

## 3. Service Layer

### 3.1 TaskEnrichmentService

**Location:** `services/task-enrichment.service.ts`

```typescript
class TaskEnrichmentService {
  async enrichTask(
    userId: string,
    input: { title: string; description?: string; projectId?: string }
  ): Promise<EnrichmentProposal>

  async findSimilarTasks(
    userId: string,
    title: string,
    description?: string,
    limit?: number
  ): Promise<SimilarTaskMatch[]>

  async generateSubtasks(
    userId: string,
    task: { title: string; description?: string },
    similarTasks: SimilarTaskMatch[]
  ): Promise<ProposedSubtask[]>

  async estimateDuration(
    userId: string,
    task: { title: string; description?: string },
    subtasks: ProposedSubtask[],
    historicalData: ExecutionHistory[]
  ): Promise<{ minutes: number; confidence: number }>

  async suggestDueDate(
    userId: string,
    estimatedMinutes: number,
    priority?: string
  ): Promise<Date | null>

  async applyEnrichment(
    userId: string,
    taskId: string,
    proposalId: string,
    acceptedFields: string[],
    modifications?: Record<string, unknown>
  ): Promise<Task>

  async recordExecutionHistory(userId: string, taskId: string): Promise<void>
}
```

### 3.2 SimilarTaskMatcherService

**Location:** `services/similar-task-matcher.service.ts`

Implements hybrid keyword + AI analysis approach:

```typescript
class SimilarTaskMatcherService {
  // Phase 1: Fast keyword filtering (database-side)
  async keywordFilter(
    userId: string,
    title: string,
    description?: string,
    limit?: number
  ): Promise<TaskWithHistory[]>

  // Phase 2: AI-based semantic analysis on filtered candidates
  async aiAnalyzeSimilarity(
    newTask: { title: string; description?: string },
    candidates: TaskWithHistory[]
  ): Promise<SimilarityMatch[]>

  extractKeywords(text: string): string[]

  buildSearchQuery(keywords: string[]): string
}
```

### 3.3 AIWorkService

**Location:** `services/ai-work.service.ts`

```typescript
class AIWorkService {
  canDoWork(subtaskType: string): boolean

  async doResearch(
    userId: string,
    taskContext: { title: string; description?: string },
    subtaskTitle: string
  ): Promise<AIWorkArtifact>

  async doDraft(
    userId: string,
    taskContext: { title: string; description?: string },
    subtaskTitle: string,
    draftType: 'email' | 'document' | 'outline' | 'general'
  ): Promise<AIWorkArtifact>

  async doPlan(
    userId: string,
    taskContext: { title: string; description?: string },
    subtaskTitle: string
  ): Promise<AIWorkArtifact>

  async *streamWork(
    userId: string,
    workType: string,
    context: WorkContext
  ): AsyncGenerator<string>
}
```

---

## 4. Hybrid Similar Task Matching Algorithm

### Phase 1: Keyword Filtering (Database-side, fast)

```typescript
// Extract keywords from new task
const keywords = extractKeywords(title + ' ' + description)
// Example: "Plan birthday party for Mom" -> ["plan", "birthday", "party", "mom"]

// Query with keyword matching
const candidates = await db.query.tasks.findMany({
  where: and(
    eq(tasks.userId, userId),
    eq(tasks.status, 'completed'),
    isNull(tasks.deletedAt),
    or(
      ...keywords.map((kw) =>
        or(ilike(tasks.title, `%${kw}%`), ilike(tasks.description, `%${kw}%`))
      )
    )
  ),
  limit: 20,
  orderBy: desc(tasks.completedAt),
})
```

### Phase 2: AI Analysis (Semantic similarity)

```typescript
const aiAnalysisPrompt = `
Analyze similarity between the new task and these completed tasks.
Score each 0-100 based on:
- Task type similarity (e.g., both are "planning" tasks)
- Domain similarity (e.g., both involve "events")
- Complexity similarity
- Required skills/resources overlap

New Task: "${newTask.title}"
Completed Tasks: [list of candidates]

Return JSON: { matches: [{ index, score, reasons }] }
`
```

---

## 5. AI Prompts

**Location:** `lib/ai/prompts.ts`

```typescript
export const TASK_ENRICHMENT_PROMPT = `You are a task planning expert. Your job is to help users by enriching their tasks with intelligent suggestions.

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
```

---

## 6. Frontend Components

### 6.1 New: `TaskEnrichmentPanel`

**Location:** `components/features/ai/TaskEnrichmentPanel.tsx`

Shows AI proposals when creating/editing a task:

- Proposed refinements with accept/reject per field
- Similar tasks with insights
- Confidence indicators
- Edit proposals before accepting
- Highlights AI-workable subtasks

### 6.2 New: `SimilarTasksInsights`

**Location:** `components/features/ai/SimilarTasksInsights.tsx`

Displays:

- List of similar completed tasks
- Estimation accuracy for each
- Subtasks added mid-execution
- Stall points encountered
- Aggregated insights

### 6.3 New: `AIWorkButton`

**Location:** `components/features/ai/AIWorkButton.tsx`

Button that triggers AI work generation:

- Loading state during generation
- Preview modal for generated content
- Accept/Edit/Regenerate options

### 6.4 Modify: `QuickAddForm`

**Location:** `components/features/tasks/quick-add-form.tsx`

Add enrichment trigger after user types (debounced 500ms).

### 6.5 Modify: `TaskForm`

**Location:** `components/features/tasks/task-form.tsx`

Add "Enhance with AI" button and enrichment panel integration.

---

## 7. New Hooks

### 7.1 `useTaskEnrichment`

**Location:** `hooks/use-task-enrichment.ts`

```typescript
export function useTaskEnrichment(options?: {
  onSuccess?: (proposal: EnrichmentProposal) => void
  onError?: (error: Error) => void
}) {
  const [proposal, setProposal] = useState<EnrichmentProposal | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const enrich = useCallback(async (title: string, description?: string) => { ... }, [])
  const apply = useCallback(async (proposalId: string, selectedFields: string[]) => { ... }, [])

  return { proposal, isLoading, error, enrich, apply }
}
```

### 7.2 `useSimilarTasks`

**Location:** `hooks/use-similar-tasks.ts`

### 7.3 `useAIWork`

**Location:** `hooks/use-ai-work.ts`

---

## 8. Implementation Phases

### Phase 1: Foundation

- Add new database tables via Drizzle migration
- Create `TaskEnrichmentService` with basic enrichment
- Create `/api/ai/enrich` endpoint
- Add enrichment prompt to `lib/ai/prompts.ts`

### Phase 2: Similar Task Matching

- Create `SimilarTaskMatcherService`
- Implement keyword extraction and filtering
- Add AI similarity analysis
- Create `/api/ai/similar-tasks` endpoint
- Build `SimilarTasksInsights` component

### Phase 3: Frontend Integration

- Create `TaskEnrichmentPanel` component
- Modify `QuickAddForm` with enrichment trigger
- Modify `TaskForm` with enrichment integration
- Create `useTaskEnrichment` hook

### Phase 4: AI Work Feature

- Create `AIWorkService`
- Create `/api/ai/do-work` endpoint with streaming
- Build `AIWorkButton` component
- Create `useAIWork` hook

### Phase 5: Learning & History

- Implement execution history recording
- Add task completion hooks
- Create execution insights API
- Integrate historical data into enrichment

---

## 9. Files to Modify/Create

### New Files

- `services/task-enrichment.service.ts`
- `services/similar-task-matcher.service.ts`
- `services/ai-work.service.ts`
- `app/api/ai/enrich/route.ts`
- `app/api/ai/enrich/apply/route.ts`
- `app/api/ai/similar-tasks/route.ts`
- `app/api/ai/do-work/route.ts`
- `app/api/ai/execution-insights/[taskId]/route.ts`
- `components/features/ai/TaskEnrichmentPanel.tsx`
- `components/features/ai/SimilarTasksInsights.tsx`
- `components/features/ai/AIWorkButton.tsx`
- `hooks/use-task-enrichment.ts`
- `hooks/use-similar-tasks.ts`
- `hooks/use-ai-work.ts`

### Files to Modify

- `lib/db/schema.ts` - Add new tables
- `types/ai.ts` - Add new types
- `lib/ai/prompts.ts` - Add enrichment prompt
- `components/features/tasks/quick-add-form.tsx` - Add enrichment trigger
- `components/features/tasks/task-form.tsx` - Add enrichment integration
- `services/task.service.ts` - Add completion hooks for history recording
