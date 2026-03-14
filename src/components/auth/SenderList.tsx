import { useCallback, useEffect, useState } from 'react'
import Port587Logo from '../ui/Port587Logo'
import type { SenderProfilePublic } from '../../../electron/api/types'
import { useAppStore } from '../../stores/appStore'
import { Button } from '../ui/Button'

interface SenderListProps {
  onAddSender: () => void
}

interface SenderRowProps {
  sender: SenderProfilePublic
  isConnecting: boolean
  isDisabled: boolean
  error: string | null
  onConnect: () => void
  onDelete: (senderId: string) => void
}

function SenderRow({ sender, isConnecting, isDisabled, error, onConnect, onDelete }: SenderRowProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center gap-3 rounded-mtui border border-red-shade bg-navy-700 px-4 py-3">
        <p className="flex-1 text-body text-navy-air">
          Delete{' '}
          <span className="font-semibold">&quot;{sender.displayName}&quot;</span>?
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            loading={isDeleting}
            onClick={async () => {
              setIsDeleting(true)
              await onDelete(sender.id)
              setIsDeleting(false)
              setIsConfirmingDelete(false)
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => setIsConfirmingDelete(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-mtui border border-grey-shade bg-navy-700 px-4 py-3 ${
        isConnecting ? 'opacity-75' : ''
      } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grey-shade text-heading-3 text-grey-muted uppercase">
        {sender.displayName[0]}
      </div>

      {/* Name block */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-heading-3 text-navy-air">{sender.displayName}</p>
        <p className="truncate text-body-s text-grey-muted">@{sender.accountName}</p>
        {error && (
          <p className="mt-1 text-body-s text-red-medium">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outlined"
          size="sm"
          loading={isConnecting}
          onClick={onConnect}
        >
          {isConnecting ? 'Logging in...' : 'Log In'}
        </Button>
        <button
          className={`flex h-7 w-7 items-center justify-center rounded-mtui text-grey-muted hover:text-red-medium hover:bg-grey-shade transition-colors ${
            isConnecting ? 'hidden' : ''
          }`}
          onClick={() => setIsConfirmingDelete(true)}
          aria-label="Delete sender"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
              stroke="currentColor"
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function SenderList({ onAddSender }: SenderListProps) {
  const [senders, setSenders] = useState<SenderProfilePublic[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [connectingSenderId, setConnectingSenderId] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const setUnauthenticated = useAppStore((s) => s.setUnauthenticated)

  const loadSenders = useCallback(async () => {
    try {
      const list = await window.electron.listSenders()
      setSenders(list)
    } catch {
      // Silently handle — empty list is fine
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadSenders()
  }, [loadSenders])

  const handleConnect = async (sender: SenderProfilePublic) => {
    setConnectingSenderId(sender.id)
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[sender.id]
      return next
    })

    try {
      const result = await window.electron.selectSender(sender.id)
      if (result.success) {
        setAuthenticated(result.accountId, result.accountName, sender.id, sender.displayName)
      } else {
        setRowErrors((prev) => ({ ...prev, [sender.id]: result.error }))
      }
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [sender.id]: 'Connection failed. Please check your internet connection.',
      }))
    } finally {
      setConnectingSenderId(null)
    }
  }

  const handleDelete = async (senderId: string) => {
    try {
      const result = await window.electron.deleteSender(senderId)
      if (result.success) {
        if (result.wasActive) {
          setUnauthenticated()
        }
        await loadSenders()
      }
    } catch {
      // Deletion failed silently — list stays unchanged
    }
  }

  if (isLoadingList) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  // Empty state
  if (senders.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <Port587Logo size="lg" />
            </div>
            <p className="text-body text-grey-muted mb-6">
              Add an account to get started with Port587.
            </p>
            <Button className="w-full" onClick={onAddSender}>
              + Add account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Populated state
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex justify-center">
              <Port587Logo size="lg" />
          </div>
        </div>

        <div className="space-y-2">
          {senders.map((sender) => (
            <SenderRow
              key={sender.id}
              sender={sender}
              isConnecting={connectingSenderId === sender.id}
              isDisabled={connectingSenderId !== null && connectingSenderId !== sender.id}
              error={rowErrors[sender.id] ?? null}
              onConnect={() => handleConnect(sender)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <Button
          variant="outlined"
          className="mt-4 w-full"
          onClick={onAddSender}
          disabled={connectingSenderId !== null}
        >
          + Add account
        </Button>
      </div>
    </div>
  )
}
