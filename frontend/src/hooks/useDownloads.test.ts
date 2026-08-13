import { act, renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDownloads } from './useDownloads'
import type { Download } from '../types'

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

const showToast = vi.fn()

function makeDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: 'download-1',
    status: 'queued',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    format: 'mp3',
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedAxios.get.mockResolvedValue({ data: { downloads: [] } })
  mockedAxios.isAxiosError.mockReturnValue(false)
  mockedAxios.isCancel.mockReturnValue(false)
})

afterEach(() => {
  localStorage.clear()
})

describe('initialisation', () => {
  it('should start empty and not loading', () => {
    const { result } = renderHook(() => useDownloads(showToast))

    expect(result.current.downloads).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('should load existing downloads from the backend', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { downloads: [makeDownload({ status: 'completed' })] }
    })

    const { result } = renderHook(() => useDownloads(showToast))

    await waitFor(() => expect(result.current.downloads).toHaveLength(1))
  })

  it('should survive a corrupted cleared-history entry in localStorage', () => {
    // Regression: an unguarded JSON.parse here threw on every mount, leaving
    // the app permanently broken until site data was cleared by hand.
    localStorage.setItem('clearedDownloadIds', 'not valid json{{{')

    expect(() => renderHook(() => useDownloads(showToast))).not.toThrow()
  })

  it('should ignore a cleared-history entry that is not an array', () => {
    localStorage.setItem('clearedDownloadIds', '{"nope": true}')

    expect(() => renderHook(() => useDownloads(showToast))).not.toThrow()
  })
})

describe('starting a single download', () => {
  it('should post the trimmed url and chosen format', async () => {
    mockedAxios.post.mockResolvedValue({ data: makeDownload() })
    const { result } = renderHook(() => useDownloads(showToast))

    await act(async () => {
      await result.current.startSingleDownload('  https://youtu.be/dQw4w9WgXcQ  ', 'wav')
    })

    expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/download'), {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      format: 'wav'
    })
  })

  it('should report success and add the job to the list', async () => {
    mockedAxios.post.mockResolvedValue({ data: makeDownload() })
    const { result } = renderHook(() => useDownloads(showToast))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.startSingleDownload('https://youtu.be/dQw4w9WgXcQ', 'mp3')
    })

    expect(ok).toBe(true)
    expect(result.current.downloads).toHaveLength(1)
  })

  it('should report failure and surface the error without adding a job', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useDownloads(showToast))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.startSingleDownload('https://youtu.be/dQw4w9WgXcQ', 'mp3')
    })

    expect(ok).toBe(false)
    expect(result.current.downloads).toHaveLength(0)
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Error'), 'error')
  })

  it('should treat a started download as belonging to this session', async () => {
    mockedAxios.post.mockResolvedValue({ data: makeDownload() })
    const { result } = renderHook(() => useDownloads(showToast))

    await act(async () => {
      await result.current.startSingleDownload('https://youtu.be/dQw4w9WgXcQ', 'mp3')
    })

    expect(result.current.currentDownloads).toHaveLength(1)
    expect(result.current.historyDownloads).toHaveLength(0)
  })
})

describe('starting a batch download', () => {
  it('should post every url in the batch', async () => {
    mockedAxios.post.mockResolvedValue({ data: { download_ids: ['a', 'b'] } })
    const { result } = renderHook(() => useDownloads(showToast))

    await act(async () => {
      await result.current.startBatchDownload(
        ['https://youtu.be/aaaaaaaaaaa', 'https://youtu.be/bbbbbbbbbbb'],
        'mp3'
      )
    })

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/download/batch'),
      { urls: ['https://youtu.be/aaaaaaaaaaa', 'https://youtu.be/bbbbbbbbbbb'], format: 'mp3' }
    )
  })

  it('should report failure when the batch is rejected', async () => {
    mockedAxios.post.mockRejectedValue(new Error('too many'))
    const { result } = renderHook(() => useDownloads(showToast))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.startBatchDownload(['https://youtu.be/aaaaaaaaaaa'], 'mp3')
    })

    expect(ok).toBe(false)
  })
})

describe('polling', () => {
  it('should not poll when every download has finished', async () => {
    // Regression: the effect depended on the downloads array it also wrote,
    // so it tore down and rebuilt its interval on every tick.
    vi.useFakeTimers()
    mockedAxios.get.mockResolvedValue({
      data: { downloads: [makeDownload({ status: 'completed' })] }
    })

    renderHook(() => useDownloads(showToast))
    await vi.advanceTimersByTimeAsync(50)
    const callsAfterInit = mockedAxios.get.mock.calls.length

    await vi.advanceTimersByTimeAsync(5000)

    expect(mockedAxios.get.mock.calls.length).toBe(callsAfterInit)
    vi.useRealTimers()
  })

  it('should poll while a download is still active', async () => {
    vi.useFakeTimers()
    mockedAxios.get.mockResolvedValue({
      data: { downloads: [makeDownload({ status: 'downloading' })] }
    })

    renderHook(() => useDownloads(showToast))
    await vi.advanceTimersByTimeAsync(50)
    const callsAfterInit = mockedAxios.get.mock.calls.length

    await vi.advanceTimersByTimeAsync(3000)

    expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(callsAfterInit)
    vi.useRealTimers()
  })
})

describe('clearing history', () => {
  it('should drop history downloads from the visible list', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { downloads: [makeDownload({ id: 'old', status: 'completed' })] }
    })
    const { result } = renderHook(() => useDownloads(showToast))

    await waitFor(() => expect(result.current.historyDownloads).toHaveLength(1))
    act(() => result.current.clearHistory())

    expect(result.current.historyDownloads).toHaveLength(0)
  })

  it('should not retain ids for jobs the backend no longer reports', async () => {
    // Regression: the cleared list grew without bound across sessions.
    localStorage.setItem('clearedDownloadIds', JSON.stringify(['long-gone-job']))
    mockedAxios.get.mockResolvedValue({
      data: { downloads: [makeDownload({ id: 'still-here', status: 'completed' })] }
    })

    const { result } = renderHook(() => useDownloads(showToast))
    await waitFor(() => expect(result.current.downloads).toHaveLength(1))
    act(() => result.current.clearHistory())

    const stored = JSON.parse(
      localStorage.getItem('clearedDownloadIds') ?? '[]'
    ) as string[]
    expect(stored).not.toContain('long-gone-job')
    expect(stored).toContain('still-here')
  })
})
