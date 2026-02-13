import { beforeEach, describe, expect, test } from 'bun:test'
import { DEFAULT_SPACE_ID, useUiStore } from '../../../src/stores/uiStore'

beforeEach(() => {
  useUiStore.setState({
    activeConversationId: null,
    activeSpaceId: DEFAULT_SPACE_ID,
    focusedPane: 'left',
    splitEnabled: false,
    zenMode: false,
    singlePaneFocus: false,
    paneConversations: { left: null, right: null },
    openTabsBySpace: { [DEFAULT_SPACE_ID]: [] },
    sidebarOpen: true
  })
})

describe('src/stores/uiStore', () => {
  test('setActiveConversation updates active conversation', () => {
    useUiStore.getState().setActiveConversation('conv_123')
    expect(useUiStore.getState().activeConversationId).toBe('conv_123')

    useUiStore.getState().setActiveConversation(null)
    expect(useUiStore.getState().activeConversationId).toBeNull()
  })

  test('toggleSidebar flips sidebarOpen', () => {
    expect(useUiStore.getState().sidebarOpen).toBeTrue()
    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBeFalse()
  })

  test('setSidebarOpen sets sidebarOpen explicitly', () => {
    useUiStore.getState().setSidebarOpen(false)
    expect(useUiStore.getState().sidebarOpen).toBeFalse()
  })

  test('setActiveSpace aligns active conversation to tabs in the target space', () => {
    useUiStore.setState({
      activeConversationId: 'conv_left',
      activeSpaceId: DEFAULT_SPACE_ID,
      focusedPane: 'left',
      paneConversations: { left: 'conv_left', right: 'conv_right' },
      openTabsBySpace: {
        [DEFAULT_SPACE_ID]: ['conv_left', 'conv_right'],
        space_work: ['conv_work']
      }
    })

    useUiStore.getState().setActiveSpace('space_work')
    const state = useUiStore.getState()

    expect(state.activeSpaceId).toBe('space_work')
    expect(state.paneConversations.left).toBe('conv_work')
    expect(state.paneConversations.right).toBeNull()
    expect(state.activeConversationId).toBe('conv_work')
  })

  test('setActiveSpace clears active conversation when target space has no open tabs', () => {
    useUiStore.setState({
      activeConversationId: 'conv_left',
      activeSpaceId: DEFAULT_SPACE_ID,
      focusedPane: 'left',
      paneConversations: { left: 'conv_left', right: null },
      openTabsBySpace: {
        [DEFAULT_SPACE_ID]: ['conv_left']
      }
    })

    useUiStore.getState().setActiveSpace('space_empty')
    const state = useUiStore.getState()

    expect(state.activeSpaceId).toBe('space_empty')
    expect(state.activeConversationId).toBeNull()
    expect(state.paneConversations.left).toBeNull()
    expect(state.openTabsBySpace.space_empty).toEqual([])
  })
})
