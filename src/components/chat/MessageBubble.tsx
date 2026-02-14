import { cn } from '@renderer/lib/utils'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary/20 text-primary'
            : 'bg-secondary text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current" />
        )}
      </div>
    </div>
  )
}
