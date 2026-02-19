import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Listens for navigation events from the main process (tray menu clicks)
 * and navigates the React router accordingly.
 */
export function useTrayNavigation(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = window.electron.onNavigate((route: string) => {
      navigate(`/${route}`)
    })
    return unsubscribe
  }, [navigate])
}
