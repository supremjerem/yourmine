/**
 * Yourmine - YouTube Audio Downloader
 *
 * Main application component that orchestrates the download
 * functionality using modular components and custom hooks.
 */
import { useState, useCallback } from 'react'
import { useToast, useDownloads } from './hooks'
import {
  Toast,
  ModeToggle,
  FormatSelector,
  DownloadForm,
  DownloadsList
} from './components'
import './App.css'

/**
 * Main application component.
 *
 * Provides the user interface for downloading YouTube videos
 * as audio files in MP3 or WAV format.
 *
 * @returns {JSX.Element} The rendered application
 */
function App() {
  // Form state
  const [url, setUrl] = useState('')
  const [urls, setUrls] = useState('')
  const [format, setFormat] = useState('mp3')
  const [mode, setMode] = useState('single')
  const [viewMode, setViewMode] = useState('current')

  // Custom hooks
  const { toast, showToast } = useToast()
  const {
    loading,
    currentDownloads,
    historyDownloads,
    startSingleDownload,
    startBatchDownload,
    clearHistory
  } = useDownloads(showToast)

  /**
   * Handle single download form submission.
   *
   * @param {React.FormEvent} e - Form event
   */
  const handleSingleDownload = useCallback(async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    const success = await startSingleDownload(url, format)
    if (success) {
      setUrl('')
    }
  }, [url, format, startSingleDownload])

  /**
   * Handle batch download form submission.
   *
   * @param {React.FormEvent} e - Form event
   */
  const handleBatchDownload = useCallback(async (e) => {
    e.preventDefault()
    const urlList = urls.split('\n')
      .map(u => u.trim())
      .filter(u => u && !u.startsWith('#'))

    if (urlList.length === 0) return

    const success = await startBatchDownload(urlList, format)
    if (success) {
      setUrls('')
    }
  }, [urls, format, startBatchDownload])

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <header className="header">
        <h1>🎵 Yourmine</h1>
        <p>YouTube Audio Downloader</p>
      </header>

      <main className="container">
        <ModeToggle mode={mode} onModeChange={setMode} />

        <FormatSelector format={format} onFormatChange={setFormat} />

        <DownloadForm
          mode={mode}
          url={url}
          urls={urls}
          loading={loading}
          onUrlChange={setUrl}
          onUrlsChange={setUrls}
          onSubmit={mode === 'single' ? handleSingleDownload : handleBatchDownload}
        />

        <DownloadsList
          viewMode={viewMode}
          currentDownloads={currentDownloads}
          historyDownloads={historyDownloads}
          onViewModeChange={setViewMode}
          onClearHistory={clearHistory}
        />
      </main>
    </div>
  )
}

export default App
