/**
 * Download form component.
 *
 * Form for entering YouTube URLs for single or batch downloads.
 */
import PropTypes from 'prop-types'

/**
 * Download form for URL input.
 *
 * @param {Object} props - Component props
 * @param {string} props.mode - Download mode ('single' or 'batch')
 * @param {string} props.url - Single URL input value
 * @param {string} props.urls - Batch URLs input value
 * @param {boolean} props.loading - Whether a download is in progress
 * @param {Function} props.onUrlChange - Callback for single URL changes
 * @param {Function} props.onUrlsChange - Callback for batch URLs changes
 * @param {Function} props.onSubmit - Form submission handler
 */
function DownloadForm({
  mode,
  url,
  urls,
  loading,
  onUrlChange,
  onUrlsChange,
  onSubmit
}) {
  const isSingleMode = mode === 'single'
  const isDisabled = loading || (isSingleMode ? !url.trim() : !urls.trim())

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
        {loading ? 'Starting...' : isSingleMode ? 'Download' : 'Download All'}
      </button>
    </form>
  )
}

DownloadForm.propTypes = {
  mode: PropTypes.oneOf(['single', 'batch']).isRequired,
  url: PropTypes.string.isRequired,
  urls: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  onUrlChange: PropTypes.func.isRequired,
  onUrlsChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
}

export default DownloadForm
