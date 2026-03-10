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
  const [sendingEnabled, setSendingEnabled] = useState(true)
  const [sandboxEnabled, setSandboxEnabled] = useState(true)

  useEffect(() => {
    const loadSettings = (s: { defaultView?: string; sendingEnabled?: boolean; sandboxEnabled?: boolean }) => {
      const sEnabled = s?.sendingEnabled !== false
      const tEnabled = s?.sandboxEnabled !== false
      setSendingEnabled(sEnabled)
      setSandboxEnabled(tEnabled)

      let view: string
      if (s?.defaultView === 'sending' && sEnabled) {
        view = '/sending'
      } else if (tEnabled) {
        view = '/sandbox'
      } else if (sEnabled) {
        view = '/sending'
      } else {
        view = '/settings'
      }
      setDefaultRoute(view)
    }

    window.electron.getSettings().then(loadSettings)

    const cleanup = window.electron.onNavigate((route) => {
      if (route === '__settings_changed') {
        window.electron.getSettings().then(loadSettings)
      }
    })
    return cleanup
  }, [])

  if (!defaultRoute) return null

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-navy-700">
        <Routes>
          {sendingEnabled && <Route path="/sending" element={<SendingDash />} />}
          {sendingEnabled && <Route path="/sending/:domainId" element={<SendingDash />} />}
          {sandboxEnabled && <Route path="/sandbox" element={<InboxList />} />}
          {sandboxEnabled && <Route path="/sandbox/inbox/:inboxId" element={<InboxView />} />}
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
