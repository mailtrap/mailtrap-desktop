import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCacheFetch } from '../../hooks/useCacheFetch'

beforeEach(() => {
  vi.useRealTimers()
})

describe('useCacheFetch', () => {
  it('returns cached data immediately, then fresh data', async () => {
    const cachedData = [{ id: 1, name: 'Cached' }]
    const freshData = [{ id: 1, name: 'Fresh' }]

    const getCached = vi.fn().mockResolvedValue({ data: cachedData, fetchedAt: '2025-01-01T00:00:00Z' })
    // Delay fresh data so we can observe the cached state
    let resolveFresh!: (value: unknown) => void
    const getFresh = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveFresh = resolve })
    )
    const saveToCache = vi.fn()

    const { result } = renderHook(() =>
      useCacheFetch({
        getCached,
        getFresh,
        saveToCache
      })
    )

    // Initially loading
    expect(result.current.loading).toBe(true)

    // Wait for cached data to appear
    await waitFor(() => {
      expect(result.current.data).toEqual(cachedData)
    })
    expect(result.current.isFromCache).toBe(true)

    // Now resolve fresh data
    await act(async () => {
      resolveFresh(freshData)
    })

    // Wait for fresh data to replace cached
    await waitFor(() => {
      expect(result.current.data).toEqual(freshData)
    })
    expect(result.current.isFromCache).toBe(false)
  })

  it('shows loading when no cache, not refreshing', async () => {
    const freshData = [{ id: 1 }]
    const getCached = vi.fn().mockResolvedValue(null)
    const getFresh = vi.fn().mockResolvedValue(freshData)

    const { result } = renderHook(() =>
      useCacheFetch({ getCached, getFresh })
    )

    // Should show loading initially since there is no cache
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.data).toEqual(freshData)
    })
  })

  it('sets error on fetch failure when no cached data', async () => {
    const getCached = vi.fn().mockResolvedValue(null)
    const getFresh = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() =>
      useCacheFetch({ getCached, getFresh })
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })
  })

  it('calls saveToCache on fresh data', async () => {
    const freshData = { value: 42 }
    const getCached = vi.fn().mockResolvedValue(null)
    const getFresh = vi.fn().mockResolvedValue(freshData)
    const saveToCache = vi.fn()

    renderHook(() =>
      useCacheFetch({ getCached, getFresh, saveToCache })
    )

    await waitFor(() => {
      expect(saveToCache).toHaveBeenCalledWith(freshData)
    })
  })

  it('isEmpty controls loading/error behavior', async () => {
    const emptyData: unknown[] = []
    const getCached = vi.fn().mockResolvedValue({ data: emptyData })
    const getFresh = vi.fn().mockRejectedValue(new Error('Failed'))
    const isEmpty = (data: unknown[]) => data.length === 0

    const { result } = renderHook(() =>
      useCacheFetch({ getCached, getFresh, isEmpty })
    )

    // Empty cache data should be treated as "no data" so error should show
    await waitFor(() => {
      expect(result.current.error).toBe('Failed')
    })
  })
})
