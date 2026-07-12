'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders an analysis post's markdown body (GFM: tables, strikethrough).
 * react-markdown sanitizes by default (no raw HTML); `.markdown` styles live
 * in globals.css. */
export function PostBody({ children }: { children: string }) {
  return (
    <div className="markdown text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
