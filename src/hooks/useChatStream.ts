import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { requireEntropyApi } from '@renderer/lib/ipc'
import type { ChatStreamStartInput, Unsubscribe } from '@shared/types'
import { QUERY_KEYS } from '@renderer/hooks/useConversations'

interface ChatStreamState {
  /** Accumulated assistant text while streaming */
  streamingContent: string
  /** Whether a stream is in flight */
  isStreaming: boolean
  /** Last stream error message, if any */
  error: string | null
}

interface ActiveStreamRef {
  requestId: string
  conversationId: string
}

export function useChatStream(conversationId: string | null) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<ChatStreamState>({
    streamingContent: '',
    isStreaming: false,
    error: null,
  })

  const activeStream = useRef<ActiveStreamRef | null>(null)
  const currentConversationId = useRef<string | null>(conversationId)
  const unsubscribes = useRef<Unsubscribe[]>([])

  useEffect(() => {
    currentConversationId.current = conversationId
    setState((prev) => ({
      ...prev,
      streamingContent: '',
      error: null,
      isStreaming: activeStream.current?.conversationId === conversationId,
    }))
  }, [conversationId])

  // Subscribe to stream events when the hook mounts
  useEffect(() => {
    const api = requireEntropyApi()

    const offDelta = api.chat.onDelta((event) => {
      if (event.requestId !== activeStream.current?.requestId) return
      if (event.conversationId !== currentConversationId.current) return
      setState((prev) => ({
        ...prev,
        streamingContent: prev.streamingContent + event.delta,
      }))
    })

    const offDone = api.chat.onDone((event) => {
      if (event.requestId !== activeStream.current?.requestId) return
      const streamConversationId = activeStream.current.conversationId
      activeStream.current = null
      if (streamConversationId === currentConversationId.current) {
        setState({ streamingContent: '', isStreaming: false, error: null })
      }

      // Refresh the message list for this conversation
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages(event.conversationId),
      })
      // Refresh conversation list (updated_at changes)
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations,
      })
    })

    const offError = api.chat.onError((event) => {
      if (event.requestId !== activeStream.current?.requestId) return
      const streamConversationId = activeStream.current.conversationId
      activeStream.current = null
      if (streamConversationId === currentConversationId.current) {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: event.error,
        }))
      }
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.messages(event.conversationId),
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.conversations,
      })
    })

    unsubscribes.current = [offDelta, offDone, offError]

    return () => {
      unsubscribes.current.forEach((unsub) => unsub())
      unsubscribes.current = []
    }
  }, [queryClient])

  const sendMessage = useCallback(
    async (message: string, model?: string) => {
      if (!conversationId) {
        return
      }
      if (activeStream.current) {
        setState((prev) => ({
          ...prev,
          error: 'A response is already in progress for another message.',
        }))
        return
      }
      setState({ streamingContent: '', isStreaming: true, error: null })

      const input: ChatStreamStartInput = { conversationId, prompt: message, model }
      try {
        const { requestId } = await requireEntropyApi().chat.stream.start(input)
        activeStream.current = { requestId, conversationId }
      } catch (error) {
        setState({
          streamingContent: '',
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Failed to start chat stream',
        })
      }
    },
    [conversationId]
  )

  const cancelStream = useCallback(async () => {
    if (!activeStream.current) return
    try {
      await requireEntropyApi().chat.stream.cancel(activeStream.current.requestId)
      if (activeStream.current.conversationId === currentConversationId.current) {
        setState((prev) => ({ ...prev, isStreaming: false }))
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to cancel chat stream',
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    sendMessage,
    cancelStream,
    clearError,
  }
}
