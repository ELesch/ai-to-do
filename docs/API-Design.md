# AI-Aided To Do Application
## API Design Document

**Version:** 1.0
**Date:** January 2026
**Status:** Architecture Phase
**Base URL:** `https://api.aitodo.app/v1` (production) | `http://localhost:3000/api` (development)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Request & Response Formats](#3-request--response-formats)
4. [Error Handling](#4-error-handling)
5. [Tasks API](#5-tasks-api)
6. [Projects API](#6-projects-api)
7. [Tags API](#7-tags-api)
8. [AI API](#8-ai-api)
9. [Users API](#9-users-api)
10. [Planning API](#10-planning-api)
11. [Search API](#11-search-api)
12. [Webhooks](#12-webhooks)
13. [Rate Limiting](#13-rate-limiting)
14. [API Client Examples](#14-api-client-examples)

---

## 1. Overview

### 1.1 API Design Principles

| Principle | Implementation |
|-----------|----------------|
| **RESTful** | Resource-based URLs, standard HTTP methods |
| **Consistent** | Uniform response formats, predictable naming |
| **Versioned** | URL-based versioning (`/v1/`) |
| **Secure** | HTTPS only, JWT authentication, rate limiting |
| **Documented** | OpenAPI 3.0 specification |
| **Performant** | Pagination, field selection, caching headers |

### 1.2 HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Retrieve resources | Yes |
| `POST` | Create resources, trigger actions | No |
| `PATCH` | Partial update | Yes |
| `PUT` | Full replacement | Yes |
| `DELETE` | Remove resources | Yes |

### 1.3 URL Structure

```
https://api.aitodo.app/v1/{resource}/{id}/{sub-resource}

Examples:
GET    /v1/tasks                    # List tasks
POST   /v1/tasks                    # Create task
GET    /v1/tasks/:id                # Get task
PATCH  /v1/tasks/:id                # Update task
DELETE /v1/tasks/:id                # Delete task
GET    /v1/tasks/:id/subtasks       # List subtasks
POST   /v1/tasks/:id/complete       # Complete task (action)
POST   /v1/ai/chat                  # AI chat (action)
```

### 1.4 API Endpoint Summary

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| `/auth` | 5 | Authentication & registration |
| `/tasks` | 12 | Task CRUD & actions |
| `/projects` | 8 | Project management |
| `/tags` | 5 | Tag management |
| `/ai` | 8 | AI assistant features |
| `/users` | 6 | User profile & preferences |
| `/planning` | 4 | Daily/weekly planning |
| `/search` | 2 | Global search |

---

## 2. Authentication

### 2.1 Authentication Methods

**Primary: JWT Bearer Token**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Session Cookie (Web App)**

```http
Cookie: next-auth.session-token=...
```

### 2.2 Auth Endpoints

#### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2026-01-14T10:30:00Z"
    },
    "message": "Verification email sent"
  }
}
```

**Errors:**
- `400` - Validation error (invalid email, weak password)
- `409` - Email already registered

---

#### POST /auth/login

Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Email not verified
- `429` - Too many attempts

---

#### POST /auth/refresh

Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

---

#### POST /auth/logout

Invalidate current session.

**Request:** No body required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

#### POST /auth/forgot-password

Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a reset email has been sent"
  }
}
```

---

#### POST /auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "newSecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

## 3. Request & Response Formats

### 3.1 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | Bearer token (`Bearer <token>`) |
| `Content-Type` | Yes | `application/json` for POST/PATCH/PUT |
| `Accept` | No | `application/json` (default) |
| `X-Request-ID` | No | Client-generated request ID for tracing |
| `X-Timezone` | No | User timezone (e.g., `America/New_York`) |

*Not required for public endpoints (auth, health)

### 3.2 Success Response Format

```typescript
interface SuccessResponse<T> {
  success: true
  data: T
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasMore: boolean
    }
    requestId?: string
  }
}
```

**Single Resource:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Complete project proposal",
    "status": "pending"
  }
}
```

**Collection:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "title": "Task 1" },
    { "id": "...", "title": "Task 2" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

### 3.3 Pagination

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `cursor` - Cursor for cursor-based pagination (optional)

**Example:**
```
GET /v1/tasks?page=2&limit=20
GET /v1/tasks?cursor=eyJpZCI6IjEyMyJ9
```

### 3.4 Filtering

**Query Parameters:**
```
GET /v1/tasks?status=pending&priority=high&projectId=xxx
GET /v1/tasks?dueDateFrom=2026-01-01&dueDateTo=2026-01-31
GET /v1/tasks?tags=urgent,important
```

### 3.5 Sorting

**Query Parameters:**
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc` (default: `desc`)

**Example:**
```
GET /v1/tasks?sortBy=dueDate&sortOrder=asc
GET /v1/tasks?sortBy=createdAt&sortOrder=desc
```

### 3.6 Field Selection

**Query Parameters:**
- `fields` - Comma-separated list of fields to include

**Example:**
```
GET /v1/tasks?fields=id,title,status,dueDate
```

### 3.7 Including Related Resources

**Query Parameters:**
- `include` - Comma-separated list of relations

**Example:**
```
GET /v1/tasks/:id?include=subtasks,project,tags
GET /v1/projects/:id?include=tasks
```

---

## 4. Error Handling

### 4.1 Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string           // Machine-readable error code
    message: string        // Human-readable message
    details?: unknown      // Additional error details
    field?: string         // Field that caused error (validation)
    requestId?: string     // For support reference
  }
}
```

**Example:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      },
      {
        "field": "dueDate",
        "message": "Due date must be in the future"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

### 4.2 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET, PATCH, PUT |
| `201` | Created | Successful POST (resource created) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Validation error, malformed request |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but not authorized |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists, state conflict |
| `422` | Unprocessable Entity | Semantic validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Maintenance or overload |

### 4.3 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Token expired or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_EXISTS` | 409 | Duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_ERROR` | 500 | AI service error |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## 5. Tasks API

### 5.1 Task Object

```typescript
interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  priority: 'high' | 'medium' | 'low' | 'none'

  // Dates
  dueDate?: string              // ISO 8601
  dueDateHasTime?: boolean
  scheduledDate?: string        // YYYY-MM-DD
  startDate?: string            // YYYY-MM-DD

  // Time tracking
  estimatedMinutes?: number
  actualMinutes?: number

  // Organization
  projectId?: string
  parentTaskId?: string
  sortOrder: number

  // Recurrence
  isRecurring: boolean
  recurrenceRule?: RecurrenceRule

  // Related data (when included)
  project?: Project
  subtasks?: Task[]
  tags?: Tag[]
  aiContext?: AIContext[]

  // Timestamps
  createdAt: string
  updatedAt: string
  completedAt?: string
}
```

### 5.2 Endpoints

#### GET /tasks

List tasks for the authenticated user.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |
| `projectId` | string | Filter by project |
| `parentTaskId` | string | Filter subtasks of a task |
| `tags` | string | Comma-separated tag IDs |
| `dueDateFrom` | string | Due date range start |
| `dueDateTo` | string | Due date range end |
| `scheduledDate` | string | Exact scheduled date |
| `isRecurring` | boolean | Filter recurring tasks |
| `view` | string | Predefined view: `today`, `upcoming`, `overdue` |
| `page` | number | Page number |
| `limit` | number | Items per page |
| `sortBy` | string | Sort field |
| `sortOrder` | string | `asc` or `desc` |
| `include` | string | Related resources to include |

**Example Request:**
```http
GET /v1/tasks?view=today&include=project,subtasks
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Complete project proposal",
      "description": "Draft the Q1 project proposal for review",
      "status": "pending",
      "priority": "high",
      "dueDate": "2026-01-15T17:00:00Z",
      "dueDateHasTime": true,
      "estimatedMinutes": 120,
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "sortOrder": 0,
      "isRecurring": false,
      "project": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Work",
        "color": "#3b82f6"
      },
      "subtasks": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "title": "Research competitors",
          "status": "completed"
        },
        {
          "id": "770e8400-e29b-41d4-a716-446655440003",
          "title": "Write executive summary",
          "status": "pending"
        }
      ],
      "createdAt": "2026-01-10T09:00:00Z",
      "updatedAt": "2026-01-14T11:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

---

#### POST /tasks

Create a new task.

**Request:**
```json
{
  "title": "Write quarterly report",
  "description": "Summarize Q4 performance metrics",
  "priority": "high",
  "dueDate": "2026-01-20T17:00:00Z",
  "dueDateHasTime": true,
  "estimatedMinutes": 180,
  "projectId": "660e8400-e29b-41d4-a716-446655440001",
  "tags": ["tag-id-1", "tag-id-2"]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Write quarterly report",
    "description": "Summarize Q4 performance metrics",
    "status": "pending",
    "priority": "high",
    "dueDate": "2026-01-20T17:00:00Z",
    "dueDateHasTime": true,
    "estimatedMinutes": 180,
    "projectId": "660e8400-e29b-41d4-a716-446655440001",
    "sortOrder": 0,
    "isRecurring": false,
    "createdAt": "2026-01-14T10:30:00Z",
    "updatedAt": "2026-01-14T10:30:00Z"
  }
}
```

**Validation Rules:**
- `title`: Required, 1-500 characters
- `description`: Optional, max 10,000 characters
- `priority`: Optional, enum values
- `dueDate`: Optional, valid ISO 8601 date
- `estimatedMinutes`: Optional, positive integer
- `projectId`: Optional, must exist and belong to user
- `parentTaskId`: Optional, must exist and belong to user

---

#### GET /tasks/:id

Get a single task by ID.

**Query Parameters:**
- `include` - Related resources (subtasks, project, tags, aiContext)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Write quarterly report",
    "status": "pending",
    "priority": "high",
    "subtasks": [],
    "project": null,
    "tags": [],
    "createdAt": "2026-01-14T10:30:00Z",
    "updatedAt": "2026-01-14T10:30:00Z"
  }
}
```

**Errors:**
- `404` - Task not found

---

#### PATCH /tasks/:id

Update a task.

**Request:**
```json
{
  "title": "Updated title",
  "priority": "medium",
  "dueDate": "2026-01-25T12:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Updated title",
    "priority": "medium",
    "dueDate": "2026-01-25T12:00:00Z",
    "updatedAt": "2026-01-14T14:00:00Z"
  }
}
```

---

#### DELETE /tasks/:id

Delete a task (soft delete).

**Response:** `204 No Content`

**Notes:**
- Soft deletes the task (sets `deletedAt`)
- Subtasks are also soft deleted
- Can be restored within 30 days

---

#### POST /tasks/:id/complete

Mark a task as completed.

**Request:** (optional body)
```json
{
  "actualMinutes": 150
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "completedAt": "2026-01-14T16:30:00Z",
    "actualMinutes": 150
  }
}
```

---

#### POST /tasks/:id/uncomplete

Mark a completed task as pending again.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "completedAt": null
  }
}
```

