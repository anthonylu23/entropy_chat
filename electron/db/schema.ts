export const TABLES = {
  providers: 'providers',
  conversations: 'conversations',
  messages: 'messages',
  settings: 'settings'
} as const

export function getSchemaVersion(): number {
  return 1
}
