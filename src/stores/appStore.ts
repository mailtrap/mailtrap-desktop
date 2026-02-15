import { create } from 'zustand'

interface AppState {
  // Auth
  isAuthenticated: boolean
  accountId: number | null
  accountName: string | null
  isLoading: boolean

  // Actions
  setAuthenticated: (accountId: number, accountName?: string) => void
  setUnauthenticated: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  accountId: null,
  accountName: null,
  isLoading: true,

  setAuthenticated: (accountId, accountName) =>
    set({ isAuthenticated: true, accountId, accountName: accountName ?? null, isLoading: false }),
  setUnauthenticated: () =>
    set({ isAuthenticated: false, accountId: null, accountName: null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading })
}))
