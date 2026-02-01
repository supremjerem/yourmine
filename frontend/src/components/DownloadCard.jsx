/**
 * Download card component.
 *
 * Displays information about a single download including status,
 * title, progress, and any errors.
 */
import PropTypes from 'prop-types'
import { useDownloadStatus } from '../hooks'

/**
 * Individual download card display.
 *
 * @param {Object} props - Component props
 * @param {Object} props.download - Download data object
 */
function DownloadCard({ download }) {
  const { parsePercent, cleanSpeed, getStatusColor, getStatusIcon } = useDownloadStatus()

  return (
    <div className="download-card">
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
              aria-label={`Download progress: ${parsePercent(download.progress.percent)}`}
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
  )
}

DownloadCard.propTypes = {
  download: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf([
      'queued',
      'processing',
      'extracting',
      'downloading',
      'converting',
      'completed',
      'failed'
    ]).isRequired,
    url: PropTypes.string.isRequired,
    format: PropTypes.oneOf(['mp3', 'wav']).isRequired,
    title: PropTypes.string,
    filename: PropTypes.string,
    error: PropTypes.string,
    progress: PropTypes.shape({
      status: PropTypes.string,
      percent: PropTypes.string,
      speed: PropTypes.string,
      eta: PropTypes.string
    }),
    created_at: PropTypes.string
  }).isRequired
}

export default DownloadCard
