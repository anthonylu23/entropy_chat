import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'bun:test'
import tailwindConfig from '../../../tailwind.config'
import type { Config } from 'tailwindcss'

const SRC_ROOT = fileURLToPath(new URL('../../../src/', import.meta.url))
const INDEX_CSS = readFileSync(
  new URL('../../../src/index.css', import.meta.url),
  'utf8'
)
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])

function getCssBlock(css: string, pattern: RegExp): string {
  const match = css.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Expected CSS block for pattern: ${pattern}`)
  }
  return match[1]
}

function getCssVariableNames(css: string): Set<string> {
  return new Set(
    Array.from(css.matchAll(/--([a-z0-9-]+)\s*:/gi), (match) => match[1]!.toLowerCase())
  )
}

function getSourceFilePaths(root: string): string[] {
  const discovered: string[] = []

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name)

    if (entry.isDirectory()) {
      discovered.push(...getSourceFilePaths(entryPath))
      continue
    }

    if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      discovered.push(entryPath)
    }
  }

  return discovered
}

function listForbiddenVisualPrimitives() {
  return [
    { label: 'CSS gradients', pattern: /(?:linear|radial)-gradient\s*\(/i },
    { label: 'glass-card alias', pattern: /\.?glass-card\b/i },
    { label: 'backdrop blur utilities', pattern: /\bbackdrop-blur(?:-[\w[\]-]+)?\b/i },
    { label: 'blur filter functions', pattern: /\bblur\s*\(/i },
    { label: 'drop-shadow utilities', pattern: /\bdrop-shadow(?:-[\w[\]-]+)?\b/i },
  ] as const
}

describe('flat visual token system', () => {
  test('keeps renderer source free of forbidden visual primitives', () => {
    const forbiddenPrimitives = listForbiddenVisualPrimitives()
    const sourceFiles = getSourceFilePaths(SRC_ROOT)
    const violations: string[] = []

    for (const filePath of sourceFiles) {
      const source = readFileSync(filePath, 'utf8')
      const relativePath = relative(SRC_ROOT, filePath)

      for (const primitive of forbiddenPrimitives) {
        if (primitive.pattern.test(source)) {
          violations.push(`${relativePath}: ${primitive.label}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test('enforces typography contract: sans body text and mono code blocks', () => {
    const bodyBlock = getCssBlock(INDEX_CSS, /body\s*\{([\s\S]*?)\}/m)
    const codeBlock = getCssBlock(INDEX_CSS, /code,\s*pre\s*\{([\s\S]*?)\}/m)

    expect(bodyBlock).toContain('font-sans')
    expect(codeBlock).toContain('font-mono')
  })

  test('defines flat Arc-minimal semantic surface tokens', () => {
    const variables = getCssVariableNames(INDEX_CSS)
    expect(variables.size).toBeGreaterThan(0)
    expect(variables.has('shell')).toBeTrue()
    expect(variables.has('surface-0')).toBeTrue()
    expect(variables.has('surface-1')).toBeTrue()
    expect(variables.has('surface-2')).toBeTrue()
    expect(variables.has('surface-3')).toBeTrue()
    expect(variables.has('border-strong')).toBeTrue()
  })

  test('wires flat semantic tokens through tailwind config structure', () => {
    const config = tailwindConfig as Config
    const extendedTheme = config.theme?.extend as {
      colors?: Record<string, unknown>
      fontFamily?: Record<string, string[]>
    }

    const colors = extendedTheme?.colors
    const surface = colors?.surface as Record<string, string> | undefined

    expect(colors?.borderStrong).toBe('hsl(var(--border-strong))')
    expect(colors?.shell).toBe('hsl(var(--shell))')
    expect(surface?.['0']).toBe('hsl(var(--surface-0))')
    expect(surface?.['1']).toBe('hsl(var(--surface-1))')
    expect(surface?.['2']).toBe('hsl(var(--surface-2))')
    expect(surface?.['3']).toBe('hsl(var(--surface-3))')
    expect(extendedTheme?.fontFamily?.sans).toContain('system-ui')
    expect(extendedTheme?.fontFamily?.mono).toContain('ui-monospace')
  })
})
