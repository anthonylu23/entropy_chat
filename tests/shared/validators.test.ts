import { describe, expect, test } from 'bun:test'
import {
  validateChatStreamCancelRequest,
  validateChatStreamDeltaEvent,
  validateChatStreamDoneEvent,
  validateChatStreamErrorEvent,
  validateChatStreamStartInput,
  validateConversationsCreateRequest,
  validateConversationsMoveToSpaceRequest,
  validateConversationsPinRequest,
  validateConversationsReorderPinnedRequest,
  validateCredentialsSetOpenAIKeyRequest,
  validateMessagesListByConversationRequest,
  validateSpacesCreateRequest,
  validateSpacesReorderRequest,
  validateSpacesUpdateRequest,
  validateSettingsGetRequest,
  validateSettingsSetRequest
} from '../../shared/validators'

type Validator = (value: unknown) => void

function expectValid(validator: Validator, value: unknown): void {
  expect(() => validator(value)).not.toThrow()
}

function expectInvalid(validator: Validator, value: unknown, message: string): void {
  expect(() => validator(value)).toThrow(message)
}

describe('shared/validators', () => {
  test('validates settings.get payloads', () => {
    expectValid(validateSettingsGetRequest, { key: 'theme' })
    expectInvalid(validateSettingsGetRequest, { key: '' }, 'Invalid settings.get payload')
    expectInvalid(validateSettingsGetRequest, null, 'Invalid settings.get payload')
  })

  test('validates settings.set payloads', () => {
    expectValid(validateSettingsSetRequest, { key: 'model', value: 'gpt-4o-mini' })
    expectInvalid(validateSettingsSetRequest, { key: 'model' }, 'Invalid settings.set payload')
    expectInvalid(
      validateSettingsSetRequest,
      { key: 'model', value: 3 },
      'Invalid settings.set payload'
    )
  })

  test('validates credentials.setOpenAIKey payloads', () => {
    expectValid(validateCredentialsSetOpenAIKeyRequest, { apiKey: 'sk-test' })
    expectInvalid(
      validateCredentialsSetOpenAIKeyRequest,
      { apiKey: '   ' },
      'Invalid credentials.setOpenAIKey payload'
    )
  })

  test('validates conversations.create payloads', () => {
    expectValid(validateConversationsCreateRequest, undefined)
    expectValid(validateConversationsCreateRequest, {})
    expectValid(validateConversationsCreateRequest, { title: 'New chat' })
    expectValid(validateConversationsCreateRequest, { title: 'New chat', spaceId: 'space_general' })
    expectInvalid(
      validateConversationsCreateRequest,
      { title: '' },
      'Invalid conversations.create payload'
    )
    expectInvalid(
      validateConversationsCreateRequest,
      { title: 'New chat', spaceId: '' },
      'Invalid conversations.create payload'
    )
  })

  test('validates spaces.create payloads', () => {
    expectValid(validateSpacesCreateRequest, { name: 'General' })
    expectValid(validateSpacesCreateRequest, { name: 'Work', color: '#112233', icon: 'briefcase' })
    expectInvalid(validateSpacesCreateRequest, { name: '' }, 'Invalid spaces.create payload')
    expectInvalid(
      validateSpacesCreateRequest,
      { name: 'Team', color: '' },
      'Invalid spaces.create payload'
    )
  })

  test('validates spaces.update payloads', () => {
    expectValid(validateSpacesUpdateRequest, { id: 'space_general', name: 'General 2' })
    expectValid(validateSpacesUpdateRequest, { id: 'space_general', color: '#abc' })
    expectValid(validateSpacesUpdateRequest, { id: 'space_general', color: null, icon: null })
    expectInvalid(validateSpacesUpdateRequest, { id: 'space_general' }, 'Invalid spaces.update payload')
    expectInvalid(validateSpacesUpdateRequest, { id: '', name: 'x' }, 'Invalid spaces.update payload')
    expectInvalid(
      validateSpacesUpdateRequest,
      { id: 'space_general', icon: '' },
      'Invalid spaces.update payload'
    )
  })

  test('validates spaces.reorder payloads', () => {
    expectValid(validateSpacesReorderRequest, {
      orderedSpaceIds: ['space_general', 'space_work']
    })
    expectInvalid(
      validateSpacesReorderRequest,
      { orderedSpaceIds: [] },
      'Invalid spaces.reorder payload'
    )
    expectInvalid(
      validateSpacesReorderRequest,
      { orderedSpaceIds: ['space_general', 'space_general'] },
      'Invalid spaces.reorder payload'
    )
  })

  test('validates conversations.pin payloads', () => {
    expectValid(validateConversationsPinRequest, { conversationId: 'conv_123', pinned: true })
    expectInvalid(
      validateConversationsPinRequest,
      { conversationId: '', pinned: true },
      'Invalid conversations.pin payload'
    )
    expectInvalid(
      validateConversationsPinRequest,
      { conversationId: 'conv_123', pinned: 'yes' },
      'Invalid conversations.pin payload'
    )
  })

  test('validates conversations.reorderPinned payloads', () => {
    expectValid(validateConversationsReorderPinnedRequest, {
      spaceId: 'space_general',
      orderedConversationIds: ['conv_1', 'conv_2']
    })
    expectValid(validateConversationsReorderPinnedRequest, {
      spaceId: 'space_general',
      orderedConversationIds: []
    })
    expectInvalid(
      validateConversationsReorderPinnedRequest,
      { spaceId: '', orderedConversationIds: [] },
      'Invalid conversations.reorderPinned payload'
    )
    expectInvalid(
      validateConversationsReorderPinnedRequest,
      { spaceId: 'space_general', orderedConversationIds: ['conv_1', 'conv_1'] },
      'Invalid conversations.reorderPinned payload'
    )
  })

  test('validates conversations.moveToSpace payloads', () => {
    expectValid(validateConversationsMoveToSpaceRequest, {
      conversationId: 'conv_123',
      spaceId: 'space_general'
    })
    expectInvalid(
      validateConversationsMoveToSpaceRequest,
      { conversationId: 'conv_123', spaceId: '' },
      'Invalid conversations.moveToSpace payload'
    )
  })

  test('validates messages.listByConversation payloads', () => {
    expectValid(validateMessagesListByConversationRequest, { conversationId: 'conv_123' })
    expectInvalid(
      validateMessagesListByConversationRequest,
      { conversationId: '' },
      'Invalid messages.listByConversation payload'
    )
  })

  test('validates chat.stream.start payloads', () => {
    expectValid(validateChatStreamStartInput, {
      conversationId: 'conv_123',
      prompt: 'Hello'
    })
    expectValid(validateChatStreamStartInput, {
      conversationId: 'conv_123',
      prompt: 'Hello',
      model: 'gpt-4o-mini'
    })
    expectInvalid(
      validateChatStreamStartInput,
      { conversationId: 'conv_123', prompt: '', model: 'gpt-4o-mini' },
      'Invalid chat.stream.start payload'
    )
  })

  test('validates chat.stream.cancel payloads', () => {
    expectValid(validateChatStreamCancelRequest, { requestId: 'req_123' })
    expectInvalid(
      validateChatStreamCancelRequest,
      { requestId: '' },
      'Invalid chat.stream.cancel payload'
    )
  })

  test('validates chat.stream.delta payloads', () => {
    expectValid(validateChatStreamDeltaEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      delta: ''
    })
    expectInvalid(
      validateChatStreamDeltaEvent,
      { requestId: 'req_123', conversationId: 'conv_123', delta: 1 },
      'Invalid chat.stream.delta payload'
    )
  })

  test('validates chat.stream.done payloads', () => {
    expectValid(validateChatStreamDoneEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      messageId: null,
      cancelled: false
    })
    expectValid(validateChatStreamDoneEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      messageId: 'msg_123',
      cancelled: true
    })
    expectInvalid(
      validateChatStreamDoneEvent,
      { requestId: 'req_123', conversationId: 'conv_123', messageId: '', cancelled: false },
      'Invalid chat.stream.done payload'
    )
  })

  test('validates chat.stream.error payloads', () => {
    expectValid(validateChatStreamErrorEvent, {
      requestId: 'req_123',
      conversationId: 'conv_123',
      error: 'rate limited'
    })
    expectInvalid(
      validateChatStreamErrorEvent,
      { requestId: 'req_123', conversationId: 'conv_123', error: '' },
      'Invalid chat.stream.error payload'
    )
  })
})
