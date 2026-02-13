import { useState, useCallback, type KeyboardEvent } from 'react'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => boolean | Promise<boolean>
  onCancel: () => void
  isStreaming: boolean
}

export function ChatInput({ onSend, onCancel, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    try {
      const sent = await onSend(trimmed)
      if (sent) {
        setValue('')
      }
    } catch {
      // Errors are surfaced by the parent chat stream hook.
    }
  }, [value, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="border-t border-border p-4">
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onCancel}
            className="shrink-0 self-end"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={() => {
              void handleSend()
            }}
            disabled={value.trim().length === 0}
            className="shrink-0 self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
