import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import type { SuppressionEntry, VendorCapabilities } from '../../../electron/api/types'

function reasonColor(reason: string): string {
  const lower = reason.toLowerCase()
  if (lower.includes('bounce')) return 'text-red-medium'
  if (lower.includes('spam')) return 'text-orange-medium'
  if (lower.includes('unsubscribe')) return 'text-grey-muted'
  return 'text-navy-air'
}

function reasonBgColor(reason: string): string {
  const lower = reason.toLowerCase()
  if (lower.includes('bounce')) return 'bg-red-medium/10'
  if (lower.includes('spam')) return 'bg-orange-300/10'
  if (lower.includes('unsubscribe')) return 'bg-grey-shade'
  return 'bg-grey-shade'
}

function formatReason(reason: string): string {
  if (!reason) return '-'
  return reason
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function SuppressionsView() {
  const [capabilities, setCapabilities] = useState<VendorCapabilities | null>(null)
  const [suppressions, setSuppressions] = useState<SuppressionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.electron.getCapabilities()
      .then(setCapabilities)
      .catch(() => {
        setError('Failed to load capabilities')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (capabilities && capabilities.suppressions) {
      loadSuppressions()
    }
  }, [capabilities])

  const loadSuppressions = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await window.electron.getSuppressions()
      setSuppressions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppressions')
    } finally {
      setLoading(false)
    }
  }

  // Capability guard
  if (capabilities && !capabilities.suppressions) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            Suppressions are not available for this service.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  if (error && suppressions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-medium">{error}</p>
        <Button onClick={loadSuppressions}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-1 text-navy-air">Suppressions</h1>
        <Button variant="ghost" size="sm" onClick={loadSuppressions}>
          Refresh
        </Button>
      </div>

      {suppressions.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            No suppressions found.
          </p>
        </div>
      ) : (
        <div className="mtui-table-wrap">
          <table className="mtui-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Reason</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>
              {suppressions.map((entry, idx) => (
                <tr
                  key={`${entry.email}-${idx}`}
                  className="transition-colors duration-mtui ease-mtui hover:bg-grey-shade/40"
                >
                  <td className="max-w-[300px] truncate">{entry.email}</td>
                  <td>
                    <span
                      className={`inline-block rounded-mtui px-2 py-0.5 text-body-s ${reasonColor(entry.reason)} ${reasonBgColor(entry.reason)}`}
                    >
                      {formatReason(entry.reason)}
                    </span>
                  </td>
                  <td className="!text-grey-muted whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && suppressions.length > 0 && (
        <div className="mt-4 rounded-mtui border border-orange-300/30 bg-orange-300/10 px-4 py-3">
          <p className="text-body-s text-orange-medium">{error}</p>
        </div>
      )}
    </div>
  )
}
