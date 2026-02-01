/**
 * Custom hook for download status display utilities.
 *
 * Provides helper functions for parsing progress data and
 * determining status colors/icons.
 */
import { useCallback } from 'react'

/**
 * Status color mapping for download states.
 */
const STATUS_COLORS = {
  queued: '#FFA500',
  processing: '#2196F3',
  extracting: '#9C27B0',
  downloading: '#2196F3',
  converting: '#FF9800',
  completed: '#4CAF50',
  failed: '#F44336'
}

/**
 * Status icon mapping for download states.
 */
const STATUS_ICONS = {
  queued: '⏳',
  processing: '⚙️',
  extracting: '🔍',
  downloading: '⬇️',
  converting: '🔄',
  completed: '✅',
  failed: '❌'
}

/**
 * Hook providing download status display utilities.
 *
 * @returns {Object} Status utility functions
 */
export function useDownloadStatus() {
  /**
   * Parse percentage string from progress data.
   * Removes ANSI codes and extracts the numeric percentage.
   *
   * @param {string|undefined} percentStr - Raw percentage string
   * @returns {string} Cleaned percentage (e.g., "45.3%")
   */
  const parsePercent = useCallback((percentStr) => {
    if (!percentStr) return '0%'
    const cleaned = percentStr.replace(/\[[0-9;]+m/g, '').trim()
    const match = cleaned.match(/[\d.]+/)
    return match ? `${parseFloat(match[0]).toFixed(1)}%` : '0%'
  }, [])

  /**
   * Clean speed string from progress data.
   * Removes ANSI codes from the speed display.
   *
   * @param {string|undefined} speedStr - Raw speed string
   * @returns {string|null} Cleaned speed or null if N/A
   */
  const cleanSpeed = useCallback((speedStr) => {
    if (!speedStr || speedStr === 'N/A') return null
    return speedStr.replace(/\[[0-9;]+m/g, '').trim()
  }, [])

  /**
   * Get the color associated with a download status.
   *
   * @param {string} status - Download status
   * @returns {string} Hex color code
   */
  const getStatusColor = useCallback((status) => {
    return STATUS_COLORS[status] || '#999'
  }, [])

  /**
   * Get the icon associated with a download status.
   *
   * @param {string} status - Download status
   * @returns {string} Status emoji icon
   */
  const getStatusIcon = useCallback((status) => {
    return STATUS_ICONS[status] || '•'
  }, [])

  return {
    parsePercent,
    cleanSpeed,
    getStatusColor,
    getStatusIcon
  }
}

export default useDownloadStatus
