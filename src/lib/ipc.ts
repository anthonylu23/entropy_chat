import type { EntropyApi } from '@shared/types'

export function getEntropyApi(): EntropyApi | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.entropy ?? null
}

export function requireEntropyApi(): EntropyApi {
  const api = getEntropyApi()
  if (!api) {
    throw new Error('Preload bridge not available')
  }
  return api
}
