import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import type { Download, AudioFormat, ToastType } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type ShowToastFn = (message: string, type?: ToastType) => void

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

  const [clearedIds, setClearedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('clearedDownloadIds')
    return saved ? new Set(JSON.parse(saved) as string[]) : new Set()
  })

  // Stable refs to avoid re-creating the polling interval
  const downloadsRef = useRef<Download[]>(downloads)
  downloadsRef.current = downloads

  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  // Poll for download status
  useEffect(() => {
    const activeDownloads = downloads.filter(d =>
      d.status !== 'completed' && d.status !== 'failed'
    )

    if (activeDownloads.length === 0) return

    const controller = new AbortController()

    const interval = setInterval(async () => {
      try {
        const response = await axios.get<{ downloads: Download[] }>(
          `${API_URL}/downloads`,
          { signal: controller.signal }
        )
        const newDownloads = response.data.downloads

        const previousDownloads = new Map(downloadsRef.current.map(d => [d.id, d]))
        newDownloads.forEach(d => {
          const prev = previousDownloads.get(d.id)
          if (prev && prev.status !== 'completed' && d.status === 'completed') {
            showToastRef.current(`✅ ${d.title} downloaded to your Downloads folder!`, 'success')
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
  }, [downloads])

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

    initializeDownloads()

    return () => {
      controller.abort()
    }
  }, [])

  const startSingleDownload = useCallback(async (url: string, format: AudioFormat): Promise<boolean> => {
    setLoading(true)
    try {
      const response = await axios.post<Download>(`${API_URL}/download`, {
        url: url.trim(),
        format
      })

      setSessionDownloadIds(prev => new Set([...prev, response.data.id]))
      setDownloads(prev => [response.data, ...prev])
      showToastRef.current('Download started!', 'success')
      return true
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Unknown error'
      showToastRef.current('Error: ' + msg, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const startBatchDownload = useCallback(async (urlList: string[], format: AudioFormat): Promise<boolean> => {
    setLoading(true)
    try {
      const batchResponse = await axios.post<{ download_ids: string[] }>(`${API_URL}/download/batch`, {
        urls: urlList,
        format
      })

      const newIds = batchResponse.data.download_ids || []
      setSessionDownloadIds(prev => new Set([...prev, ...newIds]))

      const response = await axios.get<{ downloads: Download[] }>(`${API_URL}/downloads`)
      setDownloads(response.data.downloads)
      showToastRef.current(`${urlList.length} downloads started!`, 'success')
      return true
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : 'Unknown error'
      showToastRef.current('Error: ' + msg, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const clearHistory = useCallback(() => {
    const currentDl = downloadsRef.current
    const currentSessionIds = sessionDownloadIds

    const historyIds = currentDl
      .filter(d => !currentSessionIds.has(d.id))
      .map(d => d.id)

    setClearedIds(prev => {
      const newSet = new Set([...prev, ...historyIds])
      localStorage.setItem('clearedDownloadIds', JSON.stringify([...newSet]))
      return newSet
    })

    showToastRef.current('History cleared!', 'success')
  }, [sessionDownloadIds])

  const currentDownloads = useMemo(() =>
    downloads.filter(d => sessionDownloadIds.has(d.id)),
    [downloads, sessionDownloadIds]
  )

  const historyDownloads = useMemo(() =>
    downloads.filter(d =>
      !sessionDownloadIds.has(d.id) && !clearedIds.has(d.id)
    ),
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
