# AI-Aided To Do Application
## Technical Architecture Document

**Version:** 1.0
**Date:** January 2026
**Status:** Architecture Phase
**Based On:** Feature-Requirements.md v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [AI Integration](#6-ai-integration)
7. [Data Architecture](#7-data-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-time Features](#9-real-time-features)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Security](#11-security)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Development Practices](#13-development-practices)

---

## 1. Overview

### 1.1 Architecture Goals

| Goal | Description | Approach |
|------|-------------|----------|
| **Performance** | Fast, responsive user experience | Edge deployment, optimistic UI, caching |
| **Scalability** | Support growth from 1K to 100K+ users | Serverless architecture, horizontal scaling |
| **Reliability** | 99.9% uptime target | Redundancy, graceful degradation |
| **Security** | Protect user data and AI interactions | Encryption, authentication, rate limiting |
| **Developer Experience** | Fast iteration, maintainable code | TypeScript, modern tooling, clear patterns |
| **Cost Efficiency** | Optimize AI and infrastructure costs | Smart caching, usage tiers, efficient queries |

### 1.2 Architecture Principles

1. **Server Components First** - Leverage Next.js App Router for optimal performance
2. **Edge Where Possible** - Deploy compute close to users
3. **Type Safety Throughout** - TypeScript end-to-end with strict mode
4. **Optimistic Updates** - UI responds immediately, syncs in background
5. **AI Cost Awareness** - Cache, batch, and optimize AI requests
6. **Privacy by Design** - Minimize data collection, encrypt sensitive data

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Browser   │  │   Mobile    │  │   PWA       │  │   API       │    │
│  │   (React)   │  │   (Future)  │  │   Install   │  │   Clients   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EDGE NETWORK (Vercel)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Application                           │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │   │
│  │  │ Static Assets │  │ Server Comp.  │  │  API Routes   │       │   │
│  │  │   (CDN)       │  │  (Edge/Node)  │  │  (Serverless) │       │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    DATABASE     │    │   AI SERVICES   │    │  EXTERNAL APIs  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ PostgreSQL│  │    │  │  Claude   │  │    │  │  Google   │  │
│  │ (Neon)    │  │    │  │   API     │  │    │  │  Calendar │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Redis   │  │    │  │  OpenAI   │  │    │  │  OAuth    │  │
│  │ (Upstash) │  │    │  │ (backup)  │  │    │  │ Providers │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 2. Technology Stack

### 2.1 Core Stack Decision Matrix

| Layer | Technology | Alternatives Considered | Decision Rationale |
|-------|------------|------------------------|-------------------|
| **Framework** | Next.js 14+ (App Router) | Remix, SvelteKit | Best React ecosystem, Vercel optimization, RSC support |
| **Language** | TypeScript 5+ | JavaScript | Type safety, better DX, fewer runtime errors |
| **Styling** | Tailwind CSS + shadcn/ui | Styled Components, CSS Modules | Utility-first, great DX, accessible components |
| **State** | Zustand + React Query | Redux, Jotai | Simple API, excellent server state handling |
| **Database** | PostgreSQL (Neon) | PlanetScale, Supabase | Serverless Postgres, branching, generous free tier |
| **ORM** | Drizzle ORM | Prisma, Kysely | Type-safe, lightweight, edge-compatible |
| **Auth** | NextAuth.js v5 | Clerk, Auth0 | Flexible, self-hosted option, good Next.js integration |
| **AI** | Anthropic Claude API | OpenAI, Cohere | Superior reasoning, longer context, better for tasks |
| **Cache** | Redis (Upstash) | Vercel KV | Serverless Redis, rate limiting, session storage |
| **Hosting** | Vercel | AWS, Railway | Optimal Next.js deployment, edge network, easy scaling |
| **Monitoring** | Vercel Analytics + Sentry | DataDog, LogRocket | Integrated, cost-effective, good coverage |

### 2.2 Complete Technology Stack

```
FRONTEND
├── Framework: Next.js 14+ (App Router)
├── Language: TypeScript 5.3+
├── UI Components: shadcn/ui (Radix primitives)
├── Styling: Tailwind CSS 3.4+
├── State Management:
│   ├── Server State: TanStack Query (React Query) v5
│   ├── Client State: Zustand
│   └── Form State: React Hook Form + Zod
├── Rich Text: Tiptap (ProseMirror-based)
├── Date Handling: date-fns
├── Icons: Lucide React
└── Animations: Framer Motion

BACKEND
├── Runtime: Node.js 20+ (LTS)
├── API: Next.js API Routes + Server Actions
├── Validation: Zod
├── Database ORM: Drizzle ORM
├── Authentication: NextAuth.js v5
├── Rate Limiting: Upstash Ratelimit
├── Background Jobs: Vercel Cron + Inngest
└── Email: Resend

DATA
├── Primary Database: PostgreSQL (Neon)
├── Cache/Sessions: Redis (Upstash)
├── File Storage: Vercel Blob / AWS S3
└── Search: PostgreSQL Full-Text (initial), Typesense (scale)

AI SERVICES
├── Primary: Anthropic Claude API (claude-3-sonnet)
├── Embeddings: OpenAI text-embedding-3-small
├── Fallback: OpenAI GPT-4 Turbo
└── Vector Store: pgvector (PostgreSQL extension)

INFRASTRUCTURE
├── Hosting: Vercel
├── DNS: Vercel / Cloudflare
├── CDN: Vercel Edge Network
├── Monitoring: Vercel Analytics + Sentry
└── CI/CD: GitHub Actions + Vercel

DEVELOPMENT
├── Package Manager: pnpm
├── Linting: ESLint + Prettier
├── Testing: Vitest + Playwright
├── Git Hooks: Husky + lint-staged
└── Documentation: TypeDoc + Storybook
```

### 2.3 Version Requirements

```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 3. System Architecture

### 3.1 Application Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React Components (Server + Client)                      │    │
│  │  ├── Pages (app router)                                  │    │
│  │  ├── Layouts                                             │    │
│  │  ├── UI Components (shadcn/ui)                           │    │
│  │  └── Feature Components                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      APPLICATION LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Business Logic & State                                  │    │
│  │  ├── Server Actions                                      │    │
│  │  ├── API Route Handlers                                  │    │
│  │  ├── React Query Hooks                                   │    │
│  │  └── Zustand Stores                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                       SERVICE LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Domain Services                                         │    │
│  │  ├── TaskService                                         │    │
│  │  ├── ProjectService                                      │    │
│  │  ├── AIService                                           │    │
│  │  ├── UserService                                         │    │
│  │  └── NotificationService                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Data Access                                             │    │
│  │  ├── Drizzle ORM (PostgreSQL)                            │    │
│  │  ├── Redis Client (Upstash)                              │    │
│  │  ├── AI Client (Anthropic SDK)                           │    │
│  │  └── External API Clients                                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
ai-todo/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Main app route group
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Redirects to /today
│   │   ├── today/
│   │   ├── upcoming/
│   │   ├── projects/
│   │   │   └── [projectId]/
│   │   ├── task/
│   │   │   └── [taskId]/
│   │   └── settings/
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── ai/
│   │   └── webhooks/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── features/                 # Feature-specific components
│   │   ├── tasks/
│   │   │   ├── task-card.tsx
│   │   │   ├── task-list.tsx
│   │   │   ├── task-detail.tsx
│   │   │   ├── task-form.tsx
│   │   │   └── subtask-list.tsx
│   │   ├── projects/
│   │   ├── ai/
│   │   │   ├── ai-panel.tsx
│   │   │   ├── ai-chat.tsx
│   │   │   ├── ai-suggestions.tsx
│   │   │   └── ai-message.tsx
│   │   └── planning/
│   ├── layouts/
│   │   ├── dashboard-layout.tsx
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── shared/
│       ├── command-palette.tsx
│       ├── date-picker.tsx
│       └── rich-text-editor.tsx
│
├── lib/                          # Utilities and configuration
│   ├── db/
│   │   ├── index.ts              # Database client
│   │   ├── schema.ts             # Drizzle schema
│   │   └── migrations/
│   ├── ai/
│   │   ├── client.ts             # AI client wrapper
│   │   ├── prompts.ts            # System prompts
│   │   └── tools.ts              # AI tool definitions
│   ├── auth/
│   │   ├── config.ts             # NextAuth config
│   │   └── helpers.ts
│   ├── utils/
│   │   ├── cn.ts                 # Class name utility
│   │   ├── date.ts               # Date helpers
│   │   └── validation.ts
│   └── constants.ts
│
├── services/                     # Business logic services
│   ├── task.service.ts
│   ├── project.service.ts
│   ├── ai.service.ts
│   ├── user.service.ts
│   └── notification.service.ts
│
├── hooks/                        # Custom React hooks
│   ├── use-tasks.ts
│   ├── use-projects.ts
│   ├── use-ai-chat.ts
│   └── use-keyboard-shortcuts.ts
│
├── stores/                       # Zustand stores
│   ├── ui.store.ts               # UI state (sidebar, modals)
│   ├── task.store.ts             # Optimistic task updates
│   └── ai.store.ts               # AI conversation state
│
├── types/                        # TypeScript types
│   ├── task.ts
│   ├── project.ts
│   ├── user.ts
│   ├── ai.ts
│   └── api.ts
│
├── config/                       # Configuration
│   ├── site.ts                   # Site metadata
│   └── nav.ts                    # Navigation config
│
├── public/                       # Static assets
│   ├── icons/
│   └── images/
│
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # Documentation
│   ├── UX-UI-Design-Document.md
│   ├── Feature-Requirements.md
│   └── Technical-Architecture.md
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
└── package.json
```

---

## 4. Frontend Architecture

### 4.1 Component Architecture

#### Component Categories

```
COMPONENTS
│
├── UI Components (components/ui/)
│   │   Pure presentational, no business logic
│   │   Reusable across features
│   │   Based on shadcn/ui + Radix
│   └── Examples: Button, Input, Dialog, Card
│
├── Feature Components (components/features/)
│   │   Feature-specific, contain business logic
│   │   Compose UI components
│   │   Connected to state/data
│   └── Examples: TaskCard, AIChat, ProjectList
│
├── Layout Components (components/layouts/)
│   │   Page structure and navigation
│   │   Handle responsive behavior
│   └── Examples: DashboardLayout, Sidebar
│
└── Shared Components (components/shared/)
        Cross-feature reusable with logic
        Complex compositions
        Examples: CommandPalette, RichTextEditor
```

#### Component Conventions

```typescript
// components/features/tasks/task-card.tsx

import { type FC } from 'react'
import { type Task } from '@/types/task'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useTaskMutations } from '@/hooks/use-tasks'
import { cn } from '@/lib/utils/cn'

interface TaskCardProps {
  task: Task
  isSelected?: boolean
  onSelect?: (taskId: string) => void
}

export const TaskCard: FC<TaskCardProps> = ({
  task,
  isSelected = false,
  onSelect,
}) => {
  const { completeTask } = useTaskMutations()

  const handleComplete = () => {
    completeTask.mutate(task.id)
  }

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-colors',
        isSelected && 'ring-2 ring-primary',
        task.completed && 'opacity-60'
      )}
      onClick={() => onSelect?.(task.id)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleComplete}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-medium truncate',
            task.completed && 'line-through'
          )}>
            {task.title}
          </h3>
          {task.dueDate && (
            <p className="text-sm text-muted-foreground">
              Due: {formatDate(task.dueDate)}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
```

### 4.2 State Management

#### State Categories

```
STATE MANAGEMENT
│
├── Server State (TanStack Query)
│   │   Data from API
│   │   Cached, refetched automatically
│   │   Optimistic updates
│   └── Examples: tasks, projects, user data
│
├── Client State (Zustand)
│   │   UI state not from server
│   │   Persisted to localStorage (some)
│   └── Examples: sidebar open, selected task, theme
│
├── Form State (React Hook Form)
│   │   Form inputs and validation
│   │   Scoped to form lifecycle
│   └── Examples: task creation, settings forms
│
└── URL State (Next.js)
        Route-based state
        Shareable, bookmarkable
        Examples: filters, current view, task ID
```

#### Server State with TanStack Query

```typescript
// hooks/use-tasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskService } from '@/services/task.service'
import { type Task, type CreateTaskInput } from '@/types/task'

// Query keys factory
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Fetch tasks hook
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => taskService.getTasks(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Fetch single task
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => taskService.getTask(taskId),
    enabled: !!taskId,
  })
}

// Mutations hook
export function useTaskMutations() {
  const queryClient = useQueryClient()

  const createTask = useMutation({
    mutationFn: (input: CreateTaskInput) => taskService.createTask(input),
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(taskKeys.lists())

      // Optimistically add new task
      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) => [
        { ...newTask, id: 'temp-' + Date.now(), createdAt: new Date() },
        ...old,
      ])

      return { previousTasks }
    },
    onError: (err, newTask, context) => {
      // Rollback on error
      queryClient.setQueryData(taskKeys.lists(), context?.previousTasks)
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })

  const completeTask = useMutation({
    mutationFn: (taskId: string) => taskService.completeTask(taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      const previousTasks = queryClient.getQueryData(taskKeys.lists())

      queryClient.setQueryData(taskKeys.lists(), (old: Task[] = []) =>
        old.map((task) =>
          task.id === taskId
            ? { ...task, completed: true, completedAt: new Date() }
            : task
        )
      )

      return { previousTasks }
    },
    onError: (err, taskId, context) => {
      queryClient.setQueryData(taskKeys.lists(), context?.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })

  return { createTask, completeTask }
}
```

#### Client State with Zustand

```typescript
// stores/ui.store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void

  // AI Panel
  aiPanelOpen: boolean
  toggleAIPanel: () => void

  // Selected items
  selectedTaskId: string | null
  setSelectedTask: (id: string | null) => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarWidth: 280,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      // AI Panel
      aiPanelOpen: false,
      toggleAIPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),

      // Selected items
      selectedTaskId: null,
      setSelectedTask: (id) => set({ selectedTaskId: id }),

      // Command palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ai-todo-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
    }
  )
)
```

### 4.3 Data Fetching Patterns

#### Server Components (Default)

```typescript
// app/(dashboard)/today/page.tsx

import { getTodayTasks } from '@/services/task.service'
import { TaskList } from '@/components/features/tasks/task-list'
import { DailyBriefing } from '@/components/features/planning/daily-briefing'
import { getCurrentUser } from '@/lib/auth/helpers'

export default async function TodayPage() {
  const user = await getCurrentUser()
  const tasks = await getTodayTasks(user.id)

  return (
    <div className="space-y-6">
      <DailyBriefing userId={user.id} />
      <TaskList tasks={tasks} />
    </div>
  )
}
```

#### Client Components (When Needed)

```typescript
// components/features/tasks/task-list-client.tsx
'use client'

import { useTasks } from '@/hooks/use-tasks'
import { TaskCard } from './task-card'
import { TaskListSkeleton } from './task-list-skeleton'

interface TaskListClientProps {
  filters: TaskFilters
}

export function TaskListClient({ filters }: TaskListClientProps) {
  const { data: tasks, isLoading, error } = useTasks(filters)

  if (isLoading) return <TaskListSkeleton />
  if (error) return <TaskListError error={error} />

  return (
    <div className="space-y-2">
      {tasks?.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### 4.4 Form Handling

```typescript
// components/features/tasks/task-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTaskMutations } from '@/hooks/use-tasks'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(['high', 'medium', 'low', 'none']).default('none'),
  projectId: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  onSuccess?: () => void
  defaultValues?: Partial<TaskFormData>
}

export function TaskForm({ onSuccess, defaultValues }: TaskFormProps) {
  const { createTask } = useTaskMutations()

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      priority: 'none',
      ...defaultValues,
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    await createTask.mutateAsync(data)
    form.reset()
    onSuccess?.()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input
        {...form.register('title')}
        placeholder="What needs to be done?"
        error={form.formState.errors.title?.message}
      />
      {/* Additional fields */}
      <Button type="submit" loading={createTask.isPending}>
        Add Task
      </Button>
    </form>
  )
}
```

---

## 5. Backend Architecture

### 5.1 API Design

#### API Routes Structure

```
app/api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts              # NextAuth handler
├── tasks/
│   ├── route.ts                  # GET (list), POST (create)
│   └── [taskId]/
│       ├── route.ts              # GET, PATCH, DELETE
│       ├── complete/
│       │   └── route.ts          # POST - complete task
│       └── subtasks/
│           └── route.ts          # GET, POST subtasks
├── projects/
│   ├── route.ts
│   └── [projectId]/
│       └── route.ts
├── ai/
│   ├── chat/
│   │   └── route.ts              # POST - AI conversation
│   ├── decompose/
│   │   └── route.ts              # POST - Break down task
│   ├── research/
│   │   └── route.ts              # POST - Research topic
│   └── draft/
│       └── route.ts              # POST - Generate content
├── users/
│   └── me/
│       ├── route.ts              # GET, PATCH current user
│       └── preferences/
│           └── route.ts
└── webhooks/
    └── stripe/
        └── route.ts
