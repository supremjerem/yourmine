import { useCallback } from 'react'
import type { DownloadStatusType } from '../types'

const STATUS_COLORS: Record<DownloadStatusType, string> = {
  queued: '#FFA500',
  processing: '#2196F3',
  extracting: '#9C27B0',
  downloading: '#2196F3',
  converting: '#FF9800',
  completed: '#4CAF50',
  failed: '#F44336'
}

const STATUS_ICONS: Record<DownloadStatusType, string> = {
  queued: '⏳',
  processing: '⚙️',
  extracting: '🔍',
  downloading: '⬇️',
  converting: '🔄',
  completed: '✅',
  failed: '❌'
}

export function useDownloadStatus() {
  const parsePercent = useCallback((percentStr?: string): string => {
    if (!percentStr) return '0%'
    const cleaned = percentStr.replace(/\[[0-9;]+m/g, '').trim()
    const match = cleaned.match(/[\d.]+/)
    return match ? `${parseFloat(match[0]).toFixed(1)}%` : '0%'
  }, [])

  const cleanSpeed = useCallback((speedStr?: string): string | null => {
    if (!speedStr || speedStr === 'N/A') return null
    return speedStr.replace(/\[[0-9;]+m/g, '').trim()
  }, [])

  const getStatusColor = useCallback((status: DownloadStatusType): string => {
    return STATUS_COLORS[status] || '#999'
  }, [])

  const getStatusIcon = useCallback((status: DownloadStatusType): string => {
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
