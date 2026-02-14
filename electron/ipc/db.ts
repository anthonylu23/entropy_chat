import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { getDatabase } from '@electron/db/bootstrap'
import { IPC_CHANNELS } from '@electron/ipc/channels'
import type {
  ChatMessage,
  ChatRole,
  ConversationSummary,
  ConversationsCreateRequest,
  ConversationsMoveToSpaceRequest,
  ConversationsPinRequest,
  ConversationsReorderPinnedRequest,
  SpaceSummary,
  SpacesCreateRequest,
  SpacesReorderRequest,
  SpacesUpdateRequest
} from '@shared/types'
import {
  SPACE_NAME_MAX_LENGTH,
  SPACE_NAME_MIN_LENGTH,
  isValidSpaceName,
  validateConversationsCreateRequest,
  validateConversationsMoveToSpaceRequest,
  validateConversationsPinRequest,
  validateConversationsReorderPinnedRequest,
  validateMessagesListByConversationRequest,
  validateSpacesCreateRequest,
  validateSpacesReorderRequest,
  validateSpacesUpdateRequest
} from '@shared/validators'

const DEFAULT_PROVIDER_ID = 'openai'
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_SPACE_ID = 'space_general'

interface ConversationRow {
  id: string
  title: string | null
  model: string
  provider_id: string
  pinned: number
  space_id: string
  pinned_order: number | null
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: ChatRole
  content: string
  model: string | null
  tokens_used: number | null
  created_at: string
}

interface SpaceRow {
  id: string
  name: string
  color: string | null
  icon: string | null
  sort_order: number
  is_default: number
  created_at: string
  updated_at: string
}

interface IdRow {
  id: string
}

interface NextOrderRow {
  next_order: number
}

export interface InsertMessageInput {
  id?: string
  conversationId: string
  role: ChatRole
  content: string
  model?: string | null
  tokensUsed?: number | null
}

const CONVERSATION_COLUMNS = `
  id,
  title,
  model,
  provider_id,
  pinned,
  space_id,
  pinned_order,
  created_at,
  updated_at
`

function mapConversationRow(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    providerId: row.provider_id,
    pinned: row.pinned === 1,
    spaceId: row.space_id,
    pinnedOrder: row.pinned_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    model: row.model,
    tokensUsed: row.tokens_used,
    createdAt: row.created_at
  }
}

function mapSpaceRow(row: SpaceRow): SpaceSummary {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getConversationRowById(db: Database, conversationId: string): ConversationRow {
  const row = db
    .prepare(
      `
      SELECT ${CONVERSATION_COLUMNS}
      FROM conversations
      WHERE id = ?
      `
    )
    .get(conversationId) as ConversationRow | undefined

  if (!row) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }
  return row
}

function getSpaceRowById(db: Database, spaceId: string): SpaceRow {
  const row = db
    .prepare(
      `
      SELECT id, name, color, icon, sort_order, is_default, created_at, updated_at
      FROM spaces
      WHERE id = ?
      `
    )
    .get(spaceId) as SpaceRow | undefined

  if (!row) {
    throw new Error(`Space not found: ${spaceId}`)
  }

  return row
}

function getNextSpaceSortOrder(db: Database): number {
  const row = db
    .prepare(
      `
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
      FROM spaces
      `
    )
    .get() as NextOrderRow

  return row.next_order
}

function getNextPinnedOrder(db: Database, spaceId: string): number {
  const row = db
    .prepare(
      `
      SELECT COALESCE(MAX(pinned_order), 0) + 1 AS next_order
      FROM conversations
      WHERE space_id = ? AND pinned = 1
      `
    )
    .get(spaceId) as NextOrderRow

  return row.next_order
}

function getPinnedConversationIds(db: Database, spaceId: string): string[] {
  const rows = db
    .prepare(
      `
      SELECT id
      FROM conversations
      WHERE space_id = ? AND pinned = 1
      ORDER BY
        CASE WHEN pinned_order IS NULL THEN 1 ELSE 0 END ASC,
        pinned_order ASC,
        updated_at DESC,
        created_at DESC,
        id ASC
      `
    )
    .all(spaceId) as IdRow[]

  return rows.map((row) => row.id)
}

