import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useToast, useDownloads } from './hooks'
import {
  Toast,
  ModeToggle,
  FormatSelector,
  DownloadForm,
  DownloadsList
} from './components'
import type { AudioFormat, DownloadMode, ViewMode } from './types'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [urls, setUrls] = useState('')
  const [format, setFormat] = useState<AudioFormat>('mp3')
  const [mode, setMode] = useState<DownloadMode>('single')
  const [viewMode, setViewMode] = useState<ViewMode>('current')

  const { toast, showToast } = useToast()
  const {
    loading,
    currentDownloads,
    historyDownloads,
    startSingleDownload,
    startBatchDownload,
    clearHistory
  } = useDownloads(showToast)

  const handleSingleDownload = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    const success = await startSingleDownload(url, format)
    if (success) {
      setUrl('')
    }
  }, [url, format, startSingleDownload])

  const handleBatchDownload = useCallback(async (e: FormEvent) => {
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
      {toast && <Toast message={toast.message} type={toast.type} />}

      <header className="header">
        <h1>Yourmine</h1>
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
