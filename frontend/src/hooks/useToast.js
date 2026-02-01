/**
 * Custom hook for toast notification management.
 *
 * Provides a simple interface for showing temporary toast notifications
 * with auto-dismiss functionality.
 *
 * @returns {Object} Toast state and controls
 * @returns {Object|null} toast - Current toast object or null
 * @returns {Function} showToast - Function to display a toast message
 */
import { useState, useCallback } from 'react'

/**
 * Toast notification hook with auto-dismiss functionality.
 *
 * @param {number} duration - Duration in ms before toast auto-dismisses (default: 3000)
 * @returns {{ toast: Object|null, showToast: Function }}
 */
export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}

export default useToast
