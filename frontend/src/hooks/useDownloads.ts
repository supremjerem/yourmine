import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import type { Download, AudioFormat, ToastType } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type ShowToastFn = (message: string, type?: ToastType) => void

/** Error body shape returned by FastAPI for 4xx/5xx responses. */
interface ApiErrorBody {
  detail?: string
}

/** Turn an unknown thrown value into a message suitable for a toast. */
function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.detail ?? error.message
  }
  return 'Unknown error'
}

const CLEARED_IDS_KEY = 'clearedDownloadIds'

/** Statuses a download will not move on from. */
const TERMINAL_STATUSES = new Set<string>(['completed', 'failed'])

/**
 * Read the cleared-download IDs from localStorage.
 *
 * Runs inside a useState initializer, so a malformed value must not throw:
 * an unguarded parse here leaves the app permanently unmountable until the
 * user clears site data by hand.
 */
function readClearedIds(): Set<string> {
  try {
    const saved = localStorage.getItem(CLEARED_IDS_KEY)
    if (!saved) return new Set()

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return new Set()

    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

/** Persist cleared IDs, ignoring quota or serialization failures. */
function writeClearedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(CLEARED_IDS_KEY, JSON.stringify([...ids]))
  } catch {
    // Nothing actionable: the list is a convenience, not a source of truth.
  }
}

interface UseDownloadsReturn {
  downloads: Download[]
  loading: boolean
  currentDownloads: Download[]
  historyDownloads: Download[]
  startSingleDownload: (url: string, format: AudioFormat) => Promise<boolean>
  startBatchDownload: (urlList: string[], format: AudioFormat) => Promise<boolean>
  clearHistory: () => void
}

export function useDownloads(showToast: ShowToastFn): UseDownloadsReturn {
  const [downloads, setDownloads] = useState<Download[]>([])
  const [loading, setLoading] = useState(false)

  const [sessionDownloadIds, setSessionDownloadIds] = useState<Set<string>>(new Set())

  const [clearedIds, setClearedIds] = useState<Set<string>>(readClearedIds)

  // Stable refs to avoid re-creating the polling interval
  const downloadsRef = useRef<Download[]>(downloads)
  downloadsRef.current = downloads

  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  // Depend on whether anything is in flight, not on the downloads array
  // itself: the poll below writes that array, so depending on it would tear
  // down and rebuild the interval on every single tick.
  const hasActiveDownloads = useMemo(
    () => downloads.some((d) => !TERMINAL_STATUSES.has(d.status)),
    [downloads]
  )

  // Poll for download status
  useEffect(() => {
    if (!hasActiveDownloads) return

    const controller = new AbortController()

    const interval = setInterval(async () => {
      try {
        const response = await axios.get<{ downloads: Download[] }>(
          `${API_URL}/downloads`,
          { signal: controller.signal }
        )
        const newDownloads = response.data.downloads

        const previousDownloads = new Map(downloadsRef.current.map((d) => [d.id, d]))
        newDownloads.forEach((d) => {
          const prev = previousDownloads.get(d.id)
          if (prev && prev.status !== 'completed' && d.status === 'completed') {
            showToastRef.current(
              `✅ ${d.title} downloaded to your Downloads folder!`,
              'success'
            )
          }
        })

        setDownloads(newDownloads)
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Error fetching downloads:', error)
        }
      }
    }, 1000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [hasActiveDownloads])

  // Initialize: load downloads from backend
  useEffect(() => {
    const controller = new AbortController()

    const initializeDownloads = async () => {
      try {
        const response = await axios.get<{ downloads: Download[] }>(
          `${API_URL}/downloads`,
          { signal: controller.signal }
        )
        if (response.data.downloads.length > 0) {
          setDownloads(response.data.downloads)
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Error initializing downloads:', error)
        }
      }
    }

    void initializeDownloads()

    return () => {
      controller.abort()
    }
  }, [])

  const startSingleDownload = useCallback(
    async (url: string, format: AudioFormat): Promise<boolean> => {
      setLoading(true)
      try {
        const response = await axios.post<Download>(`${API_URL}/download`, {
          url: url.trim(),
          format
        })

        setSessionDownloadIds((prev) => new Set([...prev, response.data.id]))
        setDownloads((prev) => [response.data, ...prev])
        showToastRef.current('Download started!', 'success')
        return true
      } catch (error) {
        showToastRef.current('Error: ' + toErrorMessage(error), 'error')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const startBatchDownload = useCallback(
    async (urlList: string[], format: AudioFormat): Promise<boolean> => {
      setLoading(true)
      try {
        const batchResponse = await axios.post<{ download_ids: string[] }>(
          `${API_URL}/download/batch`,
          {
            urls: urlList,
            format
          }
        )

        const newIds = batchResponse.data.download_ids || []
        setSessionDownloadIds((prev) => new Set([...prev, ...newIds]))

        const response = await axios.get<{ downloads: Download[] }>(
          `${API_URL}/downloads`
        )
        setDownloads(response.data.downloads)
        showToastRef.current(`${urlList.length} downloads started!`, 'success')
        return true
      } catch (error) {
        showToastRef.current('Error: ' + toErrorMessage(error), 'error')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearHistory = useCallback(() => {
    const currentDl = downloadsRef.current
    const currentSessionIds = sessionDownloadIds

    const historyIds = currentDl
      .filter((d) => !currentSessionIds.has(d.id))
      .map((d) => d.id)

    // Only keep IDs the backend still reports. Without this the list grows
    // without bound, retaining IDs for jobs that were evicted long ago.
    const knownIds = new Set(currentDl.map((d) => d.id))

    setClearedIds((prev) => {
      const next = new Set(
        [...prev, ...historyIds].filter((id) => knownIds.has(id))
      )
      writeClearedIds(next)
      return next
    })

    showToastRef.current('History cleared', 'success')
  }, [sessionDownloadIds])

  const currentDownloads = useMemo(
    () => downloads.filter((d) => sessionDownloadIds.has(d.id)),
    [downloads, sessionDownloadIds]
  )

  const historyDownloads = useMemo(
    () =>
      downloads.filter((d) => !sessionDownloadIds.has(d.id) && !clearedIds.has(d.id)),
    [downloads, sessionDownloadIds, clearedIds]
  )

  return {
    downloads,
    loading,
    currentDownloads,
    historyDownloads,
    startSingleDownload,
    startBatchDownload,
    clearHistory
  }
}

export default useDownloads