```

#### API Route Implementation

```typescript
// app/api/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { createTaskSchema } from '@/types/task'

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const filters = {
      status: searchParams.get('status') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      dueDate: searchParams.get('dueDate') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '50'),
      offset: parseInt(searchParams.get('offset') ?? '0'),
    }

    const tasks = await taskService.getTasks(user.id, filters)

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create task
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    const task = await taskService.createTask(user.id, validatedData)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 5.2 Server Actions

```typescript
// app/(dashboard)/today/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/helpers'
import { taskService } from '@/services/task.service'
import { createTaskSchema } from '@/types/task'

export async function createTaskAction(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    dueDate: formData.get('dueDate'),
    priority: formData.get('priority'),
    projectId: formData.get('projectId'),
  }

  const validatedData = createTaskSchema.parse(rawData)
  const task = await taskService.createTask(user.id, validatedData)

  revalidatePath('/today')
  revalidatePath('/upcoming')

  return task
}

export async function completeTaskAction(taskId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  await taskService.completeTask(user.id, taskId)

  revalidatePath('/today')
  revalidatePath('/upcoming')
}

export async function deleteTaskAction(taskId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  await taskService.deleteTask(user.id, taskId)

  revalidatePath('/today')
  revalidatePath('/upcoming')
}
```

