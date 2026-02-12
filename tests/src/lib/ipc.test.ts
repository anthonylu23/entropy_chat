import { afterEach, describe, expect, test } from 'bun:test'
import type { EntropyApi } from '../../../shared/types'
import { getEntropyApi, requireEntropyApi } from '../../../src/lib/ipc'

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')

function setWindow(value: unknown): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value
  })
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
    return
  }
  delete (globalThis as { window?: unknown }).window
})

describe('src/lib/ipc', () => {
  test('getEntropyApi returns null when preload bridge is unavailable', () => {
    setWindow(undefined)
    expect(getEntropyApi()).toBeNull()
  })

  test('getEntropyApi returns preload bridge when present', () => {
    const api = { marker: true } as unknown as EntropyApi
    setWindow({ entropy: api })

    expect(getEntropyApi()).toBe(api)
  })

  test('requireEntropyApi throws when preload bridge is unavailable', () => {
    setWindow({})
    expect(() => requireEntropyApi()).toThrow('Preload bridge not available')
  })

  test('requireEntropyApi returns preload bridge when available', () => {
    const api = { marker: true } as unknown as EntropyApi
    setWindow({ entropy: api })

    expect(requireEntropyApi()).toBe(api)
  })
})
