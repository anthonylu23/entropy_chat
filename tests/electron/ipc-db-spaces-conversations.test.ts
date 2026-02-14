import { readFileSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('electron', () => ({
  ipcMain: {
    handle: () => undefined
  }
}))

mock.module('@electron/db/bootstrap', () => ({
  getDatabase: () => {
    throw new Error('getDatabase should not be called in db function tests')
  }
}))

const MIGRATION_001_SQL = readFileSync(
  new URL('../../electron/db/migrations/001_init.sql', import.meta.url),
  'utf8'
)
const MIGRATION_002_SQL = readFileSync(
  new URL('../../electron/db/migrations/002_spaces_layout.sql', import.meta.url),
  'utf8'
)

let dbModule: typeof import('../../electron/ipc/db')

function createInMemoryDb(): Database {
  const db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(MIGRATION_001_SQL)
  db.exec(MIGRATION_002_SQL)
  return db
}

function getPinnedIdsByOrder(db: Database, spaceId: string): string[] {
  const rows = db
    .query(
      `
        SELECT id
        FROM conversations
        WHERE space_id = ? AND pinned = 1
        ORDER BY pinned_order ASC
      `
    )
    .all(spaceId) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

function getConversationState(db: Database, conversationId: string) {
  return db
    .query(
      `
        SELECT id, space_id, pinned, pinned_order
        FROM conversations
        WHERE id = ?
      `
    )
    .get(conversationId) as
    | { id: string; space_id: string; pinned: number; pinned_order: number | null }
    | null
}

function assertPinnedOrderInvariant(db: Database, spaceId: string): void {
  const rows = db
    .query(
      `
        SELECT pinned_order
        FROM conversations
        WHERE space_id = ? AND pinned = 1
        ORDER BY pinned_order ASC
      `
    )
    .all(spaceId) as Array<{ pinned_order: number | null }>

  const orders = rows.map((row) => row.pinned_order)
  const expected = Array.from({ length: orders.length }, (_, index) => index + 1)
  expect(orders).toEqual(expected)
}

function assertForeignKeyIntegrity(db: Database): void {
  const fkIssues = db.query('PRAGMA foreign_key_check').all()
  expect(fkIssues.length).toBe(0)
}

beforeAll(async () => {
  dbModule = await import('../../electron/ipc/db')
})

describe('electron/ipc/db spaces and conversation semantics', () => {
  test('spaces lifecycle supports create, update, reorder, and set validation', () => {
    const db = createInMemoryDb()
    try {
      const initialSpaces = dbModule.listSpaces(db as unknown as never)
      expect(initialSpaces.length).toBe(1)
      expect(initialSpaces[0]?.id).toBe('space_general')
      expect(initialSpaces[0]?.sortOrder).toBe(0)

      const alpha = dbModule.createSpace(db as unknown as never, {
        name: 'Alpha',
        color: '#123456'
      })
      const beta = dbModule.createSpace(db as unknown as never, {
        name: 'Beta',
        icon: 'box'
      })

      const listed = dbModule.listSpaces(db as unknown as never)
      expect(listed.map((space) => space.id)).toEqual(['space_general', alpha.id, beta.id])
      expect(listed.map((space) => space.sortOrder)).toEqual([0, 1, 2])

      const updatedAlpha = dbModule.updateSpace(db as unknown as never, {
        id: alpha.id,
        name: 'Alpha Team',
        color: null,
        icon: 'briefcase'
      })
      expect(updatedAlpha.name).toBe('Alpha Team')
      expect(updatedAlpha.color).toBeNull()
      expect(updatedAlpha.icon).toBe('briefcase')

      dbModule.reorderSpaces(db as unknown as never, {
        orderedSpaceIds: [beta.id, 'space_general', alpha.id]
      })
      const reordered = dbModule.listSpaces(db as unknown as never)
      expect(reordered.map((space) => space.id)).toEqual([beta.id, 'space_general', alpha.id])
      expect(reordered.map((space) => space.sortOrder)).toEqual([0, 1, 2])

      expect(() =>
        dbModule.reorderSpaces(db as unknown as never, {
          orderedSpaceIds: ['space_general', alpha.id]
        })
      ).toThrow('id count mismatch')

      expect(() =>
        dbModule.reorderSpaces(db as unknown as never, {
          orderedSpaceIds: ['space_general', alpha.id, 'space_missing']
        })
      ).toThrow('unknown id')

      assertForeignKeyIntegrity(db)
    } finally {
      db.close()
    }
  })

  test('createConversation defaults to general space and rejects unknown space ids', () => {
    const db = createInMemoryDb()
    try {
      const created = dbModule.createConversation(db as unknown as never, { title: 'General chat' })
      expect(created.spaceId).toBe('space_general')
      expect(created.pinned).toBeFalse()
      expect(created.pinnedOrder).toBeNull()

      expect(() =>
        dbModule.createConversation(db as unknown as never, {
          title: 'Invalid',
          spaceId: 'space_missing'
        })
      ).toThrow('Space not found')

      assertForeignKeyIntegrity(db)
    } finally {
      db.close()
    }
  })

  test('pin and unpin maintain contiguous per-space pinned order', () => {
    const db = createInMemoryDb()
    try {
      const teamSpace = dbModule.createSpace(db as unknown as never, { name: 'Team' })
      const otherSpace = dbModule.createSpace(db as unknown as never, { name: 'Other' })

      const a = dbModule.createConversation(db as unknown as never, { title: 'A', spaceId: teamSpace.id })
      const b = dbModule.createConversation(db as unknown as never, { title: 'B', spaceId: teamSpace.id })
      const c = dbModule.createConversation(db as unknown as never, { title: 'C', spaceId: teamSpace.id })
      const x = dbModule.createConversation(db as unknown as never, { title: 'X', spaceId: otherSpace.id })

      dbModule.pinConversation(db as unknown as never, { conversationId: a.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: b.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: c.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: x.id, pinned: true })

      expect(getPinnedIdsByOrder(db, teamSpace.id)).toEqual([a.id, b.id, c.id])
      expect(getPinnedIdsByOrder(db, otherSpace.id)).toEqual([x.id])

      dbModule.pinConversation(db as unknown as never, { conversationId: b.id, pinned: false })
      expect(getPinnedIdsByOrder(db, teamSpace.id)).toEqual([a.id, c.id])

      const bStateAfterUnpin = getConversationState(db, b.id)
      expect(bStateAfterUnpin?.pinned).toBe(0)
      expect(bStateAfterUnpin?.pinned_order).toBeNull()

      dbModule.pinConversation(db as unknown as never, { conversationId: b.id, pinned: true })
      expect(getPinnedIdsByOrder(db, teamSpace.id)).toEqual([a.id, c.id, b.id])
      assertPinnedOrderInvariant(db, teamSpace.id)
      assertPinnedOrderInvariant(db, otherSpace.id)
      assertForeignKeyIntegrity(db)
    } finally {
      db.close()
    }
  })

  test('reorderPinnedConversations enforces exact pinned id set', () => {
    const db = createInMemoryDb()
    try {
      const space = dbModule.createSpace(db as unknown as never, { name: 'Reorder' })
      const emptySpace = dbModule.createSpace(db as unknown as never, { name: 'Empty' })

      const one = dbModule.createConversation(db as unknown as never, { title: 'One', spaceId: space.id })
      const two = dbModule.createConversation(db as unknown as never, { title: 'Two', spaceId: space.id })
      const three = dbModule.createConversation(db as unknown as never, { title: 'Three', spaceId: space.id })

      dbModule.pinConversation(db as unknown as never, { conversationId: one.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: two.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: three.id, pinned: true })

      dbModule.reorderPinnedConversations(db as unknown as never, {
        spaceId: space.id,
        orderedConversationIds: [three.id, one.id, two.id]
      })
      expect(getPinnedIdsByOrder(db, space.id)).toEqual([three.id, one.id, two.id])

      dbModule.reorderPinnedConversations(db as unknown as never, {
        spaceId: emptySpace.id,
        orderedConversationIds: []
      })
      expect(getPinnedIdsByOrder(db, emptySpace.id)).toEqual([])

      expect(() =>
        dbModule.reorderPinnedConversations(db as unknown as never, {
          spaceId: space.id,
          orderedConversationIds: [three.id, one.id]
        })
      ).toThrow('id count mismatch')

      expect(() =>
        dbModule.reorderPinnedConversations(db as unknown as never, {
          spaceId: space.id,
          orderedConversationIds: [three.id, one.id, 'conv_missing']
        })
      ).toThrow('unknown id')

      expect(() =>
        dbModule.reorderPinnedConversations(db as unknown as never, {
          spaceId: 'space_missing',
          orderedConversationIds: []
        })
      ).toThrow('Space not found')

      assertPinnedOrderInvariant(db, space.id)
      assertForeignKeyIntegrity(db)
    } finally {
      db.close()
    }
  })

  test('moveConversationToSpace preserves pinned semantics and compacts source ordering', () => {
    const db = createInMemoryDb()
    try {
      const source = dbModule.createSpace(db as unknown as never, { name: 'Source' })
      const target = dbModule.createSpace(db as unknown as never, { name: 'Target' })

      const s1 = dbModule.createConversation(db as unknown as never, { title: 'S1', spaceId: source.id })
      const s2 = dbModule.createConversation(db as unknown as never, { title: 'S2', spaceId: source.id })
      const s3 = dbModule.createConversation(db as unknown as never, { title: 'S3', spaceId: source.id })
      const t1 = dbModule.createConversation(db as unknown as never, { title: 'T1', spaceId: target.id })

      dbModule.pinConversation(db as unknown as never, { conversationId: s1.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: s2.id, pinned: true })
      dbModule.pinConversation(db as unknown as never, { conversationId: t1.id, pinned: true })

      const movedPinned = dbModule.moveConversationToSpace(db as unknown as never, {
        conversationId: s2.id,
        spaceId: target.id
      })
      expect(movedPinned.spaceId).toBe(target.id)
      expect(movedPinned.pinned).toBeTrue()
      expect(movedPinned.pinnedOrder).toBe(2)
      expect(getPinnedIdsByOrder(db, source.id)).toEqual([s1.id])
      expect(getPinnedIdsByOrder(db, target.id)).toEqual([t1.id, s2.id])

      const movedUnpinned = dbModule.moveConversationToSpace(db as unknown as never, {
        conversationId: s3.id,
        spaceId: target.id
      })
      expect(movedUnpinned.spaceId).toBe(target.id)
      expect(movedUnpinned.pinned).toBeFalse()
      expect(movedUnpinned.pinnedOrder).toBeNull()

      const sameSpaceNoop = dbModule.moveConversationToSpace(db as unknown as never, {
        conversationId: s3.id,
        spaceId: target.id
      })
      expect(sameSpaceNoop.id).toBe(s3.id)
      expect(sameSpaceNoop.spaceId).toBe(target.id)

      expect(() =>
        dbModule.moveConversationToSpace(db as unknown as never, {
          conversationId: s1.id,
          spaceId: 'space_missing'
        })
      ).toThrow('Space not found')

      assertPinnedOrderInvariant(db, source.id)
      assertPinnedOrderInvariant(db, target.id)
      assertForeignKeyIntegrity(db)
    } finally {
      db.close()
    }
  })
})