### 5.3 Service Layer

```typescript
// services/task.service.ts

import { db } from '@/lib/db'
import { tasks, subtasks } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm'
import { type CreateTaskInput, type UpdateTaskInput, type Task } from '@/types/task'

class TaskService {
  async getTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const conditions = [eq(tasks.userId, userId)]

    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status))
    }
    if (filters.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId))
    }
    if (filters.dueDateFrom) {
      conditions.push(gte(tasks.dueDate, filters.dueDateFrom))
    }
    if (filters.dueDateTo) {
      conditions.push(lte(tasks.dueDate, filters.dueDateTo))
    }

    const result = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(
        filters.sortBy === 'dueDate' ? asc(tasks.dueDate) : desc(tasks.createdAt)
      )
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0)

    return result
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1)

    return result[0] ?? null
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...input,
        userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return task
  }

  async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskInput
  ): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning()

    return task
  }

  async completeTask(userId: string, taskId: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning()

    return task
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    // Soft delete - move to trash
    await db
      .update(tasks)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
  }

  async getTodayTasks(userId: string): Promise<Task[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.getTasks(userId, {
      dueDateFrom: today,
      dueDateTo: tomorrow,
      status: 'pending',
    })
  }
}

export const taskService = new TaskService()
```

### 5.4 Validation Schemas

