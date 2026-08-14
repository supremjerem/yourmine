import { describe, expect, it } from 'vitest'
import {
  cleanSpeed,
  getStatusLabel,
  getStatusTone,
  isTerminal,
  parsePercent,
  parseProgressFraction
} from './downloadStatus'

describe('parsePercent', () => {
  it('should strip the ANSI colour codes yt-dlp emits', () => {
    // yt-dlp writes percentages wrapped in terminal escape sequences.
    expect(parsePercent('\u001b[0;94m 42.3%\u001b[0m')).toBe('42.3%')
  })

  it('should normalise to one decimal place', () => {
    expect(parsePercent('42%')).toBe('42.0%')
    expect(parsePercent('7.25%')).toBe('7.3%')
  })

  it('should return zero for an undefined value', () => {
    expect(parsePercent(undefined)).toBe('0%')
  })

  it('should return zero for a string with no digits', () => {
    expect(parsePercent('unknown')).toBe('0%')
  })

  it('should handle a full hundred percent', () => {
    expect(parsePercent('100.0%')).toBe('100.0%')
  })
})

describe('cleanSpeed', () => {
  it('should strip ANSI codes and surrounding whitespace', () => {
    expect(cleanSpeed('\u001b[0;32m 1.23MiB/s \u001b[0m')).toBe('1.23MiB/s')
  })

  it('should return null when the speed is unknown', () => {
    expect(cleanSpeed('N/A')).toBeNull()
  })

  it('should return null when no speed was reported', () => {
    expect(cleanSpeed(undefined)).toBeNull()
  })
})

describe('parseProgressFraction', () => {
  it('should convert a percentage into a 0-1 fraction', () => {
    expect(parseProgressFraction('63.0%')).toBeCloseTo(0.63)
  })

  it('should return zero when nothing has been reported', () => {
    expect(parseProgressFraction(undefined)).toBe(0)
  })

  it('should clamp to one so the waveform cannot overfill', () => {
    expect(parseProgressFraction('140%')).toBe(1)
  })
})

describe('getStatusTone', () => {
  it('should light the meter amber while a download is moving', () => {
    expect(getStatusTone('downloading')).toBe('signal')
    expect(getStatusTone('converting')).toBe('signal')
  })

  it('should settle to green when the file lands', () => {
    expect(getStatusTone('completed')).toBe('landed')
  })

  it('should show red when a download fails', () => {
    expect(getStatusTone('failed')).toBe('clipped')
  })

  it('should leave a queued download unlit', () => {
    expect(getStatusTone('queued')).toBe('idle')
  })
})

describe('getStatusLabel', () => {
  it('should name states for the user, not the state machine', () => {
    expect(getStatusLabel('completed')).toBe('Saved')
    expect(getStatusLabel('extracting')).toBe('Reading')
  })

  it('should have a label for every status', () => {
    const statuses = [
      'queued',
      'processing',
      'extracting',
      'downloading',
      'converting',
      'completed',
      'failed'
    ] as const
    statuses.forEach((status) => expect(getStatusLabel(status)).toBeTruthy())
  })
})

describe('isTerminal', () => {
  it('should treat saved and failed as final', () => {
    expect(isTerminal('completed')).toBe(true)
    expect(isTerminal('failed')).toBe(true)
  })

  it('should treat in-flight states as not final', () => {
    expect(isTerminal('downloading')).toBe(false)
  })
})
