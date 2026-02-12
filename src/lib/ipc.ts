import type { EntropyApi } from '@shared/types'

export function getEntropyApi(): EntropyApi | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.entropy ?? null
}