```typescript
// types/task.ts

import { z } from 'zod'

// Base task schema
export const taskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']),
  priority: z.enum(['high', 'medium', 'low', 'none']),
  dueDate: z.date().optional(),
  scheduledDate: z.date().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  actualMinutes: z.number().int().positive().optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  deletedAt: z.date().optional(),
})

export type Task = z.infer<typeof taskSchema>

// Create task input
export const createTaskSchema = taskSchema.pick({
  title: true,
  description: true,
  priority: true,
  dueDate: true,
  scheduledDate: true,
  estimatedMinutes: true,
  projectId: true,
  parentTaskId: true,
  tags: true,
}).partial({
  description: true,
  priority: true,
  dueDate: true,
  scheduledDate: true,
  estimatedMinutes: true,
  projectId: true,
  parentTaskId: true,
  tags: true,
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

// Update task input
export const updateTaskSchema = createTaskSchema.partial()

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

// Task filters
export const taskFiltersSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'deleted']).optional(),
  priority: z.enum(['high', 'medium', 'low', 'none']).optional(),
  projectId: z.string().uuid().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export type TaskFilters = z.infer<typeof taskFiltersSchema>
```

---

## 6. AI Integration

### 6.1 AI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI SERVICE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  AI Router   │───▶│  AI Client   │───▶│  Claude API  │      │
│  │              │    │   Wrapper    │    │  (Primary)   │      │
│  │  - Rate      │    │              │    └──────────────┘      │
│  │    limiting  │    │  - Retry     │                          │
│  │  - Routing   │    │  - Timeout   │    ┌──────────────┐      │
│  │  - Caching   │    │  - Fallback  │───▶│  OpenAI API  │      │
│  │              │    │              │    │  (Fallback)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PROMPT MANAGEMENT                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  System    │  │   Task     │  │   Tool     │         │  │
│  │  │  Prompts   │  │  Context   │  │ Definitions│         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   CONTEXT MANAGEMENT                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │ Conversation│ │  Research  │  │   Draft    │         │  │
│  │  │  History   │  │  Results   │  │  Versions  │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 AI Client Implementation

