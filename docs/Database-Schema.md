# AI-Aided To Do Application
## Database Schema Document

**Version:** 1.0
**Date:** January 2026
**Status:** Architecture Phase
**Database:** PostgreSQL (Neon Serverless)
**ORM:** Drizzle ORM

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Core Entities](#3-core-entities)
4. [AI Entities](#4-ai-entities)
5. [Authentication Entities](#5-authentication-entities)
6. [Indexes & Performance](#6-indexes--performance)
7. [Data Integrity](#7-data-integrity)
8. [Migrations](#8-migrations)
9. [Seed Data](#9-seed-data)
10. [Query Patterns](#10-query-patterns)
11. [Drizzle Schema](#11-drizzle-schema)

---

## 1. Overview

### 1.1 Database Selection Rationale

| Requirement | PostgreSQL (Neon) Solution |
|-------------|---------------------------|
| Serverless deployment | Neon auto-scales, pay-per-use |
| Complex queries | Full SQL support, CTEs, window functions |
| JSON storage | Native JSONB with indexing |
| Full-text search | Built-in tsvector/tsquery |
| Vector search (AI) | pgvector extension available |
| Relational integrity | Foreign keys, constraints, triggers |
| Developer experience | Drizzle ORM type-safety |

### 1.2 Naming Conventions

- **Tables:** lowercase, plural, snake_case (e.g., `tasks`, `ai_messages`)
- **Columns:** lowercase, snake_case (e.g., `created_at`, `user_id`)
- **Primary Keys:** `id` (UUID)
- **Foreign Keys:** `{referenced_table_singular}_id` (e.g., `user_id`, `project_id`)
- **Timestamps:** `created_at`, `updated_at`, `deleted_at`
- **Booleans:** `is_` or `has_` prefix (e.g., `is_recurring`, `has_attachments`)
- **Indexes:** `{table}_{columns}_idx` (e.g., `tasks_user_id_idx`)
- **Unique Constraints:** `{table}_{columns}_unique` (e.g., `users_email_unique`)

### 1.3 Common Patterns

**Soft Deletes:**
All major entities support soft deletes via `deleted_at` timestamp. Queries filter by `deleted_at IS NULL` by default.

**Audit Timestamps:**
All tables include `created_at` and `updated_at`. Updates automatically refresh `updated_at`.

**UUIDs:**
All primary keys use UUID v4 for security (non-guessable) and distributed generation.

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIP DIAGRAM                        │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │    users     │
                                    ├──────────────┤
                                    │ id (PK)      │
                                    │ email        │
                                    │ name         │
                                    │ preferences  │
                                    └──────┬───────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
    ┌──────────────┐               ┌──────────────┐               ┌──────────────┐
    │   projects   │               │    tasks     │               │   accounts   │
    ├──────────────┤               ├──────────────┤               ├──────────────┤
    │ id (PK)      │◄──────────────│ id (PK)      │               │ id (PK)      │
    │ user_id (FK) │               │ user_id (FK) │               │ user_id (FK) │
    │ parent_id    │──┐            │ project_id   │               │ provider     │
    │ name         │  │            │ parent_id    │──┐            │ provider_id  │
    │ color        │  │            │ title        │  │            └──────────────┘
    └──────────────┘  │            │ status       │  │
           ▲          │            │ priority     │  │
           └──────────┘            │ due_date     │  │            ┌──────────────┐
         (self-ref)                └──────┬───────┘  │            │   sessions   │
                                          │          │            ├──────────────┤
                                          │          └────────────│ id (PK)      │
                                          │           (self-ref)  │ user_id (FK) │
                   ┌──────────────────────┼──────────────────┐    │ expires      │
                   │                      │                  │    └──────────────┘
                   ▼                      ▼                  ▼
           ┌──────────────┐       ┌──────────────┐   ┌──────────────┐
           │    tags      │       │ ai_contexts  │   │ ai_convers.  │
           ├──────────────┤       ├──────────────┤   ├──────────────┤
           │ id (PK)      │       │ id (PK)      │   │ id (PK)      │
           │ user_id (FK) │       │ task_id (FK) │   │ user_id (FK) │
           │ name         │       │ type         │   │ task_id (FK) │
           │ color        │       │ content      │   │ title        │
           └──────────────┘       └──────────────┘   └──────┬───────┘
                   │                                        │
                   │                                        ▼
                   │                                ┌──────────────┐
           ┌──────────────┐                         │ ai_messages  │
           │  task_tags   │                         ├──────────────┤
           ├──────────────┤                         │ id (PK)      │
           │ task_id (FK) │                         │ convers. (FK)│
           │ tag_id (FK)  │                         │ role         │
           └──────────────┘                         │ content      │
            (junction)                              └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│ LEGEND                                                                       │
│                                                                              │
│  ─────►  One-to-Many relationship                                           │
│  ──┐     Self-referential relationship                                      │
│  (PK)    Primary Key                                                        │
│  (FK)    Foreign Key                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Entities

### 3.1 Users

Primary entity for application users.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255),
    password_hash   VARCHAR(255),
    email_verified  TIMESTAMP WITH TIME ZONE,
    image           TEXT,
    preferences     JSONB DEFAULT '{}',

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at      TIMESTAMP WITH TIME ZONE
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `email` | VARCHAR(255) | No | User's email address, unique |
| `name` | VARCHAR(255) | Yes | Display name |
| `password_hash` | VARCHAR(255) | Yes | Bcrypt hash (null for OAuth users) |
| `email_verified` | TIMESTAMP | Yes | When email was verified |
| `image` | TEXT | Yes | Profile image URL |
| `preferences` | JSONB | Yes | User preferences (see schema below) |
| `created_at` | TIMESTAMP | No | Record creation time |
| `updated_at` | TIMESTAMP | No | Last modification time |
| `deleted_at` | TIMESTAMP | Yes | Soft delete timestamp |

**Preferences JSONB Schema:**

```typescript
interface UserPreferences {
  // Display
  theme: 'light' | 'dark' | 'system'
  defaultView: 'today' | 'upcoming' | 'inbox'
  sidebarCollapsed: boolean

  // Date & Time
  timezone: string                    // e.g., 'America/New_York'
  weekStartsOn: 0 | 1 | 6            // Sunday, Monday, Saturday
  timeFormat: '12h' | '24h'
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

  // Notifications
  emailNotifications: boolean
  pushNotifications: boolean
  dailyDigestTime: string            // e.g., '08:00'
  quietHoursStart: string            // e.g., '22:00'
  quietHoursEnd: string              // e.g., '07:00'

  // AI Settings
  aiEnabled: boolean
  aiSuggestionsEnabled: boolean
  aiSuggestionFrequency: 'low' | 'medium' | 'high'
  aiCommunicationStyle: 'concise' | 'detailed'
  aiDataLearning: boolean            // Allow AI to learn from usage

  // Task Defaults
  defaultPriority: 'high' | 'medium' | 'low' | 'none'
  defaultProjectId: string | null
  autoArchiveCompleted: boolean
  autoArchiveDays: number            // Days after completion to archive
}
```

---

### 3.2 Projects

Organizational containers for tasks.

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES projects(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    color           VARCHAR(7) DEFAULT '#6366f1',
    icon            VARCHAR(50),

    sort_order      INTEGER DEFAULT 0,
    is_archived     BOOLEAN DEFAULT FALSE,
    is_favorite     BOOLEAN DEFAULT FALSE,

    -- Settings
    settings        JSONB DEFAULT '{}',

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    archived_at     TIMESTAMP WITH TIME ZONE,
    deleted_at      TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT max_nesting_depth CHECK (
        parent_id IS NULL OR
        NOT EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = parent_id AND p.parent_id IS NOT NULL
        )
    )
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | Owner of the project |
| `parent_id` | UUID | Yes | Parent project (for nesting, max 2 levels) |
| `name` | VARCHAR(255) | No | Project name |
| `description` | TEXT | Yes | Project description |
| `color` | VARCHAR(7) | Yes | Hex color code |
| `icon` | VARCHAR(50) | Yes | Icon identifier |
| `sort_order` | INTEGER | Yes | Display order |
| `is_archived` | BOOLEAN | Yes | Whether project is archived |
| `is_favorite` | BOOLEAN | Yes | Pinned to top of list |
| `settings` | JSONB | Yes | Project-specific settings |
| `archived_at` | TIMESTAMP | Yes | When archived |

**Project Settings JSONB Schema:**

```typescript
interface ProjectSettings {
  defaultPriority: 'high' | 'medium' | 'low' | 'none'
  defaultTags: string[]
  aiContextPrompt: string            // Custom context for AI
}
```

---

### 3.3 Tasks

Core entity for todo items.

```sql
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,

    -- Content
    title               VARCHAR(500) NOT NULL,
    description         TEXT,

    -- Status & Priority
    status              task_status DEFAULT 'pending' NOT NULL,
    priority            task_priority DEFAULT 'none' NOT NULL,

    -- Dates
    due_date            TIMESTAMP WITH TIME ZONE,
    due_date_has_time   BOOLEAN DEFAULT FALSE,
    scheduled_date      DATE,
    start_date          DATE,

    -- Time Tracking
    estimated_minutes   INTEGER CHECK (estimated_minutes > 0),
    actual_minutes      INTEGER CHECK (actual_minutes >= 0),

    -- Organization
    sort_order          INTEGER DEFAULT 0,

    -- Recurrence
    is_recurring        BOOLEAN DEFAULT FALSE,
    recurrence_rule     JSONB,
    recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at        TIMESTAMP WITH TIME ZONE,
    deleted_at          TIMESTAMP WITH TIME ZONE,

    -- Full-text search
    search_vector       TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

-- Custom types
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'deleted');
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low', 'none');
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | Owner of the task |
| `project_id` | UUID | Yes | Associated project |
| `parent_task_id` | UUID | Yes | Parent task (for subtasks) |
| `title` | VARCHAR(500) | No | Task title |
| `description` | TEXT | Yes | Rich text description (Markdown) |
| `status` | ENUM | No | Current status |
| `priority` | ENUM | No | Priority level |
| `due_date` | TIMESTAMP | Yes | When task is due |
| `due_date_has_time` | BOOLEAN | Yes | Whether due date includes time |
| `scheduled_date` | DATE | Yes | When user plans to work on it |
| `start_date` | DATE | Yes | When task becomes relevant |
| `estimated_minutes` | INTEGER | Yes | Estimated duration |
| `actual_minutes` | INTEGER | Yes | Actual time spent |
| `sort_order` | INTEGER | Yes | Display order within list |
| `is_recurring` | BOOLEAN | Yes | Whether task repeats |
| `recurrence_rule` | JSONB | Yes | Recurrence configuration |
| `recurrence_parent_id` | UUID | Yes | Original recurring task |
| `metadata` | JSONB | Yes | Extensible metadata |
| `search_vector` | TSVECTOR | No | Full-text search index |

**Recurrence Rule JSONB Schema:**

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number                   // Every N frequency units

  // Weekly options
  daysOfWeek?: number[]             // 0-6 (Sunday-Saturday)

  // Monthly options
  dayOfMonth?: number               // 1-31
  weekOfMonth?: number              // 1-5 (or -1 for last)
  dayOfWeekInMonth?: number         // 0-6

  // End conditions (one of)
  endDate?: string                  // ISO date string
  count?: number                    // Number of occurrences

  // Metadata
  createdAt: string
  lastGeneratedAt?: string
  nextOccurrence?: string
}
```

**Task Metadata JSONB Schema:**

```typescript
interface TaskMetadata {
  // Source tracking
  source?: 'manual' | 'ai_suggested' | 'recurring' | 'import'
  importedFrom?: string

  // AI interaction
  aiGenerated?: boolean
  aiDecomposedFrom?: string         // Parent task ID

  // Attachments
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
    uploadedAt: string
  }>

  // Links
  links?: Array<{
    url: string
    title?: string
    favicon?: string
  }>

  // Related tasks
  relatedTaskIds?: string[]
  blockedByTaskIds?: string[]
  blockingTaskIds?: string[]

  // Time tracking sessions
  timeSessions?: Array<{
    startedAt: string
    endedAt?: string
    minutes: number
  }>
}
```

---

### 3.4 Tags

Flexible labeling system for tasks.

```sql
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7) DEFAULT '#6b7280',

    sort_order      INTEGER DEFAULT 0,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT unique_tag_name_per_user UNIQUE (user_id, name)
);
```

### 3.5 Task Tags (Junction Table)

Many-to-many relationship between tasks and tags.

```sql
CREATE TABLE task_tags (
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY (task_id, tag_id)
);
```

---

### 3.6 Reminders

Task reminders and notifications.

```sql
CREATE TABLE reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    remind_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    type            reminder_type NOT NULL,

    -- Status
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMP WITH TIME ZONE,

    -- Delivery
    channels        TEXT[] DEFAULT ARRAY['push'],  -- 'push', 'email'

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_channels CHECK (
        channels <@ ARRAY['push', 'email']::TEXT[]
    )
);

CREATE TYPE reminder_type AS ENUM (
    'due_date',           -- Reminder before due date
    'scheduled',          -- Reminder at scheduled time
    'custom',             -- User-defined reminder
    'follow_up'           -- AI-suggested follow-up
);
```

---

### 3.7 Activity Log

Audit trail for task changes.

```sql
CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Target entity
    entity_type     VARCHAR(50) NOT NULL,         -- 'task', 'project', etc.
    entity_id       UUID NOT NULL,

    -- Action
    action          VARCHAR(50) NOT NULL,         -- 'created', 'updated', 'completed', etc.

    -- Change details
    changes         JSONB,                        -- Before/after values

    -- Metadata
    ip_address      INET,
    user_agent      TEXT,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for querying entity history
CREATE INDEX activity_log_entity_idx ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX activity_log_user_idx ON activity_log(user_id, created_at DESC);
```

**Activity Changes JSONB Schema:**

```typescript
interface ActivityChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  fields?: string[]                  // List of changed fields
}
```

---

## 4. AI Entities

### 4.1 AI Conversations

Container for AI chat sessions.

```sql
CREATE TABLE ai_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,

    title           VARCHAR(255),
    type            conversation_type DEFAULT 'general' NOT NULL,

    -- Status
    is_archived     BOOLEAN DEFAULT FALSE,

    -- Usage tracking
    total_tokens    INTEGER DEFAULT 0,
    message_count   INTEGER DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE TYPE conversation_type AS ENUM (
    'general',            -- General task assistance
    'decompose',          -- Task breakdown session
    'research',           -- Research session
    'draft',              -- Content drafting
    'planning',           -- Daily/weekly planning
    'coaching'            -- Productivity coaching
);
```

---

### 4.2 AI Messages

Individual messages in AI conversations.

```sql
CREATE TABLE ai_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

    role                message_role NOT NULL,
    content             TEXT NOT NULL,

    -- Token usage
    input_tokens        INTEGER,
    output_tokens       INTEGER,

    -- Model info
    model               VARCHAR(100),

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
```

**Message Metadata JSONB Schema:**

```typescript
interface MessageMetadata {
  // Processing info
  processingTimeMs?: number

  // For assistant messages
  finishReason?: 'stop' | 'max_tokens' | 'error'

  // For user messages
  attachedFiles?: string[]

  // Actions taken
  actions?: Array<{
    type: 'created_subtask' | 'saved_research' | 'saved_draft'
    entityId: string
  }>

  // Feedback
  userRating?: 'helpful' | 'not_helpful'
  userFeedback?: string
}
```

---

### 4.3 AI Context

Stored AI-generated content associated with tasks.

```sql
CREATE TABLE ai_context (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,

    type            ai_context_type NOT NULL,
    title           VARCHAR(255),
    content         TEXT NOT NULL,

    -- Version tracking
    version         INTEGER DEFAULT 1,
    is_current      BOOLEAN DEFAULT TRUE,

    -- Metadata
    metadata        JSONB DEFAULT '{}',

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TYPE ai_context_type AS ENUM (
    'research',           -- Research findings
    'draft',              -- Content drafts
    'outline',            -- Document outlines
    'summary',            -- Summaries
    'suggestion',         -- AI suggestions
    'note'                -- AI-generated notes
);
```

**AI Context Metadata JSONB Schema:**

```typescript
interface AIContextMetadata {
  // For research
  sources?: Array<{
    url?: string
    title?: string
    snippet?: string
  }>

  // For drafts
  draftType?: 'email' | 'document' | 'outline' | 'general'
  wordCount?: number

  // For suggestions
  suggestionType?: 'subtask' | 'priority' | 'deadline' | 'approach'
  applied?: boolean
  appliedAt?: string

  // Generation info
  model?: string
  promptVersion?: string
}
```

---

### 4.4 AI Usage

Track AI usage for billing and analytics.

```sql
CREATE TABLE ai_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Period
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,

    -- Counts
    requests        INTEGER DEFAULT 0,
    input_tokens    INTEGER DEFAULT 0,
    output_tokens   INTEGER DEFAULT 0,

    -- By feature
    usage_by_feature JSONB DEFAULT '{}',

    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_user_period UNIQUE (user_id, period_start, period_end)
);
```

**Usage by Feature JSONB Schema:**

```typescript
interface UsageByFeature {
  chat: { requests: number; tokens: number }
  decompose: { requests: number; tokens: number }
  research: { requests: number; tokens: number }
  draft: { requests: number; tokens: number }
  suggestions: { requests: number; tokens: number }
}
```

---

## 5. Authentication Entities

### 5.1 Accounts (OAuth)

OAuth provider accounts linked to users.

```sql
CREATE TABLE accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type                    VARCHAR(50) NOT NULL,
    provider                VARCHAR(50) NOT NULL,
    provider_account_id     VARCHAR(255) NOT NULL,

    refresh_token           TEXT,
    access_token            TEXT,
    expires_at              INTEGER,
    token_type              VARCHAR(50),
    scope                   TEXT,
    id_token                TEXT,
    session_state           TEXT,

    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT unique_provider_account UNIQUE (provider, provider_account_id)
);
```

---

### 5.2 Sessions

User sessions for authentication.

```sql
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    session_token   VARCHAR(255) NOT NULL UNIQUE,
    expires         TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Session metadata
    ip_address      INET,
    user_agent      TEXT,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

---

### 5.3 Verification Tokens

Email verification and password reset tokens.

```sql
CREATE TABLE verification_tokens (
    identifier      VARCHAR(255) NOT NULL,
    token           VARCHAR(255) NOT NULL UNIQUE,
    expires         TIMESTAMP WITH TIME ZONE NOT NULL,

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    PRIMARY KEY (identifier, token)
);
```

---

## 6. Indexes & Performance

### 6.1 Primary Indexes

```sql
-- Users
CREATE UNIQUE INDEX users_email_idx ON users(email) WHERE deleted_at IS NULL;

-- Projects
CREATE INDEX projects_user_id_idx ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX projects_parent_id_idx ON projects(parent_id) WHERE parent_id IS NOT NULL;

-- Tasks (core queries)
CREATE INDEX tasks_user_id_status_idx ON tasks(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX tasks_project_id_idx ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_parent_task_id_idx ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Tasks (date-based queries)
CREATE INDEX tasks_due_date_idx ON tasks(user_id, due_date)
    WHERE due_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX tasks_scheduled_date_idx ON tasks(user_id, scheduled_date)
    WHERE scheduled_date IS NOT NULL AND deleted_at IS NULL;

-- Tasks (full-text search)
CREATE INDEX tasks_search_idx ON tasks USING GIN(search_vector);

-- Tags
CREATE INDEX tags_user_id_idx ON tags(user_id);
CREATE INDEX task_tags_task_id_idx ON task_tags(task_id);
CREATE INDEX task_tags_tag_id_idx ON task_tags(tag_id);

-- AI entities
CREATE INDEX ai_conversations_user_id_idx ON ai_conversations(user_id);
CREATE INDEX ai_conversations_task_id_idx ON ai_conversations(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX ai_messages_conversation_id_idx ON ai_messages(conversation_id);
CREATE INDEX ai_context_task_id_idx ON ai_context(task_id);

-- Reminders
CREATE INDEX reminders_remind_at_idx ON reminders(remind_at) WHERE is_sent = FALSE;
CREATE INDEX reminders_task_id_idx ON reminders(task_id);

-- Activity log
CREATE INDEX activity_log_entity_idx ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX activity_log_user_created_idx ON activity_log(user_id, created_at DESC);

-- Sessions
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires);
```

### 6.2 Partial Indexes

```sql
-- Active tasks only (most common query pattern)
CREATE INDEX tasks_active_idx ON tasks(user_id, sort_order)
    WHERE status = 'pending' AND deleted_at IS NULL;

-- Today's tasks
CREATE INDEX tasks_today_idx ON tasks(user_id, due_date, scheduled_date)
    WHERE status = 'pending' AND deleted_at IS NULL;

-- Overdue tasks
CREATE INDEX tasks_overdue_idx ON tasks(user_id, due_date)
    WHERE status = 'pending' AND due_date < NOW() AND deleted_at IS NULL;

-- Recurring tasks
CREATE INDEX tasks_recurring_idx ON tasks(user_id)
    WHERE is_recurring = TRUE AND deleted_at IS NULL;

-- Unsent reminders
CREATE INDEX reminders_pending_idx ON reminders(remind_at)
    WHERE is_sent = FALSE;
```

### 6.3 Performance Considerations

**Query Optimization Tips:**

1. **Always filter by user_id first** - All queries should include user scope
2. **Use partial indexes** - Most queries filter by `deleted_at IS NULL`
3. **Limit result sets** - Use pagination with `LIMIT` and `OFFSET`
4. **Avoid N+1 queries** - Use JOINs or batch loading for related data

**Expected Query Performance:**

| Query | Expected Time | Index Used |
|-------|---------------|------------|
| Get user's tasks | <10ms | `tasks_user_id_status_idx` |
| Get today's tasks | <10ms | `tasks_today_idx` |
| Search tasks | <50ms | `tasks_search_idx` |
| Get task with subtasks | <15ms | `tasks_parent_task_id_idx` |
| Get conversation history | <20ms | `ai_messages_conversation_id_idx` |

---

## 7. Data Integrity

### 7.1 Foreign Key Constraints

```sql
-- Cascade deletes for owned entities
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE projects ADD CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Set null for optional relationships
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Cascade for subtasks (delete subtasks with parent)
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
```

### 7.2 Check Constraints

```sql
-- Valid color format
ALTER TABLE projects ADD CONSTRAINT valid_project_color
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE tags ADD CONSTRAINT valid_tag_color
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- Positive time values
ALTER TABLE tasks ADD CONSTRAINT positive_estimated_time
    CHECK (estimated_minutes IS NULL OR estimated_minutes > 0);

ALTER TABLE tasks ADD CONSTRAINT non_negative_actual_time
    CHECK (actual_minutes IS NULL OR actual_minutes >= 0);

-- Valid email format
ALTER TABLE users ADD CONSTRAINT valid_email
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Status transition validation (via trigger)
-- Completed tasks cannot go back to pending
```

### 7.3 Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Set completed_at when task is completed
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_completed_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- Update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
    SET
        message_count = message_count + 1,
        total_tokens = total_tokens + COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0),
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_messages_stats
    AFTER INSERT ON ai_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();
```

### 7.4 Row-Level Security (RLS)

```sql
-- Enable RLS on all user-owned tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY tasks_user_policy ON tasks
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY projects_user_policy ON projects
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Note: RLS is optional when using ORM with proper user_id filtering
-- It provides defense-in-depth for direct database access
```

---

## 8. Migrations

### 8.1 Migration Strategy

```
migrations/
├── 0000_initial_schema.sql
├── 0001_create_users.sql
├── 0002_create_projects.sql
├── 0003_create_tasks.sql
├── 0004_create_tags.sql
├── 0005_create_ai_entities.sql
├── 0006_create_auth_entities.sql
├── 0007_create_indexes.sql
├── 0008_create_triggers.sql
└── 0009_seed_data.sql
```

### 8.2 Drizzle Migration Commands

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate:pg

# Apply migrations
pnpm drizzle-kit migrate

# Push schema directly (development only)
pnpm drizzle-kit push:pg

# View database in Drizzle Studio
pnpm drizzle-kit studio
```

### 8.3 Migration Best Practices

1. **Never modify existing migrations** - Create new migrations for changes
2. **Test migrations on a copy** - Use Neon branching for testing
3. **Include rollback scripts** - For critical migrations
4. **Run in transactions** - Ensure atomicity
5. **Monitor migration time** - Large tables need special handling

### 8.4 Sample Migration

```typescript
// lib/db/migrations/0003_create_tasks.ts

import { sql } from 'drizzle-orm'
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core'

export async function up(db: any) {
  // Create enum types
  await db.execute(sql`
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'deleted');
    CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low', 'none');
  `)

  // Create tasks table
  await db.execute(sql`
    CREATE TABLE tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status task_status DEFAULT 'pending' NOT NULL,
      priority task_priority DEFAULT 'none' NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE,
      scheduled_date DATE,
      estimated_minutes INTEGER CHECK (estimated_minutes > 0),
      actual_minutes INTEGER CHECK (actual_minutes >= 0),
      sort_order INTEGER DEFAULT 0,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurrence_rule JSONB,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE,
      deleted_at TIMESTAMP WITH TIME ZONE,
      search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
      ) STORED
    );
  `)

  // Create indexes
  await db.execute(sql`
    CREATE INDEX tasks_user_id_status_idx ON tasks(user_id, status) WHERE deleted_at IS NULL;
    CREATE INDEX tasks_due_date_idx ON tasks(user_id, due_date) WHERE due_date IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX tasks_search_idx ON tasks USING GIN(search_vector);
  `)
}

export async function down(db: any) {
  await db.execute(sql`DROP TABLE IF EXISTS tasks CASCADE`)
  await db.execute(sql`DROP TYPE IF EXISTS task_status`)
  await db.execute(sql`DROP TYPE IF EXISTS task_priority`)
}
```

---

## 9. Seed Data

### 9.1 Development Seed Script

```typescript
// lib/db/seed.ts

import { db } from './index'
import { users, projects, tasks, tags } from './schema'

async function seed() {
  console.log('Seeding database...')

  // Create demo user
  const [demoUser] = await db.insert(users).values({
    email: 'demo@example.com',
    name: 'Demo User',
    passwordHash: '$2a$10$...', // bcrypt hash of 'password123'
    emailVerified: new Date(),
    preferences: {
      theme: 'system',
      defaultView: 'today',
      aiEnabled: true,
      aiSuggestionsEnabled: true,
    },
  }).returning()

  console.log('Created demo user:', demoUser.id)

  // Create sample projects
  const [workProject] = await db.insert(projects).values({
    userId: demoUser.id,
    name: 'Work',
    color: '#3b82f6',
    icon: 'briefcase',
  }).returning()

  const [personalProject] = await db.insert(projects).values({
    userId: demoUser.id,
    name: 'Personal',
    color: '#10b981',
    icon: 'home',
  }).returning()

  console.log('Created projects:', workProject.name, personalProject.name)

  // Create sample tags
  const [urgentTag] = await db.insert(tags).values({
    userId: demoUser.id,
    name: 'Urgent',
    color: '#ef4444',
  }).returning()

  const [meetingTag] = await db.insert(tags).values({
    userId: demoUser.id,
    name: 'Meeting',
    color: '#8b5cf6',
  }).returning()

  console.log('Created tags:', urgentTag.name, meetingTag.name)

  // Create sample tasks
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const sampleTasks = [
    {
      userId: demoUser.id,
      projectId: workProject.id,
      title: 'Review quarterly report',
      description: 'Review and provide feedback on the Q4 report draft',
      priority: 'high' as const,
      dueDate: tomorrow,
      estimatedMinutes: 60,
    },
    {
      userId: demoUser.id,
      projectId: workProject.id,
      title: 'Prepare presentation slides',
      description: 'Create slides for the team meeting on Friday',
      priority: 'medium' as const,
      dueDate: nextWeek,
      estimatedMinutes: 120,
    },
    {
      userId: demoUser.id,
      projectId: workProject.id,
      title: 'Schedule 1:1 with manager',
      priority: 'low' as const,
      scheduledDate: today,
    },
    {
      userId: demoUser.id,
      projectId: personalProject.id,
      title: 'Grocery shopping',
      description: 'Buy items for the week',
      priority: 'medium' as const,
      scheduledDate: today,
    },
    {
      userId: demoUser.id,
      projectId: personalProject.id,
      title: 'Call mom',
      priority: 'none' as const,
      dueDate: nextWeek,
    },
    {
      userId: demoUser.id,
      title: 'Learn TypeScript generics',
      description: 'Complete the advanced TypeScript course chapter on generics',
      priority: 'low' as const,
    },
  ]

  await db.insert(tasks).values(sampleTasks)
  console.log('Created', sampleTasks.length, 'sample tasks')

  // Create a task with subtasks
  const [parentTask] = await db.insert(tasks).values({
    userId: demoUser.id,
    projectId: workProject.id,
    title: 'Launch new feature',
    description: 'Complete all steps to launch the user dashboard feature',
    priority: 'high' as const,
    dueDate: nextWeek,
  }).returning()

  const subtasks = [
    { title: 'Write unit tests', estimatedMinutes: 120 },
    { title: 'Update documentation', estimatedMinutes: 60 },
    { title: 'Create demo video', estimatedMinutes: 90 },
    { title: 'Send announcement email', estimatedMinutes: 30 },
  ]

  await db.insert(tasks).values(
    subtasks.map((st, index) => ({
      userId: demoUser.id,
      parentTaskId: parentTask.id,
      title: st.title,
      estimatedMinutes: st.estimatedMinutes,
      sortOrder: index,
    }))
  )

  console.log('Created parent task with', subtasks.length, 'subtasks')

  console.log('Seeding complete!')
}

// Run seed
seed()
  .catch(console.error)
  .finally(() => process.exit())
```

### 9.2 Running Seeds

```bash
# Development
pnpm db:seed

# Reset and reseed (development only!)
pnpm db:reset && pnpm db:seed
```

---

## 10. Query Patterns

### 10.1 Common Queries

**Get Today's Tasks:**

```typescript
const getTodayTasks = async (userId: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.status, 'pending'),
      isNull(tasks.deletedAt),
      or(
        // Due today
        and(
          gte(tasks.dueDate, today),
          lt(tasks.dueDate, tomorrow)
        ),
        // Scheduled for today
        eq(tasks.scheduledDate, today),
        // Overdue
        lt(tasks.dueDate, today)
      )
    ),
    orderBy: [
      asc(tasks.dueDate),
      desc(tasks.priority),
      asc(tasks.sortOrder)
    ],
    with: {
      project: true,
      subtasks: {
        where: isNull(tasks.deletedAt),
        orderBy: asc(tasks.sortOrder)
      }
    }
  })
}
```

**Get Tasks by Project:**

```typescript
const getProjectTasks = async (userId: string, projectId: string) => {
  return db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.projectId, projectId),
      isNull(tasks.parentTaskId),  // Top-level tasks only
      isNull(tasks.deletedAt)
    ),
    orderBy: [asc(tasks.sortOrder)],
    with: {
      subtasks: {
        where: isNull(tasks.deletedAt),
        orderBy: asc(tasks.sortOrder)
      }
    }
  })
}
```

**Search Tasks:**

```typescript
const searchTasks = async (userId: string, query: string) => {
  return db.execute(sql`
    SELECT
      t.*,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
    FROM tasks t
    WHERE
      t.user_id = ${userId}
      AND t.deleted_at IS NULL
      AND t.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT 50
  `)
}
```

**Get Overdue Tasks Count:**

```typescript
const getOverdueCount = async (userId: string) => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.status, 'pending'),
      lt(tasks.dueDate, new Date()),
      isNull(tasks.deletedAt)
    ))

  return result[0].count
}
```

**Get Task with Full Context:**

```typescript
const getTaskWithContext = async (userId: string, taskId: string) => {
  return db.query.tasks.findFirst({
    where: and(
      eq(tasks.id, taskId),
      eq(tasks.userId, userId)
    ),
    with: {
      project: true,
      parentTask: true,
      subtasks: {
        where: isNull(tasks.deletedAt),
        orderBy: asc(tasks.sortOrder)
      },
      aiContext: {
        where: eq(aiContext.isCurrent, true),
        orderBy: desc(aiContext.updatedAt)
      }
    }
  })
}
```

### 10.2 AI-Related Queries

**Get Conversation with Messages:**

```typescript
const getConversation = async (conversationId: string, userId: string) => {
  return db.query.aiConversations.findFirst({
    where: and(
      eq(aiConversations.id, conversationId),
      eq(aiConversations.userId, userId)
    ),
    with: {
      messages: {
        orderBy: asc(aiMessages.createdAt)
      },
      task: true
    }
  })
}
```

**Get AI Usage for Period:**

```typescript
const getUsageForPeriod = async (
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  return db.query.aiUsage.findFirst({
    where: and(
      eq(aiUsage.userId, userId),
      eq(aiUsage.periodStart, startDate),
      eq(aiUsage.periodEnd, endDate)
    )
  })
}
```

### 10.3 Analytics Queries

**Tasks Completed This Week:**

```typescript
const getWeeklyCompletedTasks = async (userId: string) => {
  const weekStart = startOfWeek(new Date())

  return db
    .select({
      date: sql<string>`DATE(completed_at)`,
      count: sql<number>`count(*)`,
      totalMinutes: sql<number>`sum(actual_minutes)`
    })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.status, 'completed'),
      gte(tasks.completedAt, weekStart)
    ))
    .groupBy(sql`DATE(completed_at)`)
    .orderBy(sql`DATE(completed_at)`)
}
```

**Project Progress:**

```typescript
const getProjectProgress = async (userId: string, projectId: string) => {
  const result = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) FILTER (WHERE status = 'completed')`,
      pending: sql<number>`count(*) FILTER (WHERE status = 'pending')`,
      overdue: sql<number>`count(*) FILTER (WHERE status = 'pending' AND due_date < NOW())`
    })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.projectId, projectId),
      isNull(tasks.deletedAt)
    ))

  return result[0]
}
```

