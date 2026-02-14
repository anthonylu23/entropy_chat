import { JSDOM } from 'jsdom'
import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { DEFAULT_SPACE_ID, useUiStore } from '@renderer/stores/uiStore'

const settingsGet = mock(async () => null)
const settingsSet = mock(async () => undefined)

const mutateConversation = mock(() => undefined)
const mutateSpace = mock(() => undefined)

const spaces = [
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

const conversations = [
  {
    id: 'conv_1',
    title: 'Conversation 1',
    pinned: false,
    pinnedOrder: null,
    spaceId: DEFAULT_SPACE_ID,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'conv_2',
    title: 'Conversation 2',
    pinned: false,
    pinnedOrder: null,
    spaceId: DEFAULT_SPACE_ID,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'conv_work',
    title: 'Work Conversation',
    pinned: false,
    pinnedOrder: null,
    spaceId: 'space_work',
    createdAt: '',
    updatedAt: '',
  },
]

mock.module('@renderer/lib/ipc', () => ({
  requireEntropyApi: () => ({
    settings: {
      get: settingsGet,
      set: settingsSet,
    },
  }),
}))

mock.module('@renderer/hooks/useSpaces', () => ({
  useSpaces: () => ({ data: spaces, isFetching: false }),
  useCreateSpace: () => ({ mutate: mutateSpace }),
  useUpdateSpace: () => ({ mutate: mutateSpace }),
  useReorderSpaces: () => ({ mutate: mutateSpace }),
}))

mock.module('@renderer/hooks/useConversations', () => ({
  useConversations: () => ({ data: conversations }),
  useCreateConversation: () => ({ mutate: mutateConversation }),
}))

mock.module('@renderer/components/chat/ChatView', () => ({
  ChatView: ({ conversationId }: { conversationId: string }) => (
    <div data-testid={`chat-${conversationId}`}>chat:{conversationId}</div>
  ),
}))

let AppShell: (typeof import('@renderer/components/layout/AppShell'))['AppShell']
let teardownDom: (() => void) | null = null

const GLOBAL_KEYS = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
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
type ShortcutModifier = { label: 'Ctrl' | 'Cmd'; ctrlKey?: boolean; metaKey?: boolean }

const SHORTCUT_MODIFIERS: ShortcutModifier[] = [
  { label: 'Ctrl', ctrlKey: true },
  { label: 'Cmd', metaKey: true },
]

function snapshotGlobalDescriptors(): GlobalDescriptorSnapshot {
  const snapshot: GlobalDescriptorSnapshot = {}

  for (const key of GLOBAL_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    if (descriptor) {
      snapshot[key] = descriptor
    }
  }

  return snapshot
}

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  })
  const originalGlobals = snapshotGlobalDescriptors()

  const { window } = dom

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: window as unknown as Window & typeof globalThis,
  })
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
  Object.defineProperty(globalThis, 'Node', {
    configurable: true,
    writable: true,
    value: window.Node,
  })
  Object.defineProperty(globalThis, 'Event', {
    configurable: true,
    writable: true,
    value: window.Event,
  })
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

function fireShortcut(
  modifier: ShortcutModifier,
  keyEvent: { key: string; code?: string; shiftKey?: boolean }
) {
  fireEvent.keyDown(window, {
    ...keyEvent,
    ctrlKey: Boolean(modifier.ctrlKey),
    metaKey: Boolean(modifier.metaKey),
  })
}

beforeAll(async () => {
  AppShell = (await import('@renderer/components/layout/AppShell')).AppShell
})

beforeEach(() => {
  teardownDom = installDom()

  settingsGet.mockClear()
  settingsSet.mockClear()
  mutateConversation.mockClear()
  mutateSpace.mockClear()

  useUiStore.setState({
    activeConversationId: null,
    activeSpaceId: DEFAULT_SPACE_ID,
    focusedPane: 'left',
    splitEnabled: false,
    zenMode: false,
    singlePaneFocus: false,
    paneConversations: { left: null, right: null },
    openTabsBySpace: { [DEFAULT_SPACE_ID]: [] },
    sidebarOpen: true,
  })
})