```typescript
// lib/ai/client.ts

import Anthropic from '@anthropic-ai/sdk'
import { type Message, type MessageParam } from '@anthropic-ai/sdk/resources'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Rate limiter per user
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
})

interface AIRequestOptions {
  userId: string
  taskId?: string
  model?: 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307'
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string
}

class AIClient {
  async chat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    // Check rate limit
    const { success, limit, remaining } = await ratelimit.limit(options.userId)
    if (!success) {
      throw new AIRateLimitError('Rate limit exceeded', { limit, remaining })
    }

    try {
      const response = await anthropic.messages.create({
        model: options.model ?? 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        system: systemPrompt,
        messages,
      })

      return {
        content: response.content[0].type === 'text'
          ? response.content[0].text
          : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        stopReason: response.stop_reason ?? 'unknown',
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        // Handle specific API errors
        if (error.status === 429) {
          throw new AIRateLimitError('API rate limit exceeded')
        }
        if (error.status >= 500) {
          // Try fallback to OpenAI
          return this.fallbackToOpenAI(messages, systemPrompt, options)
        }
      }
      throw error
    }
  }

  async streamChat(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): AsyncGenerator<string, void, unknown> {
    const { success } = await ratelimit.limit(options.userId)
    if (!success) {
      throw new AIRateLimitError('Rate limit exceeded')
    }

    const stream = await anthropic.messages.stream({
      model: options.model ?? 'claude-3-sonnet-20240229',
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }

  private async fallbackToOpenAI(
    messages: MessageParam[],
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    // Implement OpenAI fallback
    // Convert messages format and call OpenAI API
    throw new Error('OpenAI fallback not implemented')
  }
}

export const aiClient = new AIClient()

// Custom error classes
export class AIRateLimitError extends Error {
  constructor(
    message: string,
    public details?: { limit: number; remaining: number }
  ) {
    super(message)
    this.name = 'AIRateLimitError'
  }
}
```

### 6.3 AI Service Implementation

```typescript
// services/ai.service.ts

import { aiClient } from '@/lib/ai/client'
import {
  getSystemPrompt,
  getDecomposePrompt,
  getResearchPrompt,
  getDraftPrompt
} from '@/lib/ai/prompts'
import { db } from '@/lib/db'
import { aiConversations, aiMessages } from '@/lib/db/schema'
import { type Task } from '@/types/task'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

class AIService {
  // General chat with task context
  async chat(
    userId: string,
    taskId: string,
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<{ response: string; conversationId: string }> {
    // Get task context
    const task = await this.getTaskContext(userId, taskId)

    // Build messages array
    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Get system prompt with task context
    const systemPrompt = getSystemPrompt(task)

    // Call AI
    const response = await aiClient.chat(messages, systemPrompt, {
      userId,
      taskId,
    })

    // Save conversation
    const conversationId = await this.saveConversation(
      userId,
      taskId,
      message,
      response.content
    )

    return {
      response: response.content,
      conversationId,
    }
  }

  // Decompose task into subtasks
  async decomposeTask(
    userId: string,
    taskId: string
  ): Promise<{ subtasks: string[]; reasoning: string }> {
    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getDecomposePrompt()
    const userMessage = `Please break down this task into subtasks:

Title: ${task.title}
Description: ${task.description ?? 'No description provided'}
Due Date: ${task.dueDate ? task.dueDate.toISOString() : 'No due date'}

Provide 3-7 actionable subtasks.`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, temperature: 0.5 }
    )

    // Parse response to extract subtasks
    const parsed = this.parseDecomposeResponse(response.content)

    return parsed
  }

  // Research a topic
  async research(
    userId: string,
    taskId: string,
    query: string
  ): Promise<{ findings: string; sources: string[] }> {
    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getResearchPrompt()
    const userMessage = `Research the following topic in the context of this task:

Task: ${task.title}
Research Query: ${query}

Provide a comprehensive summary with key findings.`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, maxTokens: 2048 }
    )

    return {
      findings: response.content,
      sources: [], // Would be populated with actual sources in production
    }
  }

  // Draft content
  async draft(
    userId: string,
    taskId: string,
    draftType: 'email' | 'document' | 'outline' | 'general',
    instructions: string
  ): Promise<{ draft: string; suggestions: string[] }> {
    const task = await this.getTaskContext(userId, taskId)

    const systemPrompt = getDraftPrompt(draftType)
    const userMessage = `Create a ${draftType} for this task:

