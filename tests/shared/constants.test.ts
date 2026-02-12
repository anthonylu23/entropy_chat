import { describe, expect, test } from 'bun:test'
import { APP_NAME, APP_VERSION } from '../../shared/constants'

describe('shared/constants', () => {
  test('exports the app name', () => {
    expect(APP_NAME).toBe('Entropy Chat')
  })

  test('exports a semantic app version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
