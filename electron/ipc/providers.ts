import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { randomUUID } from 'node:crypto'
import type { WebContents } from 'electron'
import { ipcMain } from 'electron'
import { getDatabase } from '@electron/db/bootstrap'
import { getOpenAIApiKey } from '@electron/db/keystore'
import {
  assertConversationExists,
  insertMessage,
  listMessagesByConversation,
  touchConversation
} from '@electron/ipc/db'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import type {
  ChatMessage,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamStartInput
} from '@shared/types'
import {
  validateChatStreamCancelRequest,
  validateChatStreamStartInput
} from '@shared/validators'

const DEFAULT_MODEL = 'gpt-4o-mini'

interface ActiveStream {
  abortController: AbortController
  sender: WebContents
  conversationId: string
  cancelled: boolean
}

const activeStreams = new Map<string, ActiveStream>()

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Unknown provider stream error.'
}

function safeSend(
  sender: WebContents,
  channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS],
  payload: unknown
): void {
  if (!sender.isDestroyed()) {
    sender.send(channel, payload)
  }
}

function toPromptMessage(message: ChatMessage): { role: ChatMessage['role']; content: string } {
  return {
    role: message.role,
    content: message.content
  }
}

async function runOpenAIStream(requestId: string, input: ChatStreamStartInput): Promise<void> {
  const streamState = activeStreams.get(requestId)
  if (!streamState) {
    return
  }

  const db = getDatabase()
  const model = input.model?.trim() || DEFAULT_MODEL
  const apiKey = getOpenAIApiKey(db)

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.')
  }

  assertConversationExists(db, input.conversationId)

  insertMessage(db, {
    conversationId: input.conversationId,
    role: 'user',
    content: input.prompt,
    model
  })
  touchConversation(db, input.conversationId, model)

  const promptMessages = listMessagesByConversation(db, input.conversationId).map(toPromptMessage)
  const openai = createOpenAI({ apiKey })
  const result = streamText({
    model: openai(model),
    messages: promptMessages,
    abortSignal: streamState.abortController.signal
  })

  let assistantText = ''

  for await (const delta of result.textStream) {
    if (streamState.cancelled) {
      break
    }

    assistantText += delta
    safeSend(streamState.sender, IPC_CHANNELS.CHAT_STREAM_DELTA, {
      requestId,
      conversationId: input.conversationId,
      delta
    })
  }

  if (streamState.cancelled) {
    const doneEvent: ChatStreamDoneEvent = {
      requestId,
      conversationId: input.conversationId,
      messageId: null,
      cancelled: true
    }
    safeSend(streamState.sender, IPC_CHANNELS.CHAT_STREAM_DONE, doneEvent)
    return
  }

  let assistantMessageId: string | null = null
  if (assistantText.trim().length > 0) {
    const assistantMessage = insertMessage(db, {
      conversationId: input.conversationId,
      role: 'assistant',
      content: assistantText,
      model
    })
    assistantMessageId = assistantMessage.id
    touchConversation(db, input.conversationId, model)
  }

  const doneEvent: ChatStreamDoneEvent = {
    requestId,
    conversationId: input.conversationId,
    messageId: assistantMessageId,
    cancelled: false
  }
  safeSend(streamState.sender, IPC_CHANNELS.CHAT_STREAM_DONE, doneEvent)
}

export function registerProviderHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CHAT_STREAM_START, async (event, payload: unknown) => {
    validateChatStreamStartInput(payload)

    const requestId = randomUUID()
    const streamState: ActiveStream = {
      abortController: new AbortController(),
      sender: event.sender,
      conversationId: payload.conversationId,
      cancelled: false
    }
    activeStreams.set(requestId, streamState)

    void runOpenAIStream(requestId, payload)
      .catch((error: unknown) => {
        const currentState = activeStreams.get(requestId)
        if (!currentState) {
          return
        }

        if (currentState.cancelled || isAbortError(error)) {
          const doneEvent: ChatStreamDoneEvent = {
            requestId,
            conversationId: currentState.conversationId,
            messageId: null,
            cancelled: true
          }
          safeSend(currentState.sender, IPC_CHANNELS.CHAT_STREAM_DONE, doneEvent)
          return
        }

        const errorEvent: ChatStreamErrorEvent = {
          requestId,
          conversationId: currentState.conversationId,
          error: toErrorMessage(error)
        }
        safeSend(currentState.sender, IPC_CHANNELS.CHAT_STREAM_ERROR, errorEvent)
      })
      .finally(() => {
        activeStreams.delete(requestId)
      })

    return { requestId }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_STREAM_CANCEL, async (_event, payload: unknown) => {
    validateChatStreamCancelRequest(payload)

    const streamState = activeStreams.get(payload.requestId)
    if (!streamState) {
      return
    }

    streamState.cancelled = true
    streamState.abortController.abort()
  })
}
