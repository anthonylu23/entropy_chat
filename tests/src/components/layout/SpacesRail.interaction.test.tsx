import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { SpacesRail } from '@renderer/components/layout/SpacesRail'
import { DEFAULT_SPACE_ID } from '@renderer/stores/uiStore'
import type { SpaceSummary } from '@shared/types'

const spaces: SpaceSummary[] = [
  {
    id: DEFAULT_SPACE_ID,
    name: 'General',
    color: null,
    icon: null,
    sortOrder: 0,
    isDefault: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'space_work',
    name: 'Work',
    color: null,
    icon: null,
    sortOrder: 1,
    isDefault: false,
    createdAt: '',
    updatedAt: '',
  },
]

let teardownDom: (() => void) | null = null

const GLOBAL_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const

type GlobalKey = (typeof GLOBAL_KEYS)[number]
type GlobalDescriptorSnapshot = Partial<Record<GlobalKey, PropertyDescriptor>>

function snapshotGlobalDescriptors(): GlobalDescriptorSnapshot {
  const snapshot: GlobalDescriptorSnapshot = {}
  for (const key of GLOBAL_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    if (descriptor) snapshot[key] = descriptor
  }
  return snapshot
}

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  })
  const originalGlobals = snapshotGlobalDescriptors()
  const { window } = dom

  const htmlElementProto = window.HTMLElement.prototype as unknown as {
    attachEvent?: (eventName: string, callback: EventListener) => void
    detachEvent?: (eventName: string, callback: EventListener) => void
  }
  if (!htmlElementProto.attachEvent) htmlElementProto.attachEvent = () => undefined
  if (!htmlElementProto.detachEvent) htmlElementProto.detachEvent = () => undefined

  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: window })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: window.document,
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: window.navigator,
  })
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    writable: true,
    value: window.HTMLElement,
  })
  Object.defineProperty(globalThis, 'HTMLInputElement', {
    configurable: true,
    writable: true,
    value: window.HTMLInputElement,
  })
  Object.defineProperty(globalThis, 'Node', { configurable: true, writable: true, value: window.Node })
  Object.defineProperty(globalThis, 'Event', { configurable: true, writable: true, value: window.Event })
  Object.defineProperty(globalThis, 'MouseEvent', {
    configurable: true,
    writable: true,
    value: window.MouseEvent,
  })
  Object.defineProperty(globalThis, 'KeyboardEvent', {
    configurable: true,
    writable: true,
    value: window.KeyboardEvent,
  })
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    writable: true,
    value: window.MutationObserver,
  })
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    writable: true,
    value: window.getComputedStyle.bind(window),
  })
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    writable: true,
    value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0),
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    writable: true,
    value: (handle: number) => clearTimeout(handle),
  })

  return () => {
    dom.window.close()
    for (const key of GLOBAL_KEYS) {
      const descriptor = originalGlobals[key]
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor)
      } else {
        Reflect.deleteProperty(globalThis, key)
      }
    }
  }
}

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  fireEvent.input(input)
}

beforeEach(() => {
  teardownDom = installDom()
})

afterEach(() => {
  cleanup()
  teardownDom?.()
  teardownDom = null
})

describe('SpacesRail interactions', () => {
  test('creates a space via inline editor and trims whitespace', async () => {
    const onCreateSpace = mock(async (_name: string) => undefined)
    const view = render(
      <SpacesRail
        spaces={spaces}
        activeSpaceId={DEFAULT_SPACE_ID}
        onSelectSpace={mock(() => undefined)}
        onCreateSpace={onCreateSpace}
        onRenameSpace={mock(() => undefined)}
        onReorderSpaces={mock(() => undefined)}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Create space' }))
    const input = view.getByLabelText('New space name') as HTMLInputElement
    setInputValue(input, '  Ideas  ')
    fireEvent.click(view.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(onCreateSpace).toHaveBeenCalledWith('Ideas')
    })
  })

  test('renames active space via inline editor and trims whitespace', async () => {
    const onRenameSpace = mock(async (_spaceId: string, _name: string) => undefined)
    const view = render(
      <SpacesRail
        spaces={spaces}
        activeSpaceId={DEFAULT_SPACE_ID}
        onSelectSpace={mock(() => undefined)}
        onCreateSpace={mock(() => undefined)}
        onRenameSpace={onRenameSpace}
        onReorderSpaces={mock(() => undefined)}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Rename active space' }))
    const input = view.getByLabelText('Rename space name') as HTMLInputElement
    setInputValue(input, '  General Team  ')
    fireEvent.click(view.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onRenameSpace).toHaveBeenCalledWith(DEFAULT_SPACE_ID, 'General Team')
    })
  })

  test('keeps editor open and shows error when create fails', async () => {
    const onCreateSpace = mock(async (_name: string) => {
      throw new Error('Invalid spaces.create payload: name must be between 1 and 64 characters.')
    })
    const view = render(
      <SpacesRail
        spaces={spaces}
        activeSpaceId={DEFAULT_SPACE_ID}
        onSelectSpace={mock(() => undefined)}
        onCreateSpace={onCreateSpace}
        onRenameSpace={mock(async () => undefined)}
        onReorderSpaces={mock(() => undefined)}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Create space' }))
    const input = view.getByLabelText('New space name') as HTMLInputElement
    setInputValue(input, 'Ideas')
    fireEvent.click(view.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(onCreateSpace).toHaveBeenCalledWith('Ideas')
      expect(view.getByRole('alert').textContent).toContain('name must be between')
    })

    expect(view.getByLabelText('New space name')).toBeTruthy()
  })
})