---

#### GET /tasks/:id/subtasks

List subtasks of a task.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "title": "Research competitors",
      "status": "completed",
      "sortOrder": 0
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440003",
      "title": "Write executive summary",
      "status": "pending",
      "sortOrder": 1
    }
  ]
}
```

---

#### POST /tasks/:id/subtasks

Create a subtask.

**Request:**
```json
{
  "title": "Review final draft",
  "estimatedMinutes": 30
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "title": "Review final draft",
    "status": "pending",
    "parentTaskId": "550e8400-e29b-41d4-a716-446655440000",
    "estimatedMinutes": 30,
    "sortOrder": 2
  }
}
```

---

#### POST /tasks/:id/reorder

Reorder tasks within a list.

**Request:**
```json
{
  "taskIds": [
    "task-id-3",
    "task-id-1",
    "task-id-2"
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Tasks reordered successfully"
  }
}
```

---

#### POST /tasks/bulk

Perform bulk operations on tasks.

**Request:**
```json
{
  "operation": "update",
  "taskIds": ["task-1", "task-2", "task-3"],
  "data": {
    "projectId": "project-id",
    "priority": "high"
  }
}
```

**Operations:**
- `update` - Update multiple tasks
- `complete` - Complete multiple tasks
- `delete` - Delete multiple tasks
- `move` - Move to project

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  }
}
```

