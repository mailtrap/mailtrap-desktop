import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/appStore'
import { useTrayNavigation } from './hooks/useNavigation'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import TitleBar from './components/layout/TitleBar'
import TokenSetup from './components/auth/TokenSetup'
import SendingDash from './components/sending/SendingDash'
import InboxList from './components/sandbox/InboxList'
import InboxView from './components/sandbox/InboxView'
import Settings from './components/settings/Settings'

function AuthenticatedApp() {
  useTrayNavigation()

  const [defaultRoute, setDefaultRoute] = useState<string | null>(null)

  useEffect(() => {
    window.electron.getSettings().then((s) => {
      const view = s?.defaultView === 'sending' ? '/sending' : '/sandbox'
      setDefaultRoute(view)
    })
  }, [])

  if (!defaultRoute) return null

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-navy-700">
        <Routes>
          <Route path="/sending" element={<SendingDash />} />
          <Route path="/sending/:domainId" element={<SendingDash />} />
          <Route path="/sandbox" element={<InboxList />} />
          <Route path="/sandbox/inbox/:inboxId" element={<InboxView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { isAuthenticated, isLoading, setAuthenticated, setUnauthenticated } =
    useAppStore()

  useEffect(() => {
    window.electron.restoreAuth().then((result) => {
      if (result.authenticated && result.accountId) {
        setAuthenticated(result.accountId, result.accountName)
      } else {
        setUnauthenticated()
      }
    })
  }, [setAuthenticated, setUnauthenticated])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-navy-void">
        <TitleBar />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-navy-void">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {isAuthenticated ? (
            <AuthenticatedApp />
          ) : (
            <Routes>
              <Route path="*" element={<TokenSetup />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
