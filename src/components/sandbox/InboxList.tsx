import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { LastUpdatedIndicator } from '../ui/LastUpdatedIndicator'
import { useCacheFetch } from '../../hooks/useCacheFetch'
import { usePollingInterval } from '../../hooks/usePollingInterval'
import { timeAgo } from '../../utils/formatters'
import type { InboxSummary } from '../../../electron/api/types'

function Toggle({
  checked,
  indeterminate,
  onChange,
  title
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  title?: string
}) {
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center justify-center"
      title={title}
      aria-label={title}
    >
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-mtui ease-mtui ${
          indeterminate
            ? 'bg-blue-neutral/50'
            : checked
              ? 'bg-blue-neutral'
              : 'bg-grey-dark'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            indeterminate
              ? 'translate-x-2'
              : checked
                ? 'translate-x-4'
                : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  )
}

export default function InboxList() {
  const {
    data: inboxes,
    loading,
    refreshing,
    error,
    isFromCache,
    lastFetchedAt,
    refresh,
  } = useCacheFetch<InboxSummary[]>({
    getCached: () => window.electron.getInboxSummariesCache(),
    getFresh: () => window.electron.getInboxSummaries(),
    saveToCache: (data) => { window.electron.saveInboxSummariesCache(data) },
    isEmpty: (data) => data.length === 0,
  })

  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  // Load hidden IDs on mount
  useEffect(() => {
    window.electron.getHiddenTrayInboxIds().then((ids) => {
      setHiddenIds(new Set(ids))
    }).catch(() => {})
  }, [])

  // Auto-refresh with proper cleanup
  usePollingInterval(
    () => refresh(),
    async () => {
      const s = await window.electron.getSettings()
      return s?.testingPollingIntervalMs || 60000
    }
  )

  const toggleTrayVisibility = async (inboxId: number) => {
    const newVisible = hiddenIds.has(inboxId)

    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (newVisible) next.delete(inboxId)
      else next.add(inboxId)
      return next
    })

    try {
      await window.electron.setInboxTrayVisibility(inboxId, newVisible)
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev)
        if (newVisible) next.add(inboxId)
        else next.delete(inboxId)
        return next
      })
    }
  }

  const toggleProjectVisibility = async (projectInboxes: InboxSummary[]) => {
    const ids = projectInboxes.map((i) => i.id)
    const allVisible = ids.every((id) => !hiddenIds.has(id))
    const newVisible = !allVisible

    setHiddenIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (newVisible) next.delete(id)
        else next.add(id)
      }
      return next
    })

    try {
      await window.electron.setTrayVisibilityBatch(
        ids.map((inboxId) => ({ inboxId, visible: newVisible }))
      )
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) {
          if (newVisible) next.add(id)
          else next.delete(id)
        }
        return next
      })
    }
  }

  const items = inboxes ?? []

  if (loading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-medium">{error}</p>
        <Button onClick={refresh}>Retry</Button>
      </div>
    )
  }

  // Group inboxes by project
  const grouped = items.reduce<Record<string, InboxSummary[]>>((acc, inbox) => {
    const key = inbox.projectName
    if (!acc[key]) acc[key] = []
    acc[key].push(inbox)
    return acc
  }, {})

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-1">
        <h1 className="text-heading-1 text-navy-air">Projects</h1>
      </div>

      {lastFetchedAt && (
        <LastUpdatedIndicator
          lastFetchedAt={lastFetchedAt}
          isFromCache={isFromCache}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      )}

      {items.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            No sandboxes found. Create one in the{' '}
            <a
              href="https://mailtrap.io/inboxes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-neutral underline hover:text-blue-medium"
            >
              Mailtrap web app
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectName, projectInboxes]) => {
            const projectIds = projectInboxes.map((i) => i.id)
            const visibleCount = projectIds.filter((id) => !hiddenIds.has(id)).length
            const allVisible = visibleCount === projectIds.length
            const noneVisible = visibleCount === 0
            const indeterminate = !allVisible && !noneVisible

            return (
              <div
                key={projectName}
                className="mtui-table-wrap"
              >
                <div className="flex items-center border-b border-grey-shade" style={{ height: 50 }}>
                  <div className="flex flex-1 items-center gap-2 px-[10px]">
                    <svg className="h-4 w-4 text-grey-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    <span className="text-item-label text-navy-air font-semibold">
                      {projectName}
                    </span>
                  </div>
                  <div className="flex items-center px-[10px]" style={{ width: '88px' }}>
                    <Toggle
                      checked={allVisible}
                      indeterminate={indeterminate}
                      onChange={() => toggleProjectVisibility(projectInboxes)}
                      title={
                        allVisible
                          ? 'Hide all sandboxes from tray'
                          : 'Show all sandboxes in tray'
                      }
                    />
                  </div>
                </div>

                <table className="mtui-table">
                  <thead>
                    <tr>
                      <th>Sandboxes</th>
                      <th>Total Sent</th>
                      <th>Messages</th>
                      <th>Last message</th>
                      <th>Last email subject</th>
                      <th className="w-[88px]">Tray</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectInboxes.map((inbox) => {
                      const isVisible = !hiddenIds.has(inbox.id)
                      return (
                        <tr
                          key={inbox.id}
                          className="transition-colors duration-mtui ease-mtui hover:bg-grey-shade/40"
                        >
                          <td>
                            <Link
                              to={`/sandbox/inbox/${inbox.id}`}
                              className="text-blue-neutral hover:text-blue-medium hover:underline"
                            >
                              {inbox.name}
                            </Link>
                          </td>
                          <td>{inbox.sentCount}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <svg className="h-4 w-4 text-grey-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                              </svg>
                              {inbox.unreadCount} / {inbox.totalCount}
                            </div>
                          </td>
                          <td className="!text-grey-muted">
                            {timeAgo(inbox.lastMessageAt)}
                          </td>
                          <td className="max-w-[200px] truncate !text-grey-muted">
                            {inbox.lastEmailSubject || '\u2014'}
                          </td>
                          <td>
                            <Toggle
                              checked={isVisible}
                              onChange={() => toggleTrayVisibility(inbox.id)}
                              title={isVisible ? 'Shown in tray menu' : 'Hidden from tray menu'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
