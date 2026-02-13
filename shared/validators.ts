import type {
  ChatStreamCancelRequest,
  ChatStreamDeltaEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamStartInput,
  ConversationsCreateRequest,
  ConversationsMoveToSpaceRequest,
  ConversationsPinRequest,
  ConversationsReorderPinnedRequest,
  CredentialsSetOpenAIKeyRequest,
  MessagesListByConversationRequest,
  SpacesCreateRequest,
  SpacesReorderRequest,
  SpacesUpdateRequest,
  SettingsGetRequest,
  SettingsSetRequest
} from '@shared/types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry))
}

function hasUniqueEntries(entries: string[]): boolean {
  return new Set(entries).size === entries.length
}

export function validateSettingsGetRequest(value: unknown): asserts value is SettingsGetRequest {
  if (!isObject(value) || !isNonEmptyString((value as { key?: unknown }).key)) {
    throw new Error('Invalid settings.get payload')
  }
}

export function validateSettingsSetRequest(value: unknown): asserts value is SettingsSetRequest {
  if (!isObject(value)) {
    throw new Error('Invalid settings.set payload')
  }

  const candidate = value as { key?: unknown; value?: unknown }
  if (!isNonEmptyString(candidate.key) || typeof candidate.value !== 'string') {
    throw new Error('Invalid settings.set payload')
  }
}

export function validateCredentialsSetOpenAIKeyRequest(
  value: unknown
): asserts value is CredentialsSetOpenAIKeyRequest {
  if (!isObject(value) || !isNonEmptyString((value as { apiKey?: unknown }).apiKey)) {
    throw new Error('Invalid credentials.setOpenAIKey payload')
  }
}

export function validateConversationsCreateRequest(
  value: unknown
): asserts value is ConversationsCreateRequest {
  if (value === undefined) {
    return
  }

  if (!isObject(value)) {
    throw new Error('Invalid conversations.create payload')
  }

  const candidate = value as { title?: unknown; spaceId?: unknown }
  if (
    (candidate.title !== undefined && !isNonEmptyString(candidate.title)) ||
    (candidate.spaceId !== undefined && !isNonEmptyString(candidate.spaceId))
  ) {
    throw new Error('Invalid conversations.create payload')
  }
}

export function validateSpacesCreateRequest(value: unknown): asserts value is SpacesCreateRequest {
  if (!isObject(value)) {
    throw new Error('Invalid spaces.create payload')
  }

  const candidate = value as { name?: unknown; color?: unknown; icon?: unknown }
  if (
    !isNonEmptyString(candidate.name) ||
    (candidate.color !== undefined && !isNonEmptyString(candidate.color)) ||
    (candidate.icon !== undefined && !isNonEmptyString(candidate.icon))
  ) {
    throw new Error('Invalid spaces.create payload')
  }
}

export function validateSpacesUpdateRequest(value: unknown): asserts value is SpacesUpdateRequest {
  if (!isObject(value)) {
    throw new Error('Invalid spaces.update payload')
  }

  const candidate = value as { id?: unknown; name?: unknown; color?: unknown; icon?: unknown }
  const hasName = candidate.name !== undefined
  const hasColor = candidate.color !== undefined
  const hasIcon = candidate.icon !== undefined

  if (
    !isNonEmptyString(candidate.id) ||
    (!hasName && !hasColor && !hasIcon) ||
    (hasName && !isNonEmptyString(candidate.name)) ||
    (hasColor &&
      (!isNullableString(candidate.color) ||
        (typeof candidate.color === 'string' && candidate.color.trim().length === 0))) ||
    (hasIcon &&
      (!isNullableString(candidate.icon) ||
        (typeof candidate.icon === 'string' && candidate.icon.trim().length === 0)))
  ) {
    throw new Error('Invalid spaces.update payload')
  }
}

export function validateSpacesReorderRequest(
  value: unknown
): asserts value is SpacesReorderRequest {
  if (!isObject(value)) {
    throw new Error('Invalid spaces.reorder payload')
  }

  const orderedSpaceIds = (value as { orderedSpaceIds?: unknown }).orderedSpaceIds
  if (
    !isNonEmptyStringArray(orderedSpaceIds) ||
    orderedSpaceIds.length === 0 ||
    !hasUniqueEntries(orderedSpaceIds)
  ) {
    throw new Error('Invalid spaces.reorder payload')
  }
}

