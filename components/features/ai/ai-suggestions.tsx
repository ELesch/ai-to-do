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
      <h3 className="text-sm font-medium text-gray-700">AI Suggestions</h3>
      <div className="grid gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.type}
            onClick={() => onSelect(suggestion.type)}
            className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-blue-50 hover:border-blue-200"
          >
            <span className="text-blue-600 text-sm font-mono">
              {suggestionIcons[suggestion.type]}
            </span>
            <div>
              <p className="font-medium text-sm">{suggestion.label}</p>
              <p className="text-xs text-gray-500">{suggestion.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
