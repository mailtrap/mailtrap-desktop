import { create } from 'zustand'
import type { VendorId } from '../../electron/api/types'

interface AppState {
  // Auth
  isAuthenticated: boolean
  accountId: number | null
  accountName: string | null
  senderId: string | null
  senderDisplayName: string | null
  vendor: VendorId | null
  isLoading: boolean

  // Actions
  setAuthenticated: (accountId: number, accountName?: string, senderId?: string, senderDisplayName?: string, vendor?: VendorId) => void
  setUnauthenticated: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  accountId: null,
  accountName: null,
  senderId: null,
  senderDisplayName: null,
  vendor: null,
  isLoading: true,

  setAuthenticated: (accountId, accountName, senderId, senderDisplayName, vendor) =>
    set({
      isAuthenticated: true,
      accountId,
      accountName: accountName ?? null,
      senderId: senderId ?? null,
      senderDisplayName: senderDisplayName ?? null,
      vendor: vendor ?? null,
      isLoading: false,
    }),
  setUnauthenticated: () =>
    set({
      isAuthenticated: false,
      accountId: null,
      accountName: null,
      senderId: null,
      senderDisplayName: null,
      vendor: null,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading })
}))
