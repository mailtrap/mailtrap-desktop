import { useRef, useEffect } from 'react'

/**
 * Sets up a polling interval whose period is read from an async source (e.g. settings).
 * Properly cleans up even if the component unmounts before the settings promise resolves.
 */
export function usePollingInterval(
  callback: () => void,
  getIntervalMs: () => Promise<number>
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    getIntervalMs().then((intervalMs) => {
      if (!cancelled) {
        timer = setInterval(() => callbackRef.current(), intervalMs)
      }
    })

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