function assertExactIdSet(actualIds: string[], requestedIds: string[], label: string): void {
  if (actualIds.length !== requestedIds.length) {
    throw new Error(`Invalid ${label} payload: id count mismatch.`)
  }

  const actual = new Set(actualIds)
  const requested = new Set(requestedIds)
  if (actual.size !== requested.size) {
    throw new Error(`Invalid ${label} payload: duplicate or mismatched ids.`)
  }

  for (const id of requested) {
    if (!actual.has(id)) {
      throw new Error(`Invalid ${label} payload: unknown id "${id}".`)
    }
  }
}

function compactPinnedOrder(db: Database, spaceId: string): void {
  const pinnedIds = getPinnedConversationIds(db, spaceId)
  const updatePinnedOrder = db.prepare(
    `
      UPDATE conversations
      SET pinned_order = ?
      WHERE id = ?
    `
  )

  pinnedIds.forEach((conversationId, index) => {
    updatePinnedOrder.run(index + 1, conversationId)
  })
}

export function assertSpaceExists(db: Database, spaceId: string): void {
  getSpaceRowById(db, spaceId)
}

export function assertConversationExists(db: Database, conversationId: string): void {
  getConversationRowById(db, conversationId)
}

export function listSpaces(db: Database): SpaceSummary[] {
  const rows = db
    .prepare(
      `
      SELECT id, name, color, icon, sort_order, is_default, created_at, updated_at
      FROM spaces
      ORDER BY sort_order ASC, created_at ASC
      `
    )
    .all() as SpaceRow[]

  return rows.map(mapSpaceRow)
}

export function createSpace(db: Database, input: SpacesCreateRequest): SpaceSummary {
  const id = randomUUID()
  const now = new Date().toISOString()
  const name = input.name.trim()
  if (!isValidSpaceName(name)) {
    throw new Error(
      `Invalid spaces.create payload: name must be between ${SPACE_NAME_MIN_LENGTH} and ${SPACE_NAME_MAX_LENGTH} characters.`
    )
  }
  const color = input.color?.trim() ?? null
  const icon = input.icon?.trim() ?? null
  const sortOrder = getNextSpaceSortOrder(db)

  db.prepare(
    `
      INSERT INTO spaces (
        id,
        name,
        color,
        icon,
        sort_order,
        is_default,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `
  ).run(id, name, color, icon, sortOrder, now, now)

  return mapSpaceRow(getSpaceRowById(db, id))
}

export function updateSpace(db: Database, input: SpacesUpdateRequest): SpaceSummary {
  assertSpaceExists(db, input.id)

  const setClauses: string[] = []
  const params: Array<string | null> = []

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!isValidSpaceName(name)) {
      throw new Error(
        `Invalid spaces.update payload: name must be between ${SPACE_NAME_MIN_LENGTH} and ${SPACE_NAME_MAX_LENGTH} characters.`
      )
    }
    setClauses.push('name = ?')
    params.push(name)
  }
  if (input.color !== undefined) {
    setClauses.push('color = ?')
    params.push(input.color === null ? null : input.color.trim())
  }
  if (input.icon !== undefined) {
    setClauses.push('icon = ?')
    params.push(input.icon === null ? null : input.icon.trim())
  }

  if (setClauses.length === 0) {
    throw new Error('No fields provided for spaces.update.')
  }

  setClauses.push('updated_at = ?')
  params.push(new Date().toISOString())
  params.push(input.id)

  db.prepare(
    `
      UPDATE spaces
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `
  ).run(...params)

  return mapSpaceRow(getSpaceRowById(db, input.id))
}

