import { useMessages } from '@renderer/hooks/useConversations'
import { useChatStream } from '@renderer/hooks/useChatStream'
import { MessageThread } from '@renderer/components/chat/MessageThread'
import { ChatInput } from '@renderer/components/chat/ChatInput'

interface ChatViewProps {
  conversationId: string
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId)
  const {
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearError,
  } = useChatStream(conversationId)

  const handleSend = (message: string) => {
    clearError()
    return sendMessage(message)
  }

  const handleCancel = () => {
    void cancelStream()
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageThread
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
      />
      {error && (
        <div className="px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <ChatInput
        onSend={handleSend}
        onCancel={handleCancel}
        isStreaming={isStreaming}
      />
    </div>
  )
}
