'use client'
import StreamdownMarkdown from './streamdown-markdown'
export function Markdown({ content }: { content: string }) {
  return <StreamdownMarkdown content={content} />
}
