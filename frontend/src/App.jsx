import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [url, setUrl] = useState('')
  const [urls, setUrls] = useState('')
  const [format, setFormat] = useState('mp3')
  const [downloads, setDownloads] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('single') // 'single' or 'batch'
  const [viewMode, setViewMode] = useState('current') // 'current' or 'history'
  const [downloadedFiles, setDownloadedFiles] = useState(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('downloadedFiles')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [toast, setToast] = useState(null)

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Poll for download status with memory leak fix
  useEffect(() => {
    // Only poll if there are active downloads (not completed or failed)
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
            // Show toast when download completes (but don't move to history yet)
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

  // Initialize: mark all existing completed downloads as downloaded (for history)
  useEffect(() => {
    const initializeHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/downloads`)
        if (response.data.downloads.length > 0) {
          // Mark all existing completed/failed downloads as already downloaded
          const existingCompleted = response.data.downloads
            .filter(d => d.status === 'completed' || d.status === 'failed')
            .map(d => d.id)
          
          if (existingCompleted.length > 0) {
            setDownloadedFiles(prev => {
              const newSet = new Set([...prev, ...existingCompleted])
              localStorage.setItem('downloadedFiles', JSON.stringify([...newSet]))
              return newSet
            })
          }
          
          setDownloads(response.data.downloads)
        }
      } catch (error) {
        console.error('Error initializing downloads:', error)
      }
    }
    
    initializeHistory()
  }, []) // Run once on mount

  const handleSingleDownload = useCallback(async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/download`, {
        url: url.trim(),
        format
      })
      
      setDownloads(prev => [response.data, ...prev])
      setUrl('')
      showToast('Download started!', 'success')
    } catch (error) {
      showToast('Error: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setLoading(false)
    }
  }, [url, format, showToast])

  const handleBatchDownload = useCallback(async (e) => {
    e.preventDefault()
    const urlList = urls.split('\n')
      .map(u => u.trim())
      .filter(u => u && !u.startsWith('#'))

    if (urlList.length === 0) return

    setLoading(true)
    try {
      await axios.post(`${API_URL}/download/batch`, {
        urls: urlList,
        format,
        max_workers: 3
      })
      
      // Refresh downloads list
      const response = await axios.get(`${API_URL}/downloads`)
      setDownloads(response.data.downloads)
      setUrls('')
      showToast(`${urlList.length} downloads started!`, 'success')
    } catch (error) {
      showToast('Error: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setLoading(false)
    }
  }, [urls, format, showToast])

  const clearHistory = useCallback(() => {
    // Clear history: just remove from UI and localStorage
    // Files stay in Downloads folder, backend entries will disappear on restart
    
    // Remove history items from local state
    setDownloads(prev => prev.filter(d => !downloadedFiles.has(d.id) && d.status !== 'failed'))
    
    // Clear localStorage
    localStorage.removeItem('downloadedFiles')
    
    // Reset downloaded files state
    setDownloadedFiles(new Set())
    
    showToast('History cleared!', 'success')
  }, [downloads, downloadedFiles, showToast])

  const parsePercent = useCallback((percentStr) => {
    if (!percentStr) return '0%'
    // Remove ANSI codes and extract percentage
    const cleaned = percentStr.replace(/\[[0-9;]+m/g, '').trim()
    const match = cleaned.match(/[\d.]+/)
    return match ? `${parseFloat(match[0]).toFixed(1)}%` : '0%'
  }, [])

  const cleanSpeed = useCallback((speedStr) => {
    if (!speedStr || speedStr === 'N/A') return null
    // Remove ANSI codes
    return speedStr.replace(/\[[0-9;]+m/g, '').trim()
  }, [])

  const getStatusColor = useCallback((status) => {
    const colors = {
      queued: '#FFA500',
      processing: '#2196F3',
      extracting: '#9C27B0',
      downloading: '#2196F3',
      converting: '#FF9800',
      completed: '#4CAF50',
      failed: '#F44336'
    }
    return colors[status] || '#999'
  }, [])

  const getStatusIcon = useCallback((status) => {
    const icons = {
      queued: '⏳',
      processing: '⚙️',
      extracting: '🔍',
      downloading: '⬇️',
      converting: '🔄',
      completed: '✅',
      failed: '❌'
    }
    return icons[status] || '•'
  }, [])

  // Filter downloads based on view mode - memoized for performance
  const currentDownloads = useMemo(() => 
    downloads.filter(d => !downloadedFiles.has(d.id) && d.status !== 'failed'),
    [downloads, downloadedFiles]
  )
  
  const historyDownloads = useMemo(() => 
    downloads.filter(d => downloadedFiles.has(d.id) || d.status === 'failed'),
    [downloads, downloadedFiles]
  )
  
  const displayedDownloads = viewMode === 'current' ? currentDownloads : historyDownloads

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
          {toast.message}
        </div>
      )}

      <header className="header">
        <h1>🎵 Yourmine</h1>
        <p>YouTube Audio Downloader</p>
      </header>

      <div className="container">
        {/* Mode Toggle */}
        <div className="mode-toggle" role="group" aria-label="Download mode selection">
          <button 
            className={mode === 'single' ? 'active' : ''}
            onClick={() => setMode('single')}
            aria-pressed={mode === 'single'}
            aria-label="Single download mode"
          >
            Single Download
          </button>
          <button 
            className={mode === 'batch' ? 'active' : ''}
            onClick={() => setMode('batch')}
            aria-pressed={mode === 'batch'}
            aria-label="Batch download mode"
          >
            Batch Download
          </button>
        </div>

        {/* Format Selection */}
        <div className="format-selector" role="group" aria-label="Audio format selection">
          <label>
            <input
              type="radio"
              value="mp3"
              checked={format === 'mp3'}
              onChange={(e) => setFormat(e.target.value)}
              aria-label="MP3 lossy format"
            />
            <span>MP3 (Lossy)</span>
          </label>
          <label>
            <input
              type="radio"
              value="wav"
              checked={format === 'wav'}
              onChange={(e) => setFormat(e.target.value)}
              aria-label="WAV lossless format"
            />
            <span>WAV (Lossless)</span>
          </label>
        </div>

        {/* Single Download Form */}
        {mode === 'single' && (
          <form onSubmit={handleSingleDownload} className="download-form">
            <input
              type="text"
              placeholder="Paste YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              aria-label="YouTube URL input"
            />
            <button type="submit" disabled={loading || !url.trim()}>
              {loading ? 'Starting...' : 'Download'}
            </button>
          </form>
        )}

        {/* Batch Download Form */}
        {mode === 'batch' && (
          <form onSubmit={handleBatchDownload} className="download-form">
            <textarea
              placeholder="Paste multiple YouTube URLs (one per line)&#10;# Comments starting with # are ignored"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={6}
              disabled={loading}
              aria-label="YouTube URLs batch input"
            />
            <button type="submit" disabled={loading || !urls.trim()}>
              {loading ? 'Starting...' : 'Download All'}
            </button>
          </form>
        )}

        {/* Downloads List */}
        <div className="downloads-list">
          <div className="downloads-header">
            <h2>Downloads</h2>
            <div className="view-toggle" role="group" aria-label="Downloads view selection">
              <button 
                className={viewMode === 'current' ? 'active' : ''}
                onClick={() => setViewMode('current')}
                aria-pressed={viewMode === 'current'}
                aria-label={`Current downloads (${currentDownloads.length})`}
              >
                Current ({currentDownloads.length})
              </button>
              <button 
                className={viewMode === 'history' ? 'active' : ''}
                onClick={() => setViewMode('history')}
                aria-pressed={viewMode === 'history'}
                aria-label={`Download history (${historyDownloads.length})`}
              >
                History ({historyDownloads.length})
              </button>
            </div>
          </div>
          
          {/* Clear History Button */}
          {viewMode === 'history' && historyDownloads.length > 0 && (
            <div className="clear-history-container">
              <button 
                className="clear-history-btn"
                onClick={clearHistory}
                aria-label="Clear all download history"
              >
                Clear History
              </button>
            </div>
          )}
          
          {displayedDownloads.length === 0 ? (
            <p className="empty-state">
              {viewMode === 'current' 
                ? 'No active downloads. Start by adding a URL above!' 
                : 'No download history yet.'}
            </p>
          ) : (
            <div className="downloads-grid">
              {displayedDownloads.map((download) => (
                <div key={download.id} className="download-card">
                  <div className="download-header">
                    <span className="status-icon" aria-label={`Status: ${download.status}`}>
                      {getStatusIcon(download.status)}
                    </span>
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(download.status) }}
                    >
                      {download.status}
                    </span>
                  </div>
                  
                  <div className="download-body">
                    <h3>{download.title || 'Processing...'}</h3>
                    <p className="download-url">{download.url}</p>
                    <p className="download-format">Format: {download.format.toUpperCase()}</p>
                    
                    {download.progress && download.progress.percent && (
                      <div className="progress-container">
                        <div 
                          className="progress-bar-wrapper" 
                          role="progressbar" 
                          aria-valuenow={parseFloat(parsePercent(download.progress.percent))}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: parsePercent(download.progress.percent) }}
                          />
                        </div>
                        <div className="progress-details">
                          <span>{parsePercent(download.progress.percent)}</span>
                          {cleanSpeed(download.progress.speed) && (
                            <span>{cleanSpeed(download.progress.speed)}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {download.error && (
                      <p className="error-message" role="alert">{download.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
