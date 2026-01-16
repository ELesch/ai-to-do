/**
 * RichTextEditor Component
 * Rich text editing for task descriptions
 * TODO: Implement with Tiptap (ProseMirror-based)
 */

'use client'

import { type FC, useState } from 'react'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

export const RichTextEditor: FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Add a description...',
  readOnly = false,
}) => {
  const [content, setContent] = useState(value)

  const handleChange = (newContent: string) => {
    setContent(newContent)
    onChange?.(newContent)
  }

  // Placeholder implementation - will be replaced with Tiptap
  return (
    <div className="rounded-lg border">
      {!readOnly && (
        <div className="bg-muted flex items-center gap-1 border-b p-2">
          <button className="hover:bg-muted/80 rounded p-1.5" title="Bold">
            <span className="text-sm font-bold">B</span>
          </button>
          <button className="hover:bg-muted/80 rounded p-1.5" title="Italic">
            <span className="text-sm italic">I</span>
          </button>
          <button className="hover:bg-muted/80 rounded p-1.5" title="List">
            <span className="text-sm">-</span>
          </button>
          <button className="hover:bg-muted/80 rounded p-1.5" title="Checklist">
            <span className="text-sm">[]</span>
          </button>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="min-h-[120px] w-full resize-none p-3 focus:outline-none"
      />
      <p className="text-muted-foreground border-t p-2 text-xs">
        Rich text editor (Tiptap) coming soon
      </p>
    </div>
  )
}