export function validateConversationsPinRequest(
  value: unknown
): asserts value is ConversationsPinRequest {
  if (!isObject(value)) {
    throw new Error('Invalid conversations.pin payload')
  }

  const candidate = value as { conversationId?: unknown; pinned?: unknown }
  if (
    !isNonEmptyString(candidate.conversationId) ||
    typeof candidate.pinned !== 'boolean'
  ) {
    throw new Error('Invalid conversations.pin payload')
  }
}

export function validateConversationsReorderPinnedRequest(
  value: unknown
): asserts value is ConversationsReorderPinnedRequest {
  if (!isObject(value)) {
    throw new Error('Invalid conversations.reorderPinned payload')
  }

  const candidate = value as { spaceId?: unknown; orderedConversationIds?: unknown }
  if (
    !isNonEmptyString(candidate.spaceId) ||
    !isNonEmptyStringArray(candidate.orderedConversationIds) ||
    !hasUniqueEntries(candidate.orderedConversationIds)
  ) {
    throw new Error('Invalid conversations.reorderPinned payload')
  }
}

export function validateConversationsMoveToSpaceRequest(
  value: unknown
): asserts value is ConversationsMoveToSpaceRequest {
  if (!isObject(value)) {
    throw new Error('Invalid conversations.moveToSpace payload')
  }

  const candidate = value as { conversationId?: unknown; spaceId?: unknown }
  if (
    !isNonEmptyString(candidate.conversationId) ||
    !isNonEmptyString(candidate.spaceId)
  ) {
    throw new Error('Invalid conversations.moveToSpace payload')
  }
}

export function validateMessagesListByConversationRequest(
  value: unknown
): asserts value is MessagesListByConversationRequest {
  if (
    !isObject(value) ||
    !isNonEmptyString((value as { conversationId?: unknown }).conversationId)
  ) {
    throw new Error('Invalid messages.listByConversation payload')
  }
}

export function validateChatStreamStartInput(
  value: unknown
): asserts value is ChatStreamStartInput {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.start payload')
  }

  const candidate = value as { conversationId?: unknown; prompt?: unknown; model?: unknown }
  if (
    !isNonEmptyString(candidate.conversationId) ||
    !isNonEmptyString(candidate.prompt) ||
    (candidate.model !== undefined && !isNonEmptyString(candidate.model))
  ) {
    throw new Error('Invalid chat.stream.start payload')
  }
}

export function validateChatStreamCancelRequest(
  value: unknown
): asserts value is ChatStreamCancelRequest {
  if (!isObject(value) || !isNonEmptyString((value as { requestId?: unknown }).requestId)) {
    throw new Error('Invalid chat.stream.cancel payload')
  }
}

export function validateChatStreamDeltaEvent(
  value: unknown
): asserts value is ChatStreamDeltaEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.delta payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    delta?: unknown
  }

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    typeof candidate.delta !== 'string'
  ) {
    throw new Error('Invalid chat.stream.delta payload')
  }
}

export function validateChatStreamDoneEvent(
  value: unknown
): asserts value is ChatStreamDoneEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.done payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    messageId?: unknown
    cancelled?: unknown
  }

  const messageIdIsValid =
    candidate.messageId === null ||
    isNonEmptyString(candidate.messageId)

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    !messageIdIsValid ||
    typeof candidate.cancelled !== 'boolean'
  ) {
    throw new Error('Invalid chat.stream.done payload')
  }
}

export function validateChatStreamErrorEvent(
  value: unknown
): asserts value is ChatStreamErrorEvent {
  if (!isObject(value)) {
    throw new Error('Invalid chat.stream.error payload')
  }

  const candidate = value as {
    requestId?: unknown
    conversationId?: unknown
    error?: unknown
  }

  if (
    !isNonEmptyString(candidate.requestId) ||
    !isNonEmptyString(candidate.conversationId) ||
    !isNonEmptyString(candidate.error)
  ) {
    throw new Error('Invalid chat.stream.error payload')
  }
}