afterEach(() => {
  cleanup()
  teardownDom?.()
  teardownDom = null
})

describe('AppShell interactions', () => {
  test('shows Exit Zen and restores sidebar + pinned tabs after exit', async () => {
    const view = render(<AppShell />)

    expect(view.getByText('Space')).toBeTruthy()
    expect(view.getByText('Tabs')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Zen' }))

    await waitFor(() => {
      expect(view.getByRole('button', { name: 'Exit Zen' })).toBeTruthy()
    })

    expect(view.queryByText('Space')).toBeNull()
    expect(view.queryByText('Tabs')).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Exit Zen' }))

    await waitFor(() => {
      expect(view.getByText('Space')).toBeTruthy()
      expect(view.getByText('Tabs')).toBeTruthy()
    })
  })

  test('bottom bar controls still drive splitEnabled and focusedPane store state', async () => {
    useUiStore.setState({
      activeConversationId: 'conv_1',
      paneConversations: { left: 'conv_1', right: 'conv_2' },
      openTabsBySpace: { [DEFAULT_SPACE_ID]: ['conv_1', 'conv_2'] },
    })

    const view = render(<AppShell />)

    expect(useUiStore.getState().splitEnabled).toBeFalse()
    expect(useUiStore.getState().focusedPane).toBe('left')

    fireEvent.click(view.getByRole('button', { name: 'Split' }))

    await waitFor(() => {
      expect(useUiStore.getState().splitEnabled).toBeTrue()
    })

    fireEvent.click(view.getByRole('button', { name: 'Right Pane' }))

    await waitFor(() => {
      expect(useUiStore.getState().focusedPane).toBe('right')
    })
  })

  for (const modifier of SHORTCUT_MODIFIERS) {
    test(`keyboard ${modifier.label}+\\ toggles split mode`, async () => {
      render(<AppShell />)

      expect(useUiStore.getState().splitEnabled).toBeFalse()

      fireShortcut(modifier, {
        key: '\\',
      })

      await waitFor(() => {
        expect(useUiStore.getState().splitEnabled).toBeTrue()
      })
    })

    test(`keyboard ${modifier.label}+Shift+F toggles zen mode with Exit Zen affordance`, async () => {
      const view = render(<AppShell />)

      expect(useUiStore.getState().zenMode).toBeFalse()

      fireShortcut(modifier, {
        key: 'F',
        shiftKey: true,
      })

      await waitFor(() => {
        expect(useUiStore.getState().zenMode).toBeTrue()
        expect(view.getByRole('button', { name: 'Exit Zen' })).toBeTruthy()
      })
    })

    test(`keyboard ${modifier.label}+Shift+1 toggles single-pane focus`, async () => {
      render(<AppShell />)

      expect(useUiStore.getState().singlePaneFocus).toBeFalse()

      fireShortcut(modifier, {
        key: '!',
        code: 'Digit1',
        shiftKey: true,
      })

      await waitFor(() => {
        expect(useUiStore.getState().singlePaneFocus).toBeTrue()
      })
    })

    test(`keyboard ${modifier.label}+1..2 switches spaces by index`, async () => {
      render(<AppShell />)

      expect(useUiStore.getState().activeSpaceId).toBe(DEFAULT_SPACE_ID)

      fireShortcut(modifier, {
        key: '2',
      })

      await waitFor(() => {
        expect(useUiStore.getState().activeSpaceId).toBe('space_work')
      })

      fireShortcut(modifier, {
        key: '1',
      })

      await waitFor(() => {
        expect(useUiStore.getState().activeSpaceId).toBe(DEFAULT_SPACE_ID)
      })
    })
  }
})
