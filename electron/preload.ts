import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC_CHANNELS, type EntropyApi } from '@shared/types'
import {
  validateChatStreamCancelRequest,
  validateChatStreamDeltaEvent,
  validateChatStreamDoneEvent,
  validateChatStreamErrorEvent,
  validateChatStreamStartInput,
  validateConversationsCreateRequest,
  validateCredentialsSetOpenAIKeyRequest,
  validateMessagesListByConversationRequest,
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '@shared/validators'

function subscribe<T>(
  channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS],
  validatePayload: (payload: unknown) => asserts payload is T,
  listener: (event: T) => void
): () => void {
  const wrapped = (_event: IpcRendererEvent, payload: unknown) => {
    validatePayload(payload)
    listener(payload)
  }
  ipcRenderer.on(channel, wrapped)
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

const entropyApi: EntropyApi = {
  system: {
    ping: async () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_PING)
  },
  settings: {
    get: async (key: string) => {
      const payload = { key }
      validateSettingsGetRequest(payload)
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, payload)
    },
    set: async (key: string, value: string) => {
      const payload = { key, value }
      validateSettingsSetRequest(payload)
      await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, payload)
    }
  },
  credentials: {
    hasOpenAIKey: async () => ipcRenderer.invoke(IPC_CHANNELS.CREDENTIALS_HAS_OPENAI_KEY),
    setOpenAIKey: async (apiKey: string) => {
      const payload = { apiKey }
      validateCredentialsSetOpenAIKeyRequest(payload)
      await ipcRenderer.invoke(IPC_CHANNELS.CREDENTIALS_SET_OPENAI_KEY, payload)
    }
  },
  conversations: {
    list: async () => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_LIST),
    create: async (input) => {
      validateConversationsCreateRequest(input)
      return ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_CREATE, input)
    }
  },
  messages: {
    listByConversation: async (conversationId: string) => {
      const payload = { conversationId }
      validateMessagesListByConversationRequest(payload)
      return ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_LIST_BY_CONVERSATION, payload)
    }
  },
  chat: {
    stream: {
      start: async (input) => {
        validateChatStreamStartInput(input)
        return ipcRenderer.invoke(IPC_CHANNELS.CHAT_STREAM_START, input)
      },
      cancel: async (requestId: string) => {
        const payload = { requestId }
        validateChatStreamCancelRequest(payload)
        await ipcRenderer.invoke(IPC_CHANNELS.CHAT_STREAM_CANCEL, payload)
      }
    },
    onDelta: (listener) =>
      subscribe(IPC_CHANNELS.CHAT_STREAM_DELTA, validateChatStreamDeltaEvent, listener),
    onDone: (listener) =>
      subscribe(IPC_CHANNELS.CHAT_STREAM_DONE, validateChatStreamDoneEvent, listener),
    onError: (listener) =>
      subscribe(IPC_CHANNELS.CHAT_STREAM_ERROR, validateChatStreamErrorEvent, listener)
  }
}

contextBridge.exposeInMainWorld('entropy', entropyApi)
