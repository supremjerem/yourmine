/**
 * Format selector component.
 *
 * Radio button group for selecting the audio format (MP3 or WAV).
 */
import PropTypes from 'prop-types'

/**
 * Audio format selection component.
 *
 * @param {Object} props - Component props
 * @param {string} props.format - Currently selected format
 * @param {Function} props.onFormatChange - Callback when format changes
 */
function FormatSelector({ format, onFormatChange }) {
  return (
    <div
      className="format-selector"
      role="group"
      aria-label="Audio format selection"
    >
      <label>
        <input
          type="radio"
          name="format"
          value="mp3"
          checked={format === 'mp3'}
          onChange={(e) => onFormatChange(e.target.value)}
          aria-label="MP3 lossy format"
        />
        <span>MP3 (Lossy)</span>
      </label>
      <label>
        <input
          type="radio"
          name="format"
          value="wav"
          checked={format === 'wav'}
          onChange={(e) => onFormatChange(e.target.value)}
          aria-label="WAV lossless format"
        />
        <span>WAV (Lossless)</span>
      </label>
    </div>
  )
}

FormatSelector.propTypes = {
  format: PropTypes.oneOf(['mp3', 'wav']).isRequired,
  onFormatChange: PropTypes.func.isRequired
}

export default FormatSelector
