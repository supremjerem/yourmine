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
  const buttonLabel = loading ? 'Starting...' : (isSingleMode ? 'Download' : 'Download All')

  return (
    <form onSubmit={onSubmit} className="download-form">
      {isSingleMode ? (
        <input
          type="url"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={loading}
          aria-label="YouTube URL input"
          autoComplete="url"
        />
      ) : (
        <textarea
          placeholder="Paste multiple YouTube URLs (one per line)&#10;# Comments starting with # are ignored"
          value={urls}
          onChange={(e) => onUrlsChange(e.target.value)}
          rows={6}
          disabled={loading}
          aria-label="YouTube URLs batch input"
        />
      )}
      <button type="submit" disabled={isDisabled}>
        {buttonLabel}
      </button>
    </form>
  )
}

export default DownloadForm