---

## 11. Drizzle Schema

### 11.1 Complete Schema File

```typescript
// lib/db/schema.ts

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  inet,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ============================================================================
// ENUMS
// ============================================================================

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'deleted',
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'high',
  'medium',
  'low',
  'none',
])

export const messageRoleEnum = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
])

export const conversationTypeEnum = pgEnum('conversation_type', [
  'general',
  'decompose',
  'research',
  'draft',
  'planning',
  'coaching',
])

export const aiContextTypeEnum = pgEnum('ai_context_type', [
  'research',
  'draft',
  'outline',
  'summary',
  'suggestion',
  'note',
])

export const reminderTypeEnum = pgEnum('reminder_type', [
  'due_date',
  'scheduled',
  'custom',
  'follow_up',
])

// ============================================================================
// CORE ENTITIES
// ============================================================================

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  preferences: jsonb('preferences').$type<UserPreferences>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}))

// Projects
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').default(0),
  isArchived: boolean('is_archived').default(false),
  isFavorite: boolean('is_favorite').default(false),
  settings: jsonb('settings').$type<ProjectSettings>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.userId),
  parentIdIdx: index('projects_parent_id_idx').on(table.parentId),
}))

// Tasks
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  parentTaskId: uuid('parent_task_id').references(() => tasks.id, { onDelete: 'cascade' }),

  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('pending').notNull(),
  priority: taskPriorityEnum('priority').default('none').notNull(),

  dueDate: timestamp('due_date', { withTimezone: true }),
  dueDateHasTime: boolean('due_date_has_time').default(false),
  scheduledDate: date('scheduled_date'),
  startDate: date('start_date'),

  estimatedMinutes: integer('estimated_minutes'),
  actualMinutes: integer('actual_minutes'),

  sortOrder: integer('sort_order').default(0),

  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: jsonb('recurrence_rule').$type<RecurrenceRule>(),
  recurrenceParentId: uuid('recurrence_parent_id').references(() => tasks.id, { onDelete: 'set null' }),

  metadata: jsonb('metadata').$type<TaskMetadata>().default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  userIdStatusIdx: index('tasks_user_id_status_idx').on(table.userId, table.status),
  projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
  parentTaskIdIdx: index('tasks_parent_task_id_idx').on(table.parentTaskId),
  dueDateIdx: index('tasks_due_date_idx').on(table.userId, table.dueDate),
  scheduledDateIdx: index('tasks_scheduled_date_idx').on(table.userId, table.scheduledDate),
}))

// Tags
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6b7280'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  uniqueNamePerUser: uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
}))

// Task Tags (Junction)
export const taskTags = pgTable('task_tags', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.tagId] }),
  taskIdIdx: index('task_tags_task_id_idx').on(table.taskId),
  tagIdIdx: index('task_tags_tag_id_idx').on(table.tagId),
}))

// Reminders
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  type: reminderTypeEnum('type').notNull(),
  isSent: boolean('is_sent').default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  channels: text('channels').array().default(['push']),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  remindAtIdx: index('reminders_remind_at_idx').on(table.remindAt),
  taskIdIdx: index('reminders_task_id_idx').on(table.taskId),
}))

// Activity Log
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  changes: jsonb('changes').$type<ActivityChanges>(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityIdx: index('activity_log_entity_idx').on(table.entityType, table.entityId),
  userCreatedIdx: index('activity_log_user_created_idx').on(table.userId, table.createdAt),
}))

// ============================================================================
// AI ENTITIES
// ============================================================================

// AI Conversations
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }),
  type: conversationTypeEnum('type').default('general').notNull(),
  isArchived: boolean('is_archived').default(false),
  totalTokens: integer('total_tokens').default(0),
  messageCount: integer('message_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
  taskIdIdx: index('ai_conversations_task_id_idx').on(table.taskId),
}))

// AI Messages
export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  model: varchar('model', { length: 100 }),
  metadata: jsonb('metadata').$type<MessageMetadata>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
}))

// AI Context
export const aiContext = pgTable('ai_context', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'set null' }),
  type: aiContextTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  version: integer('version').default(1),
  isCurrent: boolean('is_current').default(true),
  metadata: jsonb('metadata').$type<AIContextMetadata>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index('ai_context_task_id_idx').on(table.taskId),
  typeIdx: index('ai_context_type_idx').on(table.type),
}))

// AI Usage
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  requests: integer('requests').default(0),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  usageByFeature: jsonb('usage_by_feature').$type<UsageByFeature>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPeriodIdx: uniqueIndex('ai_usage_user_period_idx').on(table.userId, table.periodStart, table.periodEnd),
}))

// ============================================================================
// AUTH ENTITIES
// ============================================================================

// Accounts (OAuth)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 50 }),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerAccountIdx: uniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
}))

// Sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresIdx: index('sessions_expires_idx').on(table.expires),
}))

// Verification Tokens
export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}))

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  tags: many(tags),
  aiConversations: many(aiConversations),
  aiUsage: many(aiUsage),
  accounts: many(accounts),
  sessions: many(sessions),
  activityLog: many(activityLog),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  parent: one(projects, { fields: [projects.parentId], references: [projects.id] }),
  children: many(projects),
  tasks: many(tasks),
  aiConversations: many(aiConversations),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id] }),
  subtasks: many(tasks),
  recurrenceParent: one(tasks, { fields: [tasks.recurrenceParentId], references: [tasks.id] }),
  taskTags: many(taskTags),
  reminders: many(reminders),
  aiConversations: many(aiConversations),
  aiContext: many(aiContext),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  taskTags: many(taskTags),
}))

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}))

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
  task: one(tasks, { fields: [aiConversations.taskId], references: [tasks.id] }),
  project: one(projects, { fields: [aiConversations.projectId], references: [projects.id] }),
  messages: many(aiMessages),
  aiContext: many(aiContext),
}))

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}))

export const aiContextRelations = relations(aiContext, ({ one }) => ({
  task: one(tasks, { fields: [aiContext.taskId], references: [tasks.id] }),
  conversation: one(aiConversations, { fields: [aiContext.conversationId], references: [aiConversations.id] }),
}))

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  defaultView?: 'today' | 'upcoming' | 'inbox'
  sidebarCollapsed?: boolean
  timezone?: string
  weekStartsOn?: 0 | 1 | 6
  timeFormat?: '12h' | '24h'
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  emailNotifications?: boolean
  pushNotifications?: boolean
  dailyDigestTime?: string
  quietHoursStart?: string
  quietHoursEnd?: string
  aiEnabled?: boolean
  aiSuggestionsEnabled?: boolean
  aiSuggestionFrequency?: 'low' | 'medium' | 'high'
  aiCommunicationStyle?: 'concise' | 'detailed'
  aiDataLearning?: boolean
  defaultPriority?: 'high' | 'medium' | 'low' | 'none'
  defaultProjectId?: string | null
  autoArchiveCompleted?: boolean
  autoArchiveDays?: number
}

export interface ProjectSettings {
  defaultPriority?: 'high' | 'medium' | 'low' | 'none'
  defaultTags?: string[]
  aiContextPrompt?: string
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  weekOfMonth?: number
  dayOfWeekInMonth?: number
  endDate?: string
  count?: number
  createdAt: string
  lastGeneratedAt?: string
  nextOccurrence?: string
}

export interface TaskMetadata {
  source?: 'manual' | 'ai_suggested' | 'recurring' | 'import'
  importedFrom?: string
  aiGenerated?: boolean
  aiDecomposedFrom?: string
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
    uploadedAt: string
  }>
  links?: Array<{
    url: string
    title?: string
    favicon?: string
  }>
  relatedTaskIds?: string[]
  blockedByTaskIds?: string[]
  blockingTaskIds?: string[]
  timeSessions?: Array<{
    startedAt: string
    endedAt?: string
    minutes: number
  }>
}

export interface MessageMetadata {
  processingTimeMs?: number
  finishReason?: 'stop' | 'max_tokens' | 'error'
  attachedFiles?: string[]
  actions?: Array<{
    type: 'created_subtask' | 'saved_research' | 'saved_draft'
    entityId: string
  }>
  userRating?: 'helpful' | 'not_helpful'
  userFeedback?: string
}

export interface AIContextMetadata {
  sources?: Array<{
    url?: string
    title?: string
    snippet?: string
  }>
  draftType?: 'email' | 'document' | 'outline' | 'general'
  wordCount?: number
  suggestionType?: 'subtask' | 'priority' | 'deadline' | 'approach'
  applied?: boolean
  appliedAt?: string
  model?: string
  promptVersion?: string
}

export interface UsageByFeature {
  chat?: { requests: number; tokens: number }
  decompose?: { requests: number; tokens: number }
  research?: { requests: number; tokens: number }
  draft?: { requests: number; tokens: number }
  suggestions?: { requests: number; tokens: number }
}

export interface ActivityChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  fields?: string[]
}
```