Task: ${task.title}
Description: ${task.description ?? ''}
Instructions: ${instructions}`

    const response = await aiClient.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { userId, taskId, maxTokens: 2048, temperature: 0.7 }
    )

    return {
      draft: response.content,
      suggestions: [],
    }
  }

  // Get smart suggestions for a task
  async getSuggestions(
    userId: string,
    taskId: string
  ): Promise<{ suggestions: AISuggestion[] }> {
    const task = await this.getTaskContext(userId, taskId)

    const suggestions: AISuggestion[] = []

    // Analyze task and generate contextual suggestions
    if (task.title.toLowerCase().includes('email') ||
        task.title.toLowerCase().includes('write')) {
      suggestions.push({
        type: 'draft',
        label: 'Draft this content',
        description: 'I can help write a draft for you',
      })
    }

    if (task.title.toLowerCase().includes('research') ||
        task.title.toLowerCase().includes('find') ||
        task.title.toLowerCase().includes('learn')) {
      suggestions.push({
        type: 'research',
        label: 'Research this topic',
        description: 'I can gather information for you',
      })
    }

    if (!task.subtasks || task.subtasks.length === 0) {
      suggestions.push({
        type: 'decompose',
        label: 'Break this down',
        description: 'I can suggest subtasks to make this more manageable',
      })
    }

    return { suggestions }
  }

  // Private helpers
  private async getTaskContext(userId: string, taskId: string): Promise<Task> {
    const task = await db.query.tasks.findFirst({
      where: (tasks, { and, eq }) =>
        and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
      with: {
        subtasks: true,
        project: true,
      },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    return task
  }

  private async saveConversation(
    userId: string,
    taskId: string,
    userMessage: string,
    assistantMessage: string
  ): Promise<string> {
    // Implementation to save conversation to database
    const [conversation] = await db
      .insert(aiConversations)
      .values({
        userId,
        taskId,
        createdAt: new Date(),
      })
      .returning()

    await db.insert(aiMessages).values([
      {
        conversationId: conversation.id,
        role: 'user',
        content: userMessage,
        createdAt: new Date(),
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        createdAt: new Date(),
      },
    ])

    return conversation.id
  }

  private parseDecomposeResponse(content: string): {
    subtasks: string[]
    reasoning: string
  } {
    // Parse AI response to extract subtasks
    const lines = content.split('\n').filter((line) => line.trim())
    const subtasks: string[] = []
    let reasoning = ''

    for (const line of lines) {
      // Match numbered or bulleted items
      const match = line.match(/^[\d\-\*\•]\s*\.?\s*(.+)/)
      if (match) {
        subtasks.push(match[1].trim())
      } else if (!subtasks.length) {
        reasoning += line + ' '
      }
    }

    return {
      subtasks: subtasks.slice(0, 7), // Max 7 subtasks
      reasoning: reasoning.trim(),
    }
  }
}

export const aiService = new AIService()

interface AISuggestion {
  type: 'decompose' | 'research' | 'draft' | 'summarize'
  label: string
  description: string
}
```

### 6.4 AI Prompts

```typescript
// lib/ai/prompts.ts

import { type Task } from '@/types/task'

export function getSystemPrompt(task?: Task): string {
  const basePrompt = `You are an AI assistant integrated into a task management application. Your role is to help users complete their tasks effectively.

Guidelines:
- Be concise and actionable
- Focus on the user's current task context
- Suggest practical next steps
- Maintain a helpful but not overly enthusiastic tone
- If you're unsure, acknowledge it and offer to help differently`

  if (task) {
    return `${basePrompt}

Current Task Context:
- Title: ${task.title}
- Description: ${task.description ?? 'None provided'}
- Priority: ${task.priority}
- Due Date: ${task.dueDate?.toLocaleDateString() ?? 'Not set'}
- Status: ${task.status}
${task.subtasks?.length ? `- Subtasks: ${task.subtasks.map(s => s.title).join(', ')}` : ''}`
  }

  return basePrompt
}

export function getDecomposePrompt(): string {
  return `You are a task decomposition expert. Your job is to break down complex tasks into clear, actionable subtasks.

Guidelines:
- Generate 3-7 subtasks
- Each subtask should be specific and actionable
- Order subtasks logically (dependencies first)
- Subtasks should be completable in one sitting
- Use action verbs (Write, Review, Research, Create, etc.)

Output Format:
1. First subtask
2. Second subtask
...

Optionally, include brief reasoning before the list.`
}

export function getResearchPrompt(): string {
  return `You are a research assistant. Help the user understand topics related to their task.

Guidelines:
- Provide accurate, well-organized information
- Use bullet points for clarity
- Include relevant examples when helpful
- Acknowledge limitations of your knowledge
- Focus on practical, actionable insights

Structure your response with:
- Key findings (3-5 main points)
- Important details
- Recommended next steps (if applicable)`
}

export function getDraftPrompt(type: 'email' | 'document' | 'outline' | 'general'): string {
  const typeSpecific: Record<string, string> = {
    email: `You are drafting a professional email.
- Use appropriate greeting and sign-off
- Be concise and clear
- Include a clear call-to-action if needed`,

    document: `You are drafting a document or report.
- Use clear headings and structure
- Be thorough but focused
- Include relevant details`,

    outline: `You are creating an outline or structure.
- Use hierarchical organization
- Include main points and sub-points
- Keep items concise`,

    general: `You are drafting content.
- Match the appropriate tone and format
- Be clear and well-organized`,
  }

  return `You are a writing assistant helping create content.

${typeSpecific[type]}

General guidelines:
- Maintain professional quality
- Be ready to revise based on feedback
- Ask clarifying questions if the request is ambiguous`
}
```

### 6.5 AI API Routes

```typescript
// app/api/ai/chat/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/helpers'
import { aiService } from '@/services/ai.service'

const chatSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, message, conversationHistory } = chatSchema.parse(body)

    const result = await aiService.chat(
      user.id,
      taskId,
      message,
      conversationHistory
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof AIRateLimitError) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', details: error.details },
        { status: 429 }
      )
    }

    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'AI service error' },
      { status: 500 }
    )
  }
}
```

---

## 7. Data Architecture

### 7.1 Database Schema

```typescript
// lib/db/schema.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
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

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  preferences: jsonb('preferences').$type<UserPreferences>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}))

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6366f1'),
  icon: text('icon'),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').default(0),
  archived: boolean('archived').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('projects_user_id_idx').on(table.userId),
}))

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  parentTaskId: uuid('parent_task_id'),

  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('pending').notNull(),
  priority: taskPriorityEnum('priority').default('none').notNull(),

  dueDate: timestamp('due_date'),
  scheduledDate: timestamp('scheduled_date'),
  startDate: timestamp('start_date'),

  estimatedMinutes: integer('estimated_minutes'),
  actualMinutes: integer('actual_minutes'),

  tags: text('tags').array().default([]),
  sortOrder: integer('sort_order').default(0),

  // Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: jsonb('recurrence_rule').$type<RecurrenceRule>(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  userIdIdx: index('tasks_user_id_idx').on(table.userId),
  projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
  statusIdx: index('tasks_status_idx').on(table.status),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
  scheduledDateIdx: index('tasks_scheduled_date_idx').on(table.scheduledDate),
  parentTaskIdIdx: index('tasks_parent_task_id_idx').on(table.parentTaskId),
}))

// AI Conversations
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  metadata: jsonb('metadata').$type<MessageMetadata>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
}))

// AI Context (stored research, drafts, etc.)
export const aiContext = pgTable('ai_context', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'research', 'draft', 'suggestion'
  title: text('title'),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index('ai_context_task_id_idx').on(table.taskId),
  typeIdx: index('ai_context_type_idx').on(table.type),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  projects: many(projects),
  aiConversations: many(aiConversations),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  parent: one(projects, {
    fields: [projects.parentId],
    references: [projects.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
  }),
  subtasks: many(tasks),
  aiConversations: many(aiConversations),
  aiContext: many(aiContext),
}))

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [aiConversations.taskId],
    references: [tasks.id],
  }),
  messages: many(aiMessages),
}))

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}))

// Types
interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultView: 'today' | 'upcoming' | 'projects'
  weekStartsOn: 0 | 1 | 6 // Sunday, Monday, Saturday
  timeFormat: '12h' | '24h'
  aiSuggestionsEnabled: boolean
  aiSuggestionFrequency: 'low' | 'medium' | 'high'
}

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endDate?: string
  count?: number
}

interface MessageMetadata {
  tokensUsed?: number
  model?: string
  processingTime?: number
}
```

### 7.2 Database Client

```typescript
// lib/db/index.ts

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })

// For transactions and more complex queries
import { Pool } from '@neondatabase/serverless'
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const dbPool = drizzlePool(pool, { schema })
```

### 7.3 Redis Client

```typescript
// lib/redis/index.ts

import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Cache helpers
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached) return cached

  const fresh = await fetchFn()
  await redis.setex(key, ttlSeconds, fresh)
  return fresh
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Session storage
export const sessionStore = {
  async get(sessionId: string) {
    return redis.get(`session:${sessionId}`)
  },
  async set(sessionId: string, data: unknown, ttlSeconds: number = 86400) {
    return redis.setex(`session:${sessionId}`, ttlSeconds, data)
  },
  async delete(sessionId: string) {
    return redis.del(`session:${sessionId}`)
  },
}
```

---

## 8. Authentication & Authorization

### 8.1 NextAuth Configuration

```typescript
// lib/auth/config.ts

import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        })

        if (!user?.passwordHash) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
    newUser: '/onboarding',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = request.nextUrl.pathname.startsWith('/today') ||
        request.nextUrl.pathname.startsWith('/upcoming') ||
        request.nextUrl.pathname.startsWith('/projects') ||
        request.nextUrl.pathname.startsWith('/settings')

      if (isOnDashboard) {
        return isLoggedIn
      }

      return true
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

### 8.2 Auth Helpers

```typescript
// lib/auth/helpers.ts

import { auth } from './config'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireNoAuth() {
  const session = await auth()
  if (session?.user) {
    redirect('/today')
  }
}
```

### 8.3 Middleware

```typescript
// middleware.ts

import { auth } from '@/lib/auth/config'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/forgot-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // API routes have their own auth
  const isApiRoute = pathname.startsWith('/api')

  // Static assets
  const isStaticAsset = pathname.startsWith('/_next') ||
    pathname.includes('.') // files with extensions

  if (isStaticAsset || isApiRoute) {
    return
  }

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return Response.redirect(new URL('/today', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 9. Real-time Features

### 9.1 Real-time Architecture

For MVP, we'll use polling with React Query. For scale, we'll add WebSocket support.

```typescript
// hooks/use-realtime-tasks.ts

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { taskKeys } from './use-tasks'

