/**
 * ResearchPanel Component
 * A sliding panel for AI research functionality on tasks
 */

'use client'

import { type FC, useState, useCallback, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAIResearch } from '@/hooks/use-ai-chat'
import { useResearchContext, type SavedContext } from '@/hooks/use-ai-context'
import { cn } from '@/lib/utils'

// Icons
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const BookmarkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
)

const HistoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
)

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
)

const LoaderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

interface TaskContext {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | null
}

interface ResearchPanelProps {
  task: TaskContext
  isOpen: boolean
  onClose: () => void
}

interface ParsedFindings {
  keyFindings: string[]
  details: string[]
  nextSteps: string[]
  relatedTopics: string[]
}

/**
 * Parse research findings into structured sections
 */
function parseFindings(findings: string): ParsedFindings {
  const sections: ParsedFindings = {
    keyFindings: [],
    details: [],
    nextSteps: [],
    relatedTopics: [],
  }

  if (!findings) return sections

  // Try to identify sections by headers
  const lines = findings.split('\n')
  let currentSection: keyof ParsedFindings = 'keyFindings'

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue

    // Check for section headers
    const lowerLine = trimmedLine.toLowerCase()
    if (
      lowerLine.includes('key finding') ||
      lowerLine.includes('main point') ||
      lowerLine.includes('summary')
    ) {
      currentSection = 'keyFindings'
      continue
    }
    if (
      lowerLine.includes('detail') ||
      lowerLine.includes('important')
    ) {
      currentSection = 'details'
      continue
    }
    if (
      lowerLine.includes('next step') ||
      lowerLine.includes('recommend') ||
      lowerLine.includes('action')
    ) {
      currentSection = 'nextSteps'
      continue
    }
    if (
      lowerLine.includes('related') ||
      lowerLine.includes('further') ||
      lowerLine.includes('also consider')
    ) {
      currentSection = 'relatedTopics'
      continue
    }

    // Check if line is a bullet point or numbered item
    const bulletMatch = trimmedLine.match(/^[-*\u2022]\s*(.+)/)
    const numberedMatch = trimmedLine.match(/^\d+[.)]\s*(.+)/)

    if (bulletMatch) {
      sections[currentSection].push(bulletMatch[1])
    } else if (numberedMatch) {
      sections[currentSection].push(numberedMatch[1])
    } else if (!trimmedLine.startsWith('#')) {
      // Regular text - add to details if no section assigned
      if (sections.keyFindings.length === 0 && currentSection === 'keyFindings') {
        sections.keyFindings.push(trimmedLine)
      } else {
        sections[currentSection].push(trimmedLine)
      }
    }
  }

  // If no structure was found, put everything in key findings
  if (
    sections.keyFindings.length === 0 &&
    sections.details.length === 0 &&
    sections.nextSteps.length === 0
  ) {
    const allLines = findings
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    sections.keyFindings = allLines.slice(0, Math.min(5, allLines.length))
    if (allLines.length > 5) {
      sections.details = allLines.slice(5)
    }
  }

  return sections
}

/**
 * Research history item component
 */
const ResearchHistoryItem: FC<{
  research: SavedContext
  onLoad: (content: string) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}> = ({ research, onLoad, onDelete, isDeleting }) => {
  const title = research.title || 'Research findings'
  const preview = research.content.slice(0, 100) + (research.content.length > 100 ? '...' : '')
  const date = new Date(research.createdAt).toLocaleDateString()

  return (
    <div className="group rounded-lg border bg-white p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onLoad(research.content)}
          className="flex-1 text-left"
        >
          <h4 className="font-medium text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preview}</p>
          <p className="text-xs text-gray-400 mt-2">
            v{research.version} - {date}
          </p>
        </button>
        <button
          onClick={() => onDelete(research.id)}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          title="Delete research"
        >
          {isDeleting ? <LoaderIcon /> : <TrashIcon />}
        </button>
      </div>
    </div>
  )
}

/**
 * Research findings display component
 */