---

## 6. Projects API

### 6.1 Project Object

```typescript
interface Project {
  id: string
  name: string
  description?: string
  color: string              // Hex color
  icon?: string
  parentId?: string
  sortOrder: number
  isArchived: boolean
  isFavorite: boolean
  settings?: ProjectSettings

  // Computed
  taskCount?: number
  completedTaskCount?: number

  // Related
  parent?: Project
  children?: Project[]
  tasks?: Task[]

  // Timestamps
  createdAt: string
  updatedAt: string
  archivedAt?: string
}
```

### 6.2 Endpoints

#### GET /projects

List all projects.

**Query Parameters:**
- `includeArchived` - Include archived projects (default: false)
- `include` - Related resources (tasks, children)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Work",
      "color": "#3b82f6",
      "icon": "briefcase",
      "sortOrder": 0,
      "isArchived": false,
      "isFavorite": true,
      "taskCount": 12,
      "completedTaskCount": 5,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-14T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "name": "Personal",
      "color": "#10b981",
      "icon": "home",
      "sortOrder": 1,
      "isArchived": false,
      "isFavorite": false,
      "taskCount": 8,
      "completedTaskCount": 3,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-12T15:00:00Z"
    }
  ]
}
```

---

#### POST /projects

Create a new project.

**Request:**
```json
{
  "name": "Side Project",
  "description": "Weekend coding project",
  "color": "#8b5cf6",
  "icon": "code"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440003",
    "name": "Side Project",
    "description": "Weekend coding project",
    "color": "#8b5cf6",
    "icon": "code",
    "sortOrder": 2,
    "isArchived": false,
    "isFavorite": false,
    "createdAt": "2026-01-14T11:00:00Z",
    "updatedAt": "2026-01-14T11:00:00Z"
  }
}
```

---

#### GET /projects/:id

Get a single project.

**Query Parameters:**
- `include` - Related resources (tasks, children)

**Response:** `200 OK`

---

#### PATCH /projects/:id

Update a project.

**Request:**
```json
{
  "name": "Updated Name",
  "color": "#ef4444"
}
```

**Response:** `200 OK`

---

#### DELETE /projects/:id

Delete a project.

**Query Parameters:**
- `deleteTasksOption` - What to do with tasks: `move_to_inbox`, `delete` (default: `move_to_inbox`)

**Response:** `204 No Content`

---

#### POST /projects/:id/archive

Archive a project.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440003",
    "isArchived": true,
    "archivedAt": "2026-01-14T12:00:00Z"
  }
}
```

