/**
 * Downloads list component.
 *
 * Displays a list of downloads with current/history tabs.
 */
import PropTypes from 'prop-types'
import DownloadCard from './DownloadCard'

/**
 * Downloads list with tabs and clear history functionality.
 *
 * @param {Object} props - Component props
 * @param {string} props.viewMode - Current view ('current' or 'history')
 * @param {Array} props.currentDownloads - Active downloads
 * @param {Array} props.historyDownloads - Completed/failed downloads
 * @param {Function} props.onViewModeChange - Callback when view mode changes
 * @param {Function} props.onClearHistory - Callback to clear history
 */
function DownloadsList({
  viewMode,
  currentDownloads,
  historyDownloads,
  onViewModeChange,
  onClearHistory
}) {
  const displayedDownloads = viewMode === 'current' ? currentDownloads : historyDownloads

  return (
    <div className="downloads-list">
      <div className="downloads-header">
        <h2>Downloads</h2>
        <div className="view-toggle" role="group" aria-label="Downloads view selection">
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
        </div>
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

DownloadsList.propTypes = {
  viewMode: PropTypes.oneOf(['current', 'history']).isRequired,
  currentDownloads: PropTypes.arrayOf(PropTypes.object).isRequired,
  historyDownloads: PropTypes.arrayOf(PropTypes.object).isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onClearHistory: PropTypes.func.isRequired
}

export default DownloadsList
