/**
 * Mode toggle component.
 *
 * Toggle buttons for switching between single and batch download modes.
 */
import PropTypes from 'prop-types'

/**
 * Download mode toggle buttons.
 *
 * @param {Object} props - Component props
 * @param {string} props.mode - Currently selected mode ('single' or 'batch')
 * @param {Function} props.onModeChange - Callback when mode changes
 */
function ModeToggle({ mode, onModeChange }) {
  return (
    <div
      className="mode-toggle"
      role="group"
      aria-label="Download mode selection"
    >
      <button
        className={mode === 'single' ? 'active' : ''}
        onClick={() => onModeChange('single')}
        aria-pressed={mode === 'single'}
        aria-label="Single download mode"
        type="button"
      >
        Single Download
      </button>
      <button
        className={mode === 'batch' ? 'active' : ''}
        onClick={() => onModeChange('batch')}
        aria-pressed={mode === 'batch'}
        aria-label="Batch download mode"
        type="button"
      >
        Batch Download
      </button>
    </div>
  )
}

ModeToggle.propTypes = {
  mode: PropTypes.oneOf(['single', 'batch']).isRequired,
  onModeChange: PropTypes.func.isRequired
}

export default ModeToggle
