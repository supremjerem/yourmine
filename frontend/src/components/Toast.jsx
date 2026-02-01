/**
 * Toast notification component.
 *
 * Displays temporary notification messages with different styles
 * based on the notification type (success, error, info).
 */
import PropTypes from 'prop-types'

/**
 * Toast notification display component.
 *
 * @param {Object} props - Component props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Toast type: 'success', 'error', or 'info'
 */
function Toast({ message, type = 'info' }) {
  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info'])
}

Toast.defaultProps = {
  type: 'info'
}

export default Toast
