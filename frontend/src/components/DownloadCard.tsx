import { memo } from 'react'
import { parsePercent, cleanSpeed, getStatusColor, getStatusIcon } from '../utils/downloadStatus'
import type { Download } from '../types'

interface DownloadCardProps {
  download: Download
}

function DownloadCard({ download }: DownloadCardProps) {
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
              aria-valuemin={0}
              aria-valuemax={100}
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

export default memo(DownloadCard)