---

#### POST /projects/:id/unarchive

Restore an archived project.

**Response:** `200 OK`

---

#### GET /projects/:id/stats

Get project statistics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalTasks": 25,
    "completedTasks": 18,
    "pendingTasks": 7,
    "overdueTasks": 2,
    "completionRate": 0.72,
    "tasksByPriority": {
      "high": 5,
      "medium": 12,
      "low": 6,
      "none": 2
    },
    "tasksByStatus": {
      "pending": 5,
      "in_progress": 2,
      "completed": 18
    },
    "estimatedMinutesRemaining": 480,
    "actualMinutesSpent": 1200
  }
}
```

---

## 7. Tags API

### 7.1 Tag Object

```typescript
interface Tag {
  id: string
  name: string
  color: string
  sortOrder: number
  taskCount?: number
  createdAt: string
  updatedAt: string
}
```

### 7.2 Endpoints

#### GET /tags

List all tags.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "name": "Urgent",
      "color": "#ef4444",
      "sortOrder": 0,
      "taskCount": 5
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "name": "Meeting",
      "color": "#8b5cf6",
      "sortOrder": 1,
      "taskCount": 8
    }
  ]
}
```

---

#### POST /tags

Create a new tag.

**Request:**
```json
{
  "name": "Follow-up",
  "color": "#f59e0b"
}
```

**Response:** `201 Created`

---

#### PATCH /tags/:id

Update a tag.

**Request:**
```json
{
  "name": "Updated Name",
  "color": "#10b981"
}
```

**Response:** `200 OK`

---

#### DELETE /tags/:id

Delete a tag (removes from all tasks).

**Response:** `204 No Content`

---

#### POST /tags/merge

Merge tags into one.

**Request:**
```json
{
  "sourceTagIds": ["tag-1", "tag-2"],
  "targetTagId": "tag-3"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "mergedCount": 2,
    "affectedTasks": 15
  }
}
```

---

## 8. AI API

### 8.1 AI Response Objects

```typescript
interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  metadata?: {
    tokensUsed?: number
    processingTimeMs?: number
  }
}

interface AIConversation {
  id: string
  taskId?: string
  title?: string
  type: 'general' | 'decompose' | 'research' | 'draft' | 'planning' | 'coaching'
  messages: AIMessage[]
  createdAt: string
  updatedAt: string
}

interface AISuggestion {
  type: 'decompose' | 'research' | 'draft' | 'summarize' | 'priority'
  label: string
  description: string
  confidence: number
}
```

### 8.2 Endpoints

#### POST /ai/chat

Send a message to the AI assistant.

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Help me break down this task into smaller steps",
  "conversationId": "conv-123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-123",
    "message": {
      "id": "msg-456",
      "role": "assistant",
      "content": "I'd be happy to help break down your task \"Write quarterly report\" into smaller steps. Here's a suggested breakdown:\n\n1. **Gather data** - Collect Q4 metrics from analytics dashboard\n2. **Create outline** - Structure the report sections\n3. **Write executive summary** - Summarize key findings\n4. **Add visualizations** - Create charts and graphs\n5. **Review and polish** - Final editing pass\n\nWould you like me to add these as subtasks?",
      "createdAt": "2026-01-14T12:00:00Z",
      "metadata": {
        "tokensUsed": 245,
        "processingTimeMs": 1850
      }
    }
  }
}
```

**Parameters:**
- `taskId` - (optional) Context task ID
- `message` - User message
- `conversationId` - (optional) Continue existing conversation
- `stream` - (optional) Stream response (SSE)

---

#### POST /ai/chat/stream

Stream AI response (Server-Sent Events).

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Draft an email to my team about this task"
}
```

**Response:** `200 OK` (text/event-stream)
```
event: start
data: {"conversationId": "conv-123", "messageId": "msg-456"}

event: delta
data: {"content": "Subject: "}

event: delta
data: {"content": "Q4 Report Progress Update"}

event: delta
data: {"content": "\n\nHi team,"}

...

event: done
data: {"tokensUsed": 312, "processingTimeMs": 2100}
```

