import DownloadCard from './DownloadCard'
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
  const displayedDownloads = viewMode === 'current' ? currentDownloads : historyDownloads

  return (
    <div className="downloads-list">
      <div className="downloads-header">
        <h2>Downloads</h2>
        <fieldset className="view-toggle" aria-label="Downloads view selection">
          <button
            className={viewMode === 'current' ? 'active' : ''}
            onClick={() => onViewModeChange('current')}
            aria-pressed={viewMode === 'current'}
            aria-label={`Current downloads (${currentDownloads.length})`}
            type="button"
          >
            Current ({currentDownloads.length})
          </button>
          <button
            className={viewMode === 'history' ? 'active' : ''}
            onClick={() => onViewModeChange('history')}
            aria-pressed={viewMode === 'history'}
            aria-label={`Download history (${historyDownloads.length})`}
            type="button"
          >
            History ({historyDownloads.length})
          </button>
        </fieldset>
      </div>

      {viewMode === 'history' && historyDownloads.length > 0 && (
        <div className="clear-history-container">
          <button
            className="clear-history-btn"
            onClick={onClearHistory}
            aria-label="Clear all download history"
            type="button"
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
            <DownloadCard key={download.id} download={download} />
          ))}
        </div>
      )}
    </div>
  )
}

export default DownloadsList
