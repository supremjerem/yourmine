import type { WaveformTone } from '../components/Waveform'
import type { DownloadStatusType } from '../types'

/**
 * How each state reads on the meter.
 *
 * Amber while the job is moving, green when it lands, red when it fails —
 * the scale a level meter already uses, so colour reports state rather than
 * decorating it.
 */
const STATUS_TONES: Record<DownloadStatusType, WaveformTone> = {
  queued: 'idle',
  processing: 'signal',
  extracting: 'signal',
  downloading: 'signal',
  converting: 'signal',
  completed: 'landed',
  failed: 'clipped'
}

/**
 * User-facing state labels.
 *
 * Named for what is happening to the person's file, not for the internal
 * state machine, and "Saved" matches the wording of the toast that follows.
 */
const STATUS_LABELS: Record<DownloadStatusType, string> = {
  queued: 'Queued',
  processing: 'Starting',
  extracting: 'Reading',
  downloading: 'Downloading',
  converting: 'Converting',
  completed: 'Saved',
  failed: 'Failed'
}

/**
 * ANSI SGR escape sequence, including the leading ESC.
 *
 * yt-dlp colours its progress strings. Matching only the bracketed part left
 * the bare ESC character behind, which then rendered in the UI.
 */
// eslint-disable-next-line no-control-regex -- matching ESC is the whole point
const ANSI_ESCAPE = /\u001b?\[[0-9;]*m/g

export function parsePercent(percentStr?: string): string {
  if (!percentStr) return '0%'
  const cleaned = percentStr.replaceAll(ANSI_ESCAPE, '').trim()
  const match = /[\d.]+/.exec(cleaned)
  return match ? `${Number.parseFloat(match[0]).toFixed(1)}%` : '0%'
}

/** The same percentage as a 0–1 fraction, for driving the waveform. */
export function parseProgressFraction(percentStr?: string): number {
  const percent = Number.parseFloat(parsePercent(percentStr))
  if (Number.isNaN(percent)) return 0
  return Math.min(1, Math.max(0, percent / 100))
}

export function cleanSpeed(speedStr?: string): string | null {
  if (!speedStr || speedStr === 'N/A') return null
  const cleaned = speedStr.replaceAll(ANSI_ESCAPE, '').trim()
  return cleaned || null
}

export function getStatusTone(status: DownloadStatusType): WaveformTone {
  return STATUS_TONES[status] ?? 'idle'
}

export function getStatusLabel(status: DownloadStatusType): string {
  return STATUS_LABELS[status] ?? status
}

/** True once the job will not change state again. */
export function isTerminal(status: DownloadStatusType): boolean {
  return status === 'completed' || status === 'failed'
}
