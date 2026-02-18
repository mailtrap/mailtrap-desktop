import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePollingInterval } from '../../hooks/usePollingInterval'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePollingInterval', () => {
  it('calls callback at the configured interval', async () => {
    const callback = vi.fn()
    const getIntervalMs = vi.fn().mockResolvedValue(5000)

    renderHook(() => usePollingInterval(callback, getIntervalMs))

    // Flush the promise for getIntervalMs (advance 0ms but resolve microtasks)
    await vi.advanceTimersByTimeAsync(0)

    // Advance by one interval
    vi.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Advance by another interval
    vi.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('cleans up timer on unmount (no leak)', async () => {
    const callback = vi.fn()
    const getIntervalMs = vi.fn().mockResolvedValue(3000)

    const { unmount } = renderHook(() =>
      usePollingInterval(callback, getIntervalMs)
    )

    // Flush the promise
    await vi.advanceTimersByTimeAsync(0)

    // Verify it works first
    vi.advanceTimersByTime(3000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Unmount and verify no more calls
    unmount()
    vi.advanceTimersByTime(9000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('handles unmount before settings promise resolves', async () => {
    const callback = vi.fn()
    let resolveInterval: (value: number) => void
    const getIntervalMs = vi.fn().mockReturnValue(
      new Promise<number>((resolve) => { resolveInterval = resolve })
    )

    const { unmount } = renderHook(() =>
      usePollingInterval(callback, getIntervalMs)
    )

    // Unmount before the promise resolves
    unmount()

    // Now resolve the promise and flush
    resolveInterval!(5000)
    await vi.advanceTimersByTimeAsync(0)

    // Timer should never have been set up, so no calls
    vi.advanceTimersByTime(15000)
    expect(callback).not.toHaveBeenCalled()
  })
})
