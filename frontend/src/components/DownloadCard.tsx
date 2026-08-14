import { memo } from 'react'
import Waveform from './Waveform'
import {
  cleanSpeed,
  getStatusLabel,
  getStatusTone,
  isTerminal,
  parsePercent,
  parseProgressFraction
} from '../utils/downloadStatus'
import styles from './DownloadCard.module.css'
import type { Download } from '../types'

interface DownloadCardProps {
  readonly download: Download
}

/** Strip the scheme and trailing parameters so the row shows the useful part. */
function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').split('&')[0]
}

function DownloadCard({ download }: DownloadCardProps) {
  const tone = getStatusTone(download.status)
  const label = getStatusLabel(download.status)
  const percent = parsePercent(download.progress?.percent)
  const speed = cleanSpeed(download.progress?.speed)
  const finished = isTerminal(download.status)
  const hasProgress = Boolean(download.progress?.percent)

  // A saved download settles to a fully lit waveform — that settled shape is
  // the completion mark, which is why there is no separate status icon. A
  // failed one stays lit only as far as it actually got, so the meter never
  // claims progress that did not happen.
  const fraction =
    download.status === 'completed'
      ? 1
      : parseProgressFraction(download.progress?.percent)
  const showsProgress = hasProgress && !finished

  // Before the title is known the link stands in as the heading, so repeating
  // it in the readout below would say the same thing twice.
  const source = shortenUrl(download.url)
  const hasTitle = Boolean(download.title)

  return (
    <article className={styles.row} data-testid="download-card">
      <header className={styles.head}>
        <h3 className={styles.title}>{download.title ?? source}</h3>
        <span className={styles.state} data-tone={tone} data-testid="status-badge">
          {label}
        </span>
      </header>

      <div
        className={styles.meter}
        role={showsProgress ? 'progressbar' : undefined}
        aria-valuenow={showsProgress ? Number.parseFloat(percent) : undefined}
        aria-valuemin={showsProgress ? 0 : undefined}
        aria-valuemax={showsProgress ? 100 : undefined}
        aria-label={showsProgress ? `Download progress: ${percent}` : undefined}
      >
        <Waveform seed={download.id} progress={fraction} tone={tone} />
      </div>

      <footer className={styles.readout}>
        <span className={styles.format} data-testid="download-format">
          {download.format.toUpperCase()}
        </span>
        {/* Kept in the flow even when empty: it is the flexible column that
            pushes the numeric readout to the right edge. */}
        <span className={styles.source}>{hasTitle ? source : null}</span>
        <span className={styles.numbers}>
          {showsProgress && <span>{percent}</span>}
          {showsProgress && speed && <span>{speed}</span>}
        </span>
      </footer>

      {download.error && (
        <p className={styles.error} role="alert" data-testid="error-message">
          {download.error}
        </p>
      )}
    </article>
  )
}

export default memo(DownloadCard)
