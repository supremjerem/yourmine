import DownloadCard from './DownloadCard'
import Waveform from './Waveform'
import styles from './DownloadsList.module.css'
import type { Download, ViewMode } from '../types'

interface DownloadsListProps {
  readonly viewMode: ViewMode
  readonly currentDownloads: Download[]
  readonly historyDownloads: Download[]
  readonly onViewModeChange: (mode: ViewMode) => void
  readonly onClearHistory: () => void
}

function DownloadsList({
  viewMode,
  currentDownloads,
  historyDownloads,
  onViewModeChange,
  onClearHistory
}: DownloadsListProps) {
  const showingCurrent = viewMode === 'current'
  const displayed = showingCurrent ? currentDownloads : historyDownloads

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.heading}>Downloads</h2>

        <fieldset className={styles.tabs} aria-label="Downloads view selection">
          <button
            className={styles.tab}
            data-active={showingCurrent || undefined}
            onClick={() => onViewModeChange('current')}
            aria-pressed={showingCurrent}
            aria-label={`Current downloads (${currentDownloads.length})`}
            type="button"
          >
            This session <span className={styles.count}>{currentDownloads.length}</span>
          </button>
          <button
            className={styles.tab}
            data-active={!showingCurrent || undefined}
            onClick={() => onViewModeChange('history')}
            aria-pressed={!showingCurrent}
            aria-label={`Download history (${historyDownloads.length})`}
            type="button"
          >
            Earlier <span className={styles.count}>{historyDownloads.length}</span>
          </button>
        </fieldset>
      </header>

      {!showingCurrent && historyDownloads.length > 0 && (
        <div className={styles.tools}>
          <button
            className={styles.clear}
            onClick={onClearHistory}
            aria-label="Clear all download history"
            type="button"
          >
            Clear earlier
          </button>
        </div>
      )}

      {displayed.length === 0 ? (
        /* The empty state is a silent waveform: present, just nothing on it. */
        <div className={styles.empty} data-testid="empty-state">
          <div className={styles.emptyMeter}>
            <Waveform seed="no-signal" progress={0} tone="idle" flat />
          </div>
          <p className={styles.emptyText}>
            {showingCurrent
              ? 'Nothing ripping yet. Paste a link above to start.'
              : 'Nothing from earlier sessions.'}
          </p>
        </div>
      ) : (
        <div className={styles.rows}>
          {displayed.map((download) => (
            <DownloadCard key={download.id} download={download} />
          ))}
        </div>
      )}
    </section>
  )
}

export default DownloadsList