---

#### POST /ai/decompose

Break down a task into subtasks.

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subtasks": [
      {
        "title": "Gather Q4 metrics from analytics dashboard",
        "estimatedMinutes": 30
      },
      {
        "title": "Create report outline and structure",
        "estimatedMinutes": 20
      },
      {
        "title": "Write executive summary",
        "estimatedMinutes": 45
      },
      {
        "title": "Create charts and visualizations",
        "estimatedMinutes": 60
      },
      {
        "title": "Review and final editing",
        "estimatedMinutes": 30
      }
    ],
    "reasoning": "Based on the task description, I've identified the key stages of creating a quarterly report. Each subtask is scoped to be completable in a single focused session.",
    "conversationId": "conv-789"
  }
}
```

---

#### POST /ai/decompose/apply

Apply suggested subtasks to a task.

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "subtasks": [
    { "title": "Gather Q4 metrics", "estimatedMinutes": 30 },
    { "title": "Write executive summary", "estimatedMinutes": 45 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "created": 2,
    "subtasks": [
      { "id": "subtask-1", "title": "Gather Q4 metrics" },
      { "id": "subtask-2", "title": "Write executive summary" }
    ]
  }
}
```

---

#### POST /ai/research

Research a topic related to a task.

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "query": "Best practices for quarterly business reports"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "findings": "## Key Findings\n\n### 1. Structure\n- Executive summary should be 1-2 pages\n- Include clear KPIs with YoY comparisons\n- Visual data presentations increase engagement\n\n### 2. Best Practices\n- Start with key takeaways\n- Use consistent formatting\n- Include actionable recommendations\n\n### 3. Common Mistakes to Avoid\n- Information overload\n- Missing context for metrics\n- No clear call-to-action",
    "sources": [],
    "contextId": "ctx-123",
    "conversationId": "conv-101"
  }
}
```

---

#### POST /ai/draft

Generate content for a task.

**Request:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "email",
  "instructions": "Write an email to stakeholders summarizing Q4 results. Keep it professional but positive."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "draft": "Subject: Q4 2025 Results Summary - Strong Performance Across Key Metrics\n\nDear Stakeholders,\n\nI'm pleased to share our Q4 2025 performance summary, which reflects continued progress across our key business areas.\n\n**Highlights:**\n- Revenue growth of 23% YoY\n- Customer retention improved to 94%\n- New product launches exceeded targets by 15%\n\nThe full detailed report will be available by end of week. Please don't hesitate to reach out if you have any questions.\n\nBest regards,\n[Your name]",
    "type": "email",
    "wordCount": 87,
    "contextId": "ctx-456",
    "conversationId": "conv-102"
  }
}
```

---

#### GET /ai/suggestions/:taskId

Get AI suggestions for a task.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "decompose",
        "label": "Break this down",
        "description": "This task seems complex. I can help break it into smaller steps.",
        "confidence": 0.85
      },
      {
        "type": "draft",
        "label": "Draft content",
        "description": "I can help draft the report based on your notes.",
        "confidence": 0.72
      }
    ]
  }
}
```

---

#### GET /ai/conversations

List AI conversations.

**Query Parameters:**
- `taskId` - Filter by task
- `type` - Filter by conversation type
- `limit` - Items per page

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-123",
      "taskId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Breaking down quarterly report",
      "type": "decompose",
      "messageCount": 5,
      "createdAt": "2026-01-14T10:00:00Z",
      "updatedAt": "2026-01-14T12:00:00Z"
    }
  ]
}
```

---

#### GET /ai/conversations/:id

Get a conversation with messages.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "conv-123",
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Breaking down quarterly report",
    "type": "decompose",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Help me break down this task",
        "createdAt": "2026-01-14T10:00:00Z"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "I'd be happy to help...",
        "createdAt": "2026-01-14T10:00:05Z"
      }
    ],
    "createdAt": "2026-01-14T10:00:00Z",
    "updatedAt": "2026-01-14T12:00:00Z"
  }
}
```

---

#### GET /ai/context/:taskId

Get stored AI context for a task.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "ctx-123",
      "type": "research",
      "title": "Quarterly report best practices",
      "content": "## Key Findings...",
      "createdAt": "2026-01-14T10:30:00Z"
    },
    {
      "id": "ctx-456",
      "type": "draft",
      "title": "Stakeholder email draft",
      "content": "Subject: Q4 2025 Results...",
      "createdAt": "2026-01-14T11:00:00Z"
    }
  ]
}
```

---

## 9. Users API

### 9.1 User Object

