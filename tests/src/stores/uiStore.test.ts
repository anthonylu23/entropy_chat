import { beforeEach, describe, expect, test } from 'bun:test'
import { useUiStore } from '../../../src/stores/uiStore'

beforeEach(() => {
  useUiStore.setState({
    activeConversationId: null,
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
})