export function reorderSpaces(db: Database, input: SpacesReorderRequest): void {
  const existingIds = db
    .prepare(
      `
      SELECT id
      FROM spaces
      ORDER BY sort_order ASC, created_at ASC
      `
    )
    .all() as IdRow[]
  const actualIds = existingIds.map((row) => row.id)
  assertExactIdSet(actualIds, input.orderedSpaceIds, 'spaces.reorder')

  const now = new Date().toISOString()
  const updateSpaceOrder = db.prepare(
    `
      UPDATE spaces
      SET sort_order = ?, updated_at = ?
      WHERE id = ?
    `
  )

  const transaction = db.transaction(() => {
    input.orderedSpaceIds.forEach((spaceId, index) => {
      updateSpaceOrder.run(index, now, spaceId)
    })
  })

  transaction()
}

export function listConversations(db: Database): ConversationSummary[] {
  const rows = db
    .prepare(
      `
      SELECT ${CONVERSATION_COLUMNS}
      FROM conversations
      ORDER BY updated_at DESC, created_at DESC
      `
    )
    .all() as ConversationRow[]

  return rows.map(mapConversationRow)
}

export function createConversation(
  db: Database,
  input?: ConversationsCreateRequest
): ConversationSummary {
  const id = randomUUID()
  const now = new Date().toISOString()
  const title = input?.title?.trim() || null
  const spaceId = input?.spaceId?.trim() || DEFAULT_SPACE_ID

  assertSpaceExists(db, spaceId)

  db.prepare(
    `
      INSERT INTO conversations (
        id,
        title,
        model,
        provider_id,
        pinned,
        space_id,
        pinned_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 0, ?, NULL, ?, ?)
    `
  ).run(id, title, DEFAULT_MODEL, DEFAULT_PROVIDER_ID, spaceId, now, now)

  return mapConversationRow(getConversationRowById(db, id))
}

export function pinConversation(
  db: Database,
  input: ConversationsPinRequest
): ConversationSummary {
  const current = getConversationRowById(db, input.conversationId)

  if (input.pinned) {
    if (current.pinned === 1 && current.pinned_order !== null) {
      return mapConversationRow(current)
    }

    db.prepare(
      `
        UPDATE conversations
        SET pinned = 1, pinned_order = ?, updated_at = ?
        WHERE id = ?
      `
    ).run(getNextPinnedOrder(db, current.space_id), new Date().toISOString(), current.id)

    return mapConversationRow(getConversationRowById(db, current.id))
  }

  if (current.pinned === 0 && current.pinned_order === null) {
    return mapConversationRow(current)
  }

  const transaction = db.transaction(() => {
    db.prepare(
      `
        UPDATE conversations
        SET pinned = 0, pinned_order = NULL, updated_at = ?
        WHERE id = ?
      `
    ).run(new Date().toISOString(), current.id)

    compactPinnedOrder(db, current.space_id)
  })
  transaction()

  return mapConversationRow(getConversationRowById(db, current.id))
}

export function reorderPinnedConversations(
  db: Database,
  input: ConversationsReorderPinnedRequest
): void {
  assertSpaceExists(db, input.spaceId)

  const currentPinnedIds = getPinnedConversationIds(db, input.spaceId)
  assertExactIdSet(currentPinnedIds, input.orderedConversationIds, 'conversations.reorderPinned')

  const updatePinnedOrder = db.prepare(
    `
      UPDATE conversations
      SET pinned = 1, pinned_order = ?
      WHERE id = ?
    `
  )

  const transaction = db.transaction(() => {
    input.orderedConversationIds.forEach((conversationId, index) => {
      updatePinnedOrder.run(index + 1, conversationId)
    })
  })
  transaction()
}

export function moveConversationToSpace(
  db: Database,
  input: ConversationsMoveToSpaceRequest
): ConversationSummary {
  const current = getConversationRowById(db, input.conversationId)
  assertSpaceExists(db, input.spaceId)

  if (current.space_id === input.spaceId) {
    return mapConversationRow(current)
  }

  const now = new Date().toISOString()
  if (current.pinned === 1) {
    const transaction = db.transaction(() => {
      db.prepare(
        `
          UPDATE conversations
          SET pinned_order = NULL
          WHERE id = ?
        `
      ).run(current.id)

      compactPinnedOrder(db, current.space_id)

      db.prepare(
        `
          UPDATE conversations
          SET space_id = ?, pinned = 1, pinned_order = ?, updated_at = ?
          WHERE id = ?
        `
      ).run(input.spaceId, getNextPinnedOrder(db, input.spaceId), now, current.id)
    })
    transaction()

    return mapConversationRow(getConversationRowById(db, current.id))
  }

  db.prepare(
    `
      UPDATE conversations
      SET space_id = ?, updated_at = ?
      WHERE id = ?
    `
  ).run(input.spaceId, now, current.id)

  return mapConversationRow(getConversationRowById(db, current.id))
}