```typescript
interface User {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified?: string
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  defaultView: 'today' | 'upcoming' | 'inbox'
  timezone: string
  weekStartsOn: 0 | 1 | 6
  timeFormat: '12h' | '24h'
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  aiEnabled: boolean
  aiSuggestionsEnabled: boolean
  aiSuggestionFrequency: 'low' | 'medium' | 'high'
  emailNotifications: boolean
  pushNotifications: boolean
  dailyDigestTime?: string
  quietHoursStart?: string
  quietHoursEnd?: string
}
```

### 9.2 Endpoints

#### GET /users/me

Get current user profile.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "emailVerified": "2026-01-01T00:00:00Z",
    "preferences": {
      "theme": "system",
      "defaultView": "today",
      "timezone": "America/New_York",
      "aiEnabled": true,
      "aiSuggestionsEnabled": true
    },
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-14T10:00:00Z"
  }
}
```

---

#### PATCH /users/me

Update current user profile.

**Request:**
```json
{
  "name": "John Smith",
  "image": "https://..."
}
```

**Response:** `200 OK`

---

#### GET /users/me/preferences

Get user preferences.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "theme": "system",
    "defaultView": "today",
    "timezone": "America/New_York",
    "weekStartsOn": 1,
    "timeFormat": "12h",
    "dateFormat": "MM/DD/YYYY",
    "aiEnabled": true,
    "aiSuggestionsEnabled": true,
    "aiSuggestionFrequency": "medium",
    "emailNotifications": true,
    "pushNotifications": true,
    "dailyDigestTime": "08:00",
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  }
}
```

---

#### PATCH /users/me/preferences

Update user preferences.

**Request:**
```json
{
  "theme": "dark",
  "aiSuggestionFrequency": "high",
  "dailyDigestTime": "09:00"
}
```

**Response:** `200 OK`

---

#### POST /users/me/change-password

Change password.

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

#### DELETE /users/me

Delete account and all data.

**Request:**
```json
{
  "password": "currentPassword123",
  "confirmation": "DELETE MY ACCOUNT"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Account scheduled for deletion"
  }
}
```

---

#### GET /users/me/export

Export all user data (GDPR compliance).

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "expiresAt": "2026-01-15T00:00:00Z",
    "format": "json"
  }
}
```

---

#### GET /users/me/stats

Get user productivity statistics.

**Query Parameters:**
- `period` - `week`, `month`, `year`, `all`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "week",
    "tasksCreated": 15,
    "tasksCompleted": 12,
    "completionRate": 0.8,
    "averageCompletionTime": 45,
    "streakDays": 5,
    "mostProductiveDay": "Tuesday",
    "mostProductiveHour": 10,
    "aiInteractions": 8,
    "timeTracked": 1200
  }
}
```

---

## 10. Planning API

### 10.1 Endpoints

#### GET /planning/today

Get today's planning view.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "date": "2026-01-14",
    "greeting": "Good morning",
    "sections": {
      "overdue": [
        {
          "id": "task-1",
          "title": "Overdue task",
          "dueDate": "2026-01-13T17:00:00Z"
        }
      ],
      "mustDo": [
        {
          "id": "task-2",
          "title": "High priority task",
          "priority": "high",
          "dueDate": "2026-01-14T17:00:00Z"
        }
      ],
      "scheduled": [
        {
          "id": "task-3",
          "title": "Scheduled task",
          "scheduledDate": "2026-01-14"
        }
      ],
      "ifTimePerm its": [
        {
          "id": "task-4",
          "title": "Low priority task",
          "priority": "low"
        }
      ]
    },
    "calendarEvents": [
      {
        "id": "event-1",
        "title": "Team standup",
        "startTime": "10:00",
        "endTime": "10:30"
      }
    ],
    "aiSummary": "You have 5 tasks today including 1 overdue. I'd suggest starting with the quarterly report since it's due tomorrow."
  }
}
```

---

#### GET /planning/week

Get weekly overview.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "weekStart": "2026-01-13",
    "weekEnd": "2026-01-19",
    "days": [
      {
        "date": "2026-01-13",
        "dayName": "Monday",
        "taskCount": 3,
        "completedCount": 1
      },
      {
        "date": "2026-01-14",
        "dayName": "Tuesday",
        "taskCount": 5,
        "completedCount": 0
      }
    ],
    "summary": {
      "totalTasks": 18,
      "completedTasks": 5,
      "upcomingDeadlines": 3
    }
  }
}
```

---

#### POST /planning/daily-plan

Generate AI daily plan.

