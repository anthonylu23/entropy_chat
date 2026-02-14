import { describe, expect, test } from 'bun:test'
import {
  APP_NAME,
  APP_VERSION,
  SPACE_NAME_MAX_LENGTH,
  SPACE_NAME_MIN_LENGTH,
} from '../../shared/constants'

describe('shared/constants', () => {
  test('exports the app name', () => {
    expect(APP_NAME).toBe('Entropy Chat')
  })

  test('exports a semantic app version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('exports valid space-name bounds', () => {
    expect(SPACE_NAME_MIN_LENGTH).toBe(1)
    expect(SPACE_NAME_MAX_LENGTH).toBeGreaterThan(SPACE_NAME_MIN_LENGTH)
  })
})
