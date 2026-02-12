import { describe, expect, test } from 'bun:test'
import { cn } from '../../../src/lib/utils'

describe('src/lib/utils', () => {
  test('combines class values using clsx semantics', () => {
    expect(cn('text-sm', ['font-bold', null], { block: true, hidden: false })).toBe(
      'text-sm font-bold block'
    )
  })

  test('resolves conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4', 'text-sm')).toBe('p-4 text-sm')
  })
})