**Request:**
```json
{
  "date": "2026-01-14",
  "preferences": {
    "focusTime": "morning",
    "meetingBuffer": 15
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "plan": [
      {
        "time": "09:00",
        "type": "focus",
        "taskId": "task-1",
        "title": "Write quarterly report",
        "duration": 120,
        "reason": "Your highest priority task, best tackled during morning focus time"
      },
      {
        "time": "11:00",
        "type": "break",
        "duration": 15
      },
      {
        "time": "11:15",
        "type": "task",
        "taskId": "task-2",
        "title": "Review emails",
        "duration": 30
      }
    ],
    "insights": [
      "You have a meeting at 2pm - I've scheduled lighter tasks around it",
      "Based on your patterns, you're most productive before noon"
    ]
  }
}
```

---

#### GET /planning/review

Get weekly review data.

**Query Parameters:**
- `weekOf` - Date within the week to review

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "week": {
      "start": "2026-01-06",
      "end": "2026-01-12"
    },
    "metrics": {
      "tasksCompleted": 18,
      "tasksCreated": 22,
      "tasksRolledOver": 4,
      "completionRate": 0.82,
      "totalTimeTracked": 2400,
      "avgTimePerTask": 133
    },
    "comparison": {
      "vsLastWeek": {
        "tasksCompleted": "+3",
        "completionRate": "+0.05"
      }
    },
    "insights": [
      "You completed 20% more tasks than last week",
      "Tuesday was your most productive day",
      "You tend to underestimate task duration by 15%"
    ],
    "topProjects": [
      {
        "id": "project-1",
        "name": "Work",
        "tasksCompleted": 10
      }
    ]
  }
}
```

---

## 11. Search API

### 11.1 Endpoints

#### GET /search

Global search across all resources.

**Query Parameters:**
- `q` - Search query (required)
- `type` - Filter by type: `tasks`, `projects`, `tags`, `all` (default: `all`)
- `limit` - Results per type (default: 10)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "query": "quarterly report",
    "results": {
      "tasks": [
        {
          "id": "task-1",
          "title": "Write quarterly report",
          "description": "Q4 performance summary",
          "status": "pending",
          "matchedOn": ["title", "description"]
        }
      ],
      "projects": [
        {
          "id": "project-1",
          "name": "Q4 Reports",
          "matchedOn": ["name"]
        }
      ],
      "tags": []
    },
    "totalResults": 2
  }
}
```

---

#### GET /search/tasks

Search tasks with advanced filters.

**Query Parameters:**
- `q` - Search query
- `status` - Filter by status
- `priority` - Filter by priority
- `projectId` - Filter by project
- `dueDateFrom` - Due date range start
- `dueDateTo` - Due date range end
- `tags` - Filter by tags

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "task-1",
      "title": "Write quarterly report",
      "status": "pending",
      "priority": "high",
      "relevanceScore": 0.95
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

---

## 12. Webhooks

### 12.1 Webhook Events

| Event | Trigger |
|-------|---------|
| `task.created` | New task created |
| `task.updated` | Task updated |
| `task.completed` | Task marked complete |
| `task.deleted` | Task deleted |
| `project.created` | New project created |
| `project.updated` | Project updated |
| `reminder.due` | Reminder triggered |

### 12.2 Webhook Payload Format

```typescript
interface WebhookPayload {
  id: string              // Unique event ID
  type: string            // Event type
  createdAt: string       // Event timestamp
  data: {
    before?: object       // Previous state (for updates)
    after: object         // Current state
  }
}
```

**Example:**
```json
{
  "id": "evt_123abc",
  "type": "task.completed",
  "createdAt": "2026-01-14T12:00:00Z",
  "data": {
    "before": {
      "id": "task-1",
      "status": "pending"
    },
    "after": {
      "id": "task-1",
      "status": "completed",
      "completedAt": "2026-01-14T12:00:00Z"
    }
  }
}
```

### 12.3 Webhook Security

Webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=abc123...
```

**Verification (Node.js):**
```typescript
import crypto from 'crypto'

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  )
}
```

---

## 13. Rate Limiting

### 13.1 Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| General API | 100 requests | 1 minute |
| AI Endpoints | 20 requests | 1 minute |
| Search | 30 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |

### 13.2 Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705234800
```

### 13.3 Rate Limit Response

**Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2026-01-14T12:05:00Z",
      "retryAfter": 60
    }
  }
}
```

---

## 14. API Client Examples

### 14.1 TypeScript/JavaScript Client

```typescript
// lib/api-client.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
  }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(data.error.code, data.error.message, data.error.details)
    }

    return data
  }

  // Tasks
  async getTasks(filters?: TaskFilters) {
    const params = new URLSearchParams(filters as Record<string, string>)
    return this.request<Task[]>(`/tasks?${params}`)
  }

  async getTask(id: string, include?: string[]) {
    const params = include ? `?include=${include.join(',')}` : ''
    return this.request<Task>(`/tasks/${id}${params}`)
  }

  async createTask(data: CreateTaskInput) {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(id: string, data: UpdateTaskInput) {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(id: string) {
    return this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    })
  }

  async completeTask(id: string, actualMinutes?: number) {
    return this.request<Task>(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actualMinutes }),
    })
  }

  // AI
  async chatWithAI(taskId: string, message: string, conversationId?: string) {
    return this.request<{ conversationId: string; message: AIMessage }>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ taskId, message, conversationId }),
      }
    )
  }

  async decomposeTask(taskId: string) {
    return this.request<{ subtasks: SuggestedSubtask[]; reasoning: string }>(
      '/ai/decompose',
      {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      }
    )
  }

  // Projects
  async getProjects(includeArchived = false) {
    return this.request<Project[]>(`/projects?includeArchived=${includeArchived}`)
  }

  async createProject(data: CreateProjectInput) {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Search
  async search(query: string, type: 'all' | 'tasks' | 'projects' = 'all') {
    return this.request<SearchResults>(`/search?q=${encodeURIComponent(query)}&type=${type}`)
  }
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()
```

### 14.2 React Hook Example

```typescript
// hooks/use-tasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.getTasks(filters),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.getTask(id, ['subtasks', 'project', 'tags']),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskInput) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, actualMinutes }: { id: string; actualMinutes?: number }) =>
      api.completeTask(id, actualMinutes),
    onMutate: async ({ id }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old?.map((task) =>
          task.id === id
            ? { ...task, status: 'completed', completedAt: new Date().toISOString() }
            : task
        )
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

### 14.3 cURL Examples

```bash
# Login
curl -X POST https://api.aitodo.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# List tasks
curl https://api.aitodo.app/v1/tasks?view=today \
  -H "Authorization: Bearer <token>"

# Create task
curl -X POST https://api.aitodo.app/v1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task", "priority": "high"}'

# Complete task
curl -X POST https://api.aitodo.app/v1/tasks/task-id/complete \
  -H "Authorization: Bearer <token>"

# AI chat
curl -X POST https://api.aitodo.app/v1/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task-id", "message": "Help me break this down"}'

# Search
curl "https://api.aitodo.app/v1/search?q=quarterly%20report" \
  -H "Authorization: Bearer <token>"
```

---

## Appendix A: OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- Development: `http://localhost:3000/api/openapi.json`
- Production: `https://api.aitodo.app/v1/openapi.json`

Interactive documentation (Swagger UI):
- `https://api.aitodo.app/docs`

---

## Appendix B: API Changelog

### Version 1.0 (Initial Release)
- Core task CRUD operations
- Project and tag management
- AI chat and assistance features
- User authentication and preferences
- Planning and review endpoints
- Search functionality

---

## Appendix C: Quick Reference

### Endpoint Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** | | |
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/forgot-password` | Request reset |
| POST | `/auth/reset-password` | Reset password |
| **Tasks** | | |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get task |
| PATCH | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| POST | `/tasks/:id/complete` | Complete task |
| POST | `/tasks/:id/uncomplete` | Uncomplete task |
| GET | `/tasks/:id/subtasks` | List subtasks |
| POST | `/tasks/:id/subtasks` | Create subtask |
| POST | `/tasks/:id/reorder` | Reorder tasks |
| POST | `/tasks/bulk` | Bulk operations |
| **Projects** | | |
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/archive` | Archive project |
| POST | `/projects/:id/unarchive` | Unarchive project |
| GET | `/projects/:id/stats` | Project stats |
| **Tags** | | |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| PATCH | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag |
| POST | `/tags/merge` | Merge tags |
| **AI** | | |
| POST | `/ai/chat` | Chat with AI |
| POST | `/ai/chat/stream` | Stream AI response |
| POST | `/ai/decompose` | Decompose task |
| POST | `/ai/decompose/apply` | Apply subtasks |
| POST | `/ai/research` | Research topic |
| POST | `/ai/draft` | Generate draft |
| GET | `/ai/suggestions/:taskId` | Get suggestions |
| GET | `/ai/conversations` | List conversations |
| GET | `/ai/conversations/:id` | Get conversation |
| GET | `/ai/context/:taskId` | Get AI context |
| **Users** | | |
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| GET | `/users/me/preferences` | Get preferences |
| PATCH | `/users/me/preferences` | Update preferences |
| POST | `/users/me/change-password` | Change password |
| DELETE | `/users/me` | Delete account |
| GET | `/users/me/export` | Export data |
| GET | `/users/me/stats` | Get stats |
| **Planning** | | |
| GET | `/planning/today` | Today's plan |
| GET | `/planning/week` | Weekly overview |
| POST | `/planning/daily-plan` | Generate plan |
| GET | `/planning/review` | Weekly review |
| **Search** | | |
| GET | `/search` | Global search |
| GET | `/search/tasks` | Search tasks |

---

*Document End*
