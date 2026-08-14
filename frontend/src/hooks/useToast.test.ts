import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('should start with no toast', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('should show the message it was given', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Download started', 'success')
    })

    expect(result.current.toast).toEqual({
      message: 'Download started',
      type: 'success'
    })
  })

  it('should default to the info type', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.showToast('Heads up')
    })

    expect(result.current.toast?.type).toBe('info')
  })

  it('should hide the toast after the configured duration', () => {
    const { result } = renderHook(() => useToast(3000))

    act(() => {
      result.current.showToast('Gone soon')
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.toast).toBeNull()
  })

  it('should replace an existing toast rather than queueing behind it', () => {
    const { result } = renderHook(() => useToast(3000))

    act(() => {
      result.current.showToast('First')
    })
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    act(() => {
      result.current.showToast('Second')
    })
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // The first toast's timer must not clear the second one early.
    expect(result.current.toast?.message).toBe('Second')
  })
})
