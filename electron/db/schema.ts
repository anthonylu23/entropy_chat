import initialSchemaSql from '@electron/db/migrations/001_init.sql?raw'
import spacesLayoutSchemaSql from '@electron/db/migrations/002_spaces_layout.sql?raw'

export const TABLES = {
  providers: 'providers',
  conversations: 'conversations',
  messages: 'messages',
  settings: 'settings',
  schemaMigrations: 'schema_migrations'
} as const

export function getSchemaVersion(): number {
  return 2
}

export interface MigrationDefinition {
  id: number
  name: string
  sql: string
}

export const MIGRATIONS: readonly MigrationDefinition[] = [
  {
    id: 1,
    name: '001_init',
    sql: initialSchemaSql
  },
  {
    id: 2,
    name: '002_spaces_layout',
    sql: spacesLayoutSchemaSql
  }
]
