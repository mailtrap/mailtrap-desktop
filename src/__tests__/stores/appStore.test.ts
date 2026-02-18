import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../../stores/appStore'

beforeEach(() => {
  // Reset the store to initial state
  useAppStore.setState({
    isAuthenticated: false,
    accountId: null,
    accountName: null,
    isLoading: true
  })
})

describe('useAppStore', () => {
  it('starts with unauthenticated loading state', () => {
    const state = useAppStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.accountId).toBeNull()
    expect(state.accountName).toBeNull()
    expect(state.isLoading).toBe(true)
  })

  describe('setAuthenticated', () => {
    it('sets correct authenticated state', () => {
      useAppStore.getState().setAuthenticated(42, 'My Account')
      const state = useAppStore.getState()

      expect(state.isAuthenticated).toBe(true)
      expect(state.accountId).toBe(42)
      expect(state.accountName).toBe('My Account')
      expect(state.isLoading).toBe(false)
    })

    it('sets accountName to null when omitted', () => {
      useAppStore.getState().setAuthenticated(42)
      const state = useAppStore.getState()

      expect(state.accountName).toBeNull()
    })
  })

  describe('setUnauthenticated', () => {
    it('clears state and stops loading', () => {
      useAppStore.getState().setAuthenticated(42, 'Test')
      useAppStore.getState().setUnauthenticated()
      const state = useAppStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.accountId).toBeNull()
      expect(state.accountName).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setLoading', () => {
    it('toggles loading state', () => {
      useAppStore.getState().setLoading(false)
      expect(useAppStore.getState().isLoading).toBe(false)

      useAppStore.getState().setLoading(true)
      expect(useAppStore.getState().isLoading).toBe(true)
    })
  })
})
