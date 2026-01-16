/**
 * AISuggestions Component
 * Displays contextual AI suggestions for the current task
 */

import { type FC } from 'react'

interface Suggestion {
  type: 'decompose' | 'research' | 'draft' | 'summarize'
  label: string
  description: string
}

interface AISuggestionsProps {
  suggestions: Suggestion[]
  onSelect: (type: Suggestion['type']) => void
}

const suggestionIcons: Record<Suggestion['type'], string> = {
  decompose: '///',
  research: '?',
  draft: '//',
  summarize: '-',
}

export const AISuggestions: FC<AISuggestionsProps> = ({
  suggestions,
  onSelect,
}) => {
  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-foreground text-sm font-medium">AI Suggestions</h3>
      <div className="grid gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.type}
            onClick={() => onSelect(suggestion.type)}
            className="border-border flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
              {suggestionIcons[suggestion.type]}
            </span>
            <div>
              <p className="text-sm font-medium">{suggestion.label}</p>
              <p className="text-muted-foreground text-xs">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
