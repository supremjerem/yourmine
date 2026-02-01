/**
 * Custom hook for managing download state and API interactions.
 *
 * Handles fetching, polling, and updating download status from the API,
 * as well as managing download history in localStorage.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Hook for managing downloads state and interactions.
 *
 * @param {Function} showToast - Function to display toast notifications
 * @returns {Object} Downloads state and handlers
 */
export function useDownloads(showToast) {
  const [downloads, setDownloads] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Track downloads created in THIS session (not from page load)
  const [sessionDownloadIds, setSessionDownloadIds] = useState(new Set())
  
  // Track which downloads have been "cleared" from history
  const [clearedIds, setClearedIds] = useState(() => {
    const saved = localStorage.getItem('clearedDownloadIds')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  // Poll for download status with memory leak fix
  useEffect(() => {
    const activeDownloads = downloads.filter(d =>
      d.status !== 'completed' && d.status !== 'failed'
    )

    if (activeDownloads.length === 0) return

    let isMounted = true
    const interval = setInterval(async () => {
      if (!isMounted) return

      try {
        const response = await axios.get(`${API_URL}/downloads`)
        if (isMounted) {
          const newDownloads = response.data.downloads

          // Track which downloads just completed to show toast
          const previousDownloads = new Map(downloads.map(d => [d.id, d]))
          newDownloads.forEach(d => {
            const prev = previousDownloads.get(d.id)
            if (prev && prev.status !== 'completed' && d.status === 'completed') {
              showToast(`✅ ${d.title} downloaded to your Downloads folder!`, 'success')
            }
          })

          setDownloads(newDownloads)
        }
      } catch (error) {
        console.error('Error fetching downloads:', error)
      }
    }, 1000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [downloads, showToast])

  // Initialize: load downloads from backend (but don't modify downloadedFiles)
  useEffect(() => {
    const initializeDownloads = async () => {
      try {
        const response = await axios.get(`${API_URL}/downloads`)
        if (response.data.downloads.length > 0) {
          setDownloads(response.data.downloads)
        }
      } catch (error) {
        console.error('Error initializing downloads:', error)
      }
    }

    initializeDownloads()
  }, [])

  /**
   * Start a single download.
   *
   * @param {string} url - YouTube URL to download
   * @param {string} format - Audio format (mp3 or wav)
   */
  const startSingleDownload = useCallback(async (url, format) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/download`, {
        url: url.trim(),
        format
      })

      // Track this download as created in this session
      setSessionDownloadIds(prev => new Set([...prev, response.data.id]))
      setDownloads(prev => [response.data, ...prev])
      showToast('Download started!', 'success')
      return true
    } catch (error) {
      showToast('Error: ' + (error.response?.data?.detail || error.message), 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  /**
   * Start batch downloads.
   *
   * @param {string[]} urlList - Array of YouTube URLs
   * @param {string} format - Audio format (mp3 or wav)
   */
  const startBatchDownload = useCallback(async (urlList, format) => {
    setLoading(true)
    try {
      const batchResponse = await axios.post(`${API_URL}/download/batch`, {
        urls: urlList,
        format,
        max_workers: 3
      })

      // Track all new download IDs as created in this session
      const newIds = batchResponse.data.download_ids || []
      setSessionDownloadIds(prev => new Set([...prev, ...newIds]))

      const response = await axios.get(`${API_URL}/downloads`)
      setDownloads(response.data.downloads)
      showToast(`${urlList.length} downloads started!`, 'success')
      return true
    } catch (error) {
      showToast('Error: ' + (error.response?.data?.detail || error.message), 'error')
      return false
    } finally {
      setLoading(false)
    }
  }, [showToast])

  /**
   * Clear download history.
   */
  const clearHistory = useCallback(() => {
    // Mark all history downloads as cleared
    const historyIds = downloads
      .filter(d => !sessionDownloadIds.has(d.id))
      .map(d => d.id)
    
    setClearedIds(prev => {
      const newSet = new Set([...prev, ...historyIds])
      localStorage.setItem('clearedDownloadIds', JSON.stringify([...newSet]))
      return newSet
    })
    
    showToast('History cleared!', 'success')
  }, [downloads, sessionDownloadIds, showToast])

  // Memoized filtered downloads
  // Current = downloads created in this session (regardless of status)
  // History = downloads that existed before this session started (and not cleared)
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
