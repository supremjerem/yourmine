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

/**
 * ANSI SGR escape sequence, including the leading ESC.
 *
 * yt-dlp colours its progress strings. Matching only the bracketed part left
 * the bare ESC character behind, which then rendered in the UI.
 */
const ANSI_ESCAPE = /\u001b?\[[0-9;]*m/g

export function parsePercent(percentStr?: string): string {
  if (!percentStr) return '0%'
  const cleaned = percentStr.replaceAll(ANSI_ESCAPE, '').trim()
  const match = /[\d.]+/.exec(cleaned)
  return match ? `${Number.parseFloat(match[0]).toFixed(1)}%` : '0%'
}

export function cleanSpeed(speedStr?: string): string | null {
  if (!speedStr || speedStr === 'N/A') return null
  const cleaned = speedStr.replaceAll(ANSI_ESCAPE, '').trim()
  return cleaned || null
}

export function getStatusColor(status: DownloadStatusType): string {
  return STATUS_COLORS[status] || '#999'
}

export function getStatusIcon(status: DownloadStatusType): string {
  return STATUS_ICONS[status] || '•'
}
