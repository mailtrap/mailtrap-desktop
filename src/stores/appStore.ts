import { create } from 'zustand'

interface AppState {
  // Auth
  isAuthenticated: boolean
  accountId: number | null
  accountName: string | null
  senderId: string | null
  senderDisplayName: string | null
  isLoading: boolean

  // Actions
  setAuthenticated: (accountId: number, accountName?: string, senderId?: string, senderDisplayName?: string) => void
  setUnauthenticated: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  accountId: null,
  accountName: null,
  senderId: null,
  senderDisplayName: null,
  isLoading: true,

  setAuthenticated: (accountId, accountName, senderId, senderDisplayName) =>
    set({
      isAuthenticated: true,
      accountId,
      accountName: accountName ?? null,
      senderId: senderId ?? null,
      senderDisplayName: senderDisplayName ?? null,
      isLoading: false,
    }),
  setUnauthenticated: () =>
    set({
      isAuthenticated: false,
      accountId: null,
      accountName: null,
      senderId: null,
      senderDisplayName: null,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading })
}))