export function useRealtimeTasks(filters: TaskFilters) {
  const queryClient = useQueryClient()

  // Regular query with short stale time for frequent updates
  const query = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => taskService.getTasks(filters),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchIntervalInBackground: false,
  })

  // Listen for visibility changes to refetch when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queryClient])

  return query
}
```

### 9.2 Future WebSocket Implementation

```typescript
// lib/realtime/client.ts (Future implementation)

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeSubscription(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/subscribe?userId=${userId}`
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'task:created':
        case 'task:updated':
        case 'task:deleted':
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          break
        case 'project:updated':
          queryClient.invalidateQueries({ queryKey: ['projects'] })
          break
      }
    }

    return () => ws.close()
  }, [userId, queryClient])
}
```

---

## 10. Infrastructure & Deployment

### 10.1 Environment Configuration

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# OAuth Providers
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx (fallback)

# Email (Resend)
RESEND_API_KEY=re_xxx

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 10.2 Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/ai/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 10.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### 10.4 Database Migrations

```typescript
// drizzle.config.ts

import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
```

```json
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 11. Security

### 11.1 Security Measures

| Threat | Mitigation |
|--------|------------|
| XSS | React auto-escaping, CSP headers, sanitize user input |
| CSRF | SameSite cookies, CSRF tokens for mutations |
| SQL Injection | Parameterized queries via Drizzle ORM |
| Auth Bypass | NextAuth.js, JWT validation, middleware protection |
| Data Exposure | Row-level security, user ID validation on all queries |
| Rate Limiting | Upstash Ratelimit on API and AI endpoints |
| AI Prompt Injection | Input validation, output sanitization |

### 11.2 Security Headers

```typescript
// next.config.js

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### 11.3 Input Validation

```typescript
// lib/validation/sanitize.ts

import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

export function sanitizeForAI(input: string): string {
  // Remove potential prompt injection patterns
  return input
    .replace(/```[\s\S]*?```/g, '[code block removed]')
    .replace(/system:/gi, '')
    .replace(/assistant:/gi, '')
    .replace(/human:/gi, '')
    .slice(0, 10000) // Limit length
}
```

---

## 12. Monitoring & Observability

### 12.1 Error Tracking (Sentry)

```typescript
// lib/monitoring/sentry.ts

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
    }),
  ],
})

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context })
}

export function setUser(user: { id: string; email: string }) {
  Sentry.setUser(user)
}
```

### 12.2 Performance Monitoring

```typescript
// lib/monitoring/performance.ts

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  return fn().finally(() => {
    const duration = performance.now() - start

    // Log to analytics
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track('Performance', {
        name,
        duration,
      })
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation: ${name} took ${duration}ms`)
    }
  })
}
```

### 12.3 Logging

```typescript
// lib/monitoring/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  taskId?: string
  [key: string]: unknown
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    })
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, error?: Error, context?: LogContext) {
    console.error(this.formatMessage('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    }))

    if (error) {
      captureError(error, context)
    }
  }
}

export const logger = new Logger()
```

---

## 13. Development Practices

### 13.1 Code Style

```javascript
// .eslintrc.js

module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    'react/display-name': 'off',
  },
}
```

```javascript
// prettier.config.js

module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  plugins: ['prettier-plugin-tailwindcss'],
}
```

### 13.2 Git Hooks

```javascript
// .husky/pre-commit

pnpm lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### 13.3 Testing Strategy

```
TESTING PYRAMID
│
├── E2E Tests (Playwright)
│   └── Critical user flows
│       - Authentication
│       - Task CRUD
│       - AI interactions
│
├── Integration Tests (Vitest)
│   └── API routes
│   └── Service layer
│   └── Database operations
│
└── Unit Tests (Vitest)
    └── Utility functions
    └── Validation schemas
    └── Component logic
```

```typescript
// Example test: services/task.service.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { taskService } from './task.service'
import { db } from '@/lib/db'
import { tasks, users } from '@/lib/db/schema'

describe('TaskService', () => {
  let testUserId: string

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
    }).returning()
    testUserId = user.id
  })

  afterEach(async () => {
    // Cleanup
    await db.delete(tasks).where(eq(tasks.userId, testUserId))
    await db.delete(users).where(eq(users.id, testUserId))
  })

  describe('createTask', () => {
    it('should create a task with required fields', async () => {
      const task = await taskService.createTask(testUserId, {
        title: 'Test task',
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test task')
      expect(task.status).toBe('pending')
      expect(task.userId).toBe(testUserId)
    })

    it('should create a task with all fields', async () => {
      const dueDate = new Date()

      const task = await taskService.createTask(testUserId, {
        title: 'Complete task',
        description: 'A description',
        priority: 'high',
        dueDate,
      })

      expect(task.description).toBe('A description')
      expect(task.priority).toBe('high')
      expect(task.dueDate).toEqual(dueDate)
    })
  })
})
```

---

## Appendix A: Quick Reference

### Key Files

| Purpose | Location |
|---------|----------|
| Database schema | `lib/db/schema.ts` |
| Auth config | `lib/auth/config.ts` |
| AI client | `lib/ai/client.ts` |
| Task service | `services/task.service.ts` |
| AI service | `services/ai.service.ts` |
| Task hooks | `hooks/use-tasks.ts` |
| UI store | `stores/ui.store.ts` |

### Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio

# Testing
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript check
pnpm format           # Run Prettier
```

---

*Document End*
