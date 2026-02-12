import type { SettingsGetRequest, SettingsSetRequest } from '@shared/types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateSettingsGetRequest(value: unknown): asserts value is SettingsGetRequest {
  if (!value || typeof value !== 'object' || !isNonEmptyString((value as { key?: unknown }).key)) {
    throw new Error('Invalid settings.get payload')
  }
}

export function validateSettingsSetRequest(value: unknown): asserts value is SettingsSetRequest {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid settings.set payload')
  }
  const candidate = value as { key?: unknown; value?: unknown }
  if (!isNonEmptyString(candidate.key) || typeof candidate.value !== 'string') {
    throw new Error('Invalid settings.set payload')
  }
}