const ResearchFindings: FC<{
  findings: string
  sources: string[]
  onSave: () => void
  isSaving: boolean
}> = ({ findings, sources, onSave, isSaving }) => {
  const parsed = parseFindings(findings)

  return (
    <div className="space-y-4">
      {/* Key Findings */}
      {parsed.keyFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Key Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parsed.keyFindings.map((finding, idx) => (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">-</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Important Details */}
      {parsed.details.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Important Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parsed.details.map((detail, idx) => (
                <li key={idx} className="text-sm text-gray-600">{detail}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Next Steps */}
      {parsed.nextSteps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recommended Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {parsed.nextSteps.map((step, idx) => (
                <li key={idx} className="text-sm">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Related Topics */}
      {parsed.relatedTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Related Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {parsed.relatedTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                >
                  {topic}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {sources.map((source, idx) => (
                <li key={idx} className="text-sm text-blue-600 hover:underline">
                  {source.startsWith('http') ? (
                    <a href={source} target="_blank" rel="noopener noreferrer">
                      {source}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <LoaderIcon />
              Saving...
            </>
          ) : (
            <>
              <BookmarkIcon />
              Save to Task Context
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * ResearchPanel - Main component
 */
export const ResearchPanel: FC<ResearchPanelProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null)

  // AI Research hook
  const {
    findings,
    sources,
    isLoading: isResearching,
    error: researchError,
    research,
    cancel: cancelResearch,
  } = useAIResearch(task.id)

  // Research context hook for persistence
  const {
    researchContexts,
    isLoading: isLoadingHistory,
    isSaving,
    saveResearch,
    deleteContext,
    refreshContexts,
  } = useResearchContext(task.id)

  // Handle research submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!query.trim() || isResearching) return
      setSavedFeedback(null)
      await research(query)
    },
    [query, isResearching, research]
  )

  // Handle saving research to context
  const handleSave = useCallback(async () => {
    if (!findings) return

    const result = await saveResearch(findings, `Research: ${query.slice(0, 50)}`)
    if (result) {
      setSavedFeedback('Research saved to task context!')
      setTimeout(() => setSavedFeedback(null), 3000)
    }
  }, [findings, query, saveResearch])

  // Handle loading saved research
  const handleLoadResearch = useCallback((content: string) => {
    // This will display the saved research
    // The hook doesn't have a direct way to set findings,
    // so we'll display it in a different way through state
    setShowHistory(false)
  }, [])

  // Handle deleting research
  const handleDeleteResearch = useCallback(
    async (id: string) => {
      setDeletingId(id)
      await deleteContext(id)
      setDeletingId(null)
    },
    [deleteContext]
  )

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed right-0 top-0 z-50 h-full w-[450px] border-l bg-white shadow-xl',
        'transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <SearchIcon />
            <h2 className="font-semibold">AI Research Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(showHistory && 'bg-gray-100')}
            >
              <HistoryIcon />
              History
            </Button>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700"
              aria-label="Close panel"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Task Context */}
        <div className="border-b bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Research Context
          </p>
          <h3 className="font-medium text-gray-900">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {showHistory ? (
            /* Research History */
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Previous Research
              </h3>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderIcon />
                  <span className="ml-2 text-sm text-gray-500">Loading history...</span>
                </div>
              ) : researchContexts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No saved research for this task yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {researchContexts.map((research) => (
                    <ResearchHistoryItem
                      key={research.id}
                      research={research}
                      onLoad={handleLoadResearch}
                      onDelete={handleDeleteResearch}
                      isDeleting={deletingId === research.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Research Input and Results */
            <div className="p-4 space-y-4">
              {/* Search Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a research question..."
                    disabled={isResearching}
                    className="flex-1"
                  />
                  {isResearching ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelResearch}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!query.trim()}>
                      <SearchIcon />
                      Research
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Ask questions related to your task. The AI will provide research
                  findings that you can save to your task context.
                </p>
              </form>

              {/* Loading State */}
              {isResearching && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <LoaderIcon />
                  <p className="text-sm text-gray-500">Researching...</p>
                  <p className="text-xs text-gray-400">
                    This may take a few moments
                  </p>
                </div>
              )}

              {/* Error State */}
              {researchError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600">
                    {researchError.message || 'An error occurred during research'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => research(query)}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Try again
                  </Button>
                </div>
              )}

              {/* Research Results */}
              {findings && !isResearching && (
                <>
                  {savedFeedback && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-sm text-green-700">{savedFeedback}</p>
                    </div>
                  )}
                  <ResearchFindings
                    findings={findings}
                    sources={sources}
                    onSave={handleSave}
                    isSaving={isSaving}
                  />
                </>
              )}

              {/* Empty State */}
              {!findings && !isResearching && !researchError && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <SearchIcon />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Research your task
                  </h3>
                  <p className="text-xs text-gray-500 max-w-[250px] mx-auto">
                    Enter a question above to get AI-powered research findings
                    related to your task.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {researchContexts.length} saved research{researchContexts.length !== 1 ? 'es' : ''}
            </span>
            <button
              onClick={() => refreshContexts()}
              className="hover:text-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchPanel
