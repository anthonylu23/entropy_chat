import initialSchemaSql from '@electron/db/migrations/001_init.sql?raw'

export const TABLES = {
  providers: 'providers',
  conversations: 'conversations',
  messages: 'messages',
  settings: 'settings',
  schemaMigrations: 'schema_migrations'
} as const

export function getSchemaVersion(): number {
  return 1
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
  }
]