---

## Appendix A: Quick Reference

### Table Summary

| Table | Description | Key Indexes |
|-------|-------------|-------------|
| `users` | User accounts | email |
| `projects` | Task containers | user_id, parent_id |
| `tasks` | Todo items | user_id+status, due_date, search |
| `tags` | Labels | user_id+name |
| `task_tags` | Task-tag junction | task_id, tag_id |
| `reminders` | Notifications | remind_at, task_id |
| `activity_log` | Audit trail | entity, user+created |
| `ai_conversations` | Chat sessions | user_id, task_id |
| `ai_messages` | Chat messages | conversation_id |
| `ai_context` | Stored AI content | task_id, type |
| `ai_usage` | Usage tracking | user+period |
| `accounts` | OAuth links | provider+account_id |
| `sessions` | Auth sessions | user_id, expires |
| `verification_tokens` | Email tokens | identifier+token |

### Common Queries Cheat Sheet

```sql
-- Today's tasks
SELECT * FROM tasks
WHERE user_id = ? AND status = 'pending' AND deleted_at IS NULL
  AND (due_date::date = CURRENT_DATE OR scheduled_date = CURRENT_DATE OR due_date < NOW());

-- Overdue count
SELECT count(*) FROM tasks
WHERE user_id = ? AND status = 'pending' AND due_date < NOW() AND deleted_at IS NULL;

-- Search tasks
SELECT * FROM tasks
WHERE user_id = ? AND search_vector @@ plainto_tsquery('english', ?);

-- Task with subtasks
SELECT * FROM tasks WHERE id = ? OR parent_task_id = ?;

-- Project progress
SELECT
  count(*) as total,
  count(*) FILTER (WHERE status = 'completed') as done
FROM tasks WHERE project_id = ? AND deleted_at IS NULL;
```

---

*Document End*
