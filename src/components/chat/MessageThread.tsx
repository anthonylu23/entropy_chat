import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@shared/types'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { MessageBubble } from '@renderer/components/chat/MessageBubble'

interface MessageThreadProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
}

export function MessageThread({
  messages,
  streamingContent,
  isStreaming,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-4 p-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isStreaming && streamingContent.length > 0 && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
