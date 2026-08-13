import { describe, expect, it } from 'vitest'
import { cleanSpeed, getStatusColor, getStatusIcon, parsePercent } from './downloadStatus'

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

describe('getStatusColor', () => {
  it('should return a distinct colour for each known status', () => {
    const colors = (
      ['queued', 'downloading', 'completed', 'failed'] as const
    ).map(getStatusColor)
    expect(new Set(colors).size).toBeGreaterThan(1)
  })

  it('should return a colour for every status', () => {
    expect(getStatusColor('converting')).toMatch(/^var\(--|^#/)
  })
})

describe('getStatusIcon', () => {
  it('should return a label for a known status', () => {
    expect(getStatusIcon('completed')).toBeTruthy()
  })
})
