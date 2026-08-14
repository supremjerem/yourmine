import styles from './DownloadForm.module.css'
import type { FormEvent } from 'react'
import type { DownloadMode } from '../types'

interface DownloadFormProps {
  readonly mode: DownloadMode
  readonly url: string
  readonly urls: string
  readonly loading: boolean
  readonly onUrlChange: (url: string) => void
  readonly onUrlsChange: (urls: string) => void
  readonly onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

function DownloadForm({
  mode,
  url,
  urls,
  loading,
  onUrlChange,
  onUrlsChange,
  onSubmit
}: DownloadFormProps) {
  const isSingleMode = mode === 'single'
  const isDisabled = loading || (isSingleMode ? !url.trim() : !urls.trim())
  const action = isSingleMode ? 'Rip' : 'Rip all'

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {isSingleMode ? (
        <div className={styles.field}>
          <input
            className={styles.input}
            type="url"
            placeholder="Paste a YouTube link"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            disabled={loading}
            aria-label="YouTube URL input"
            autoComplete="url"
          />
          <button className={styles.action} type="submit" disabled={isDisabled}>
            {loading ? 'Starting' : action}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <>
          <textarea
            className={styles.textarea}
            placeholder={'One link per line\nLines starting with # are skipped'}
            value={urls}
            onChange={(e) => onUrlsChange(e.target.value)}
            rows={6}
            disabled={loading}
            aria-label="YouTube URLs batch input"
          />
          <button
            className={`${styles.action} ${styles.actionBlock}`}
            type="submit"
            disabled={isDisabled}
          >
            {loading ? 'Starting' : action}
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </form>
  )
}

export default DownloadForm
