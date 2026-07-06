'use client'

import ReactMarkdown from 'react-markdown'

/** Renders an analysis post's markdown body. react-markdown sanitizes by
 * default (no raw HTML), and the `.markdown` styles live in globals.css. */
export function PostBody({ children }: { children: string }) {
  return (
    <div className="markdown text-primary">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
