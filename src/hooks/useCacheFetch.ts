import { useState, useCallback, useRef, useEffect } from 'react'

interface CacheResult<T> {
  data: T
  fetchedAt?: string
}

interface UseCacheFetchOptions<T> {
  getCached: () => Promise<CacheResult<T> | null>
  getFresh: () => Promise<T>
  saveToCache?: (data: T) => void
  isEmpty?: (data: T) => boolean
}

interface UseCacheFetchResult<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  isFromCache: boolean
  lastFetchedAt: string | null
  refresh: () => Promise<void>
}

export function useCacheFetch<T>({
  getCached,
  getFresh,
  saveToCache,
  isEmpty = () => false,
}: UseCacheFetchOptions<T>): UseCacheFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const dataRef = useRef<T | null>(null)

  // Refs to avoid stale closures and unnecessary effect re-runs
  const getCachedRef = useRef(getCached)
  const getFreshRef = useRef(getFresh)
  const saveToCacheRef = useRef(saveToCache)
  const isEmptyRef = useRef(isEmpty)
  getCachedRef.current = getCached
  getFreshRef.current = getFresh
  saveToCacheRef.current = saveToCache
  isEmptyRef.current = isEmpty

  const fetchFresh = useCallback(async () => {
    const hasData = dataRef.current !== null && !isEmptyRef.current(dataRef.current)

    const startTime = Date.now()
    if (hasData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const freshData = await getFreshRef.current()
      setData(freshData)
      dataRef.current = freshData
      setIsFromCache(false)
      setLastFetchedAt(new Date().toISOString())
      setError(null)
      saveToCacheRef.current?.(freshData)
    } catch (err) {
      if (dataRef.current === null || isEmptyRef.current(dataRef.current)) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 300 - elapsed)
      setTimeout(() => {
        setLoading(false)
        setRefreshing(false)
      }, remaining)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Step 1: Load from cache
      try {
        const cached = await getCachedRef.current()
        if (!cancelled && cached?.data && !isEmptyRef.current(cached.data)) {
          setData(cached.data)
          dataRef.current = cached.data
          setIsFromCache(true)
          setLastFetchedAt(cached.fetchedAt ?? null)
          setLoading(false)
        }
      } catch {
        // No cache available
      }

      // Step 2: Fetch fresh data
      if (!cancelled) {
        await fetchFresh()
      }
    }

    load()
    return () => { cancelled = true }
  }, [fetchFresh])

  return { data, loading, refreshing, error, isFromCache, lastFetchedAt, refresh: fetchFresh }
}