export function listMessagesByConversation(
  db: Database,
  conversationId: string
): ChatMessage[] {
  const rows = db
    .prepare(
      `
      SELECT id, conversation_id, role, content, model, tokens_used, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, rowid ASC
      `
    )
    .all(conversationId) as MessageRow[]

  return rows.map(mapMessageRow)
}

export function touchConversation(db: Database, conversationId: string, model?: string): void {
  const now = new Date().toISOString()

  if (model) {
    db.prepare(
      `
      UPDATE conversations
      SET updated_at = ?, model = ?, provider_id = ?
      WHERE id = ?
      `
    ).run(now, model, DEFAULT_PROVIDER_ID, conversationId)
    return
  }

  db.prepare(
    `
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `
  ).run(now, conversationId)
}

export function insertMessage(db: Database, input: InsertMessageInput): ChatMessage {
  const messageId = input.id ?? randomUUID()
  const createdAt = new Date().toISOString()
  const normalizedContent = input.content.trim()

  if (normalizedContent.length === 0) {
    throw new Error('Message content cannot be empty.')
  }

  db.prepare(
    `
      INSERT INTO messages (
        id,
        conversation_id,
        role,
        content,
        model,
        tokens_used,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    messageId,
    input.conversationId,
    input.role,
    normalizedContent,
    input.model ?? null,
    input.tokensUsed ?? null,
    createdAt
  )

  const row = db
    .prepare(
      `
      SELECT id, conversation_id, role, content, model, tokens_used, created_at
      FROM messages
      WHERE id = ?
      `
    )
    .get(messageId) as MessageRow | undefined

  if (!row) {
    throw new Error('Failed to persist message.')
  }

  return mapMessageRow(row)
}

export function registerDatabaseHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SPACES_LIST, async () => {
    const db = getDatabase()
    return listSpaces(db)
  })

  ipcMain.handle(IPC_CHANNELS.SPACES_CREATE, async (_event, payload: unknown) => {
    validateSpacesCreateRequest(payload)
    const db = getDatabase()
    return createSpace(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.SPACES_UPDATE, async (_event, payload: unknown) => {
    validateSpacesUpdateRequest(payload)
    const db = getDatabase()
    return updateSpace(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.SPACES_REORDER, async (_event, payload: unknown) => {
    validateSpacesReorderRequest(payload)
    const db = getDatabase()
    reorderSpaces(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_LIST, async () => {
    const db = getDatabase()
    return listConversations(db)
  })

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_CREATE, async (_event, payload: unknown) => {
    validateConversationsCreateRequest(payload)
    const db = getDatabase()
    return createConversation(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_PIN, async (_event, payload: unknown) => {
    validateConversationsPinRequest(payload)
    const db = getDatabase()
    return pinConversation(db, payload)
  })

  ipcMain.handle(
    IPC_CHANNELS.CONVERSATIONS_REORDER_PINNED,
    async (_event, payload: unknown) => {
      validateConversationsReorderPinnedRequest(payload)
      const db = getDatabase()
      reorderPinnedConversations(db, payload)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_MOVE_TO_SPACE, async (_event, payload: unknown) => {
    validateConversationsMoveToSpaceRequest(payload)
    const db = getDatabase()
    return moveConversationToSpace(db, payload)
  })

  ipcMain.handle(IPC_CHANNELS.MESSAGES_LIST_BY_CONVERSATION, async (_event, payload: unknown) => {
    validateMessagesListByConversationRequest(payload)
    const db = getDatabase()
    assertConversationExists(db, payload.conversationId)
    return listMessagesByConversation(db, payload.conversationId)
  })
}
