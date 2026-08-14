import { useCallback, useState } from 'react'
import { useDownloads, useToast } from './hooks'
import {
  DownloadForm,
  DownloadsList,
  FormatSelector,
  ModeToggle,
  Toast
} from './components'
import styles from './App.module.css'
import type { FormEvent } from 'react'
import type { AudioFormat, DownloadMode, ViewMode } from './types'

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

  const handleSingleDownload = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!url.trim()) return

      if (await startSingleDownload(url, format)) {
        setUrl('')
      }
    },
    [url, format, startSingleDownload]
  )

  const handleBatchDownload = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const urlList = urls
        .split('\n')
        .map((u) => u.trim())
        .filter((u) => u && !u.startsWith('#'))

      if (urlList.length === 0) return

      if (await startBatchDownload(urlList, format)) {
        setUrls('')
      }
    },
    [urls, format, startBatchDownload]
  )

  return (
    <div className={styles.app}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <header className={styles.masthead}>
        <h1 className={styles.wordmark}>Yourmine</h1>
        <p className={styles.tagline}>audio, extracted</p>
      </header>

      <main className={styles.main}>
        <section className={styles.console}>
          <div className={styles.controls}>
            <ModeToggle mode={mode} onModeChange={setMode} />
            <FormatSelector format={format} onFormatChange={setFormat} />
          </div>

          <DownloadForm
            mode={mode}
            url={url}
            urls={urls}
            loading={loading}
            onUrlChange={setUrl}
            onUrlsChange={setUrls}
            onSubmit={(e) => {
              void (mode === 'single'
                ? handleSingleDownload(e)
                : handleBatchDownload(e))
            }}
          />
        </section>

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
