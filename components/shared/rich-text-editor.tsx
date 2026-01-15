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
        <div className="flex items-center gap-1 border-b p-2 bg-gray-50">
          <button className="p-1.5 rounded hover:bg-gray-200" title="Bold">
            <span className="font-bold text-sm">B</span>
          </button>
          <button className="p-1.5 rounded hover:bg-gray-200" title="Italic">
            <span className="italic text-sm">I</span>
          </button>
          <button className="p-1.5 rounded hover:bg-gray-200" title="List">
            <span className="text-sm">-</span>
          </button>
          <button className="p-1.5 rounded hover:bg-gray-200" title="Checklist">
            <span className="text-sm">[]</span>
          </button>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full min-h-[120px] p-3 resize-none focus:outline-none"
      />
      <p className="text-xs text-gray-400 p-2 border-t">
        Rich text editor (Tiptap) coming soon
      </p>
    </div>
  )
}
