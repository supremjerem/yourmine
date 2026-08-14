import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Waveform from './Waveform'

function bars(container: HTMLElement): SVGRectElement[] {
  return Array.from(container.querySelectorAll('rect'))
}

function litCount(container: HTMLElement): number {
  return bars(container).filter((bar) => bar.hasAttribute('data-lit')).length
}

describe('shape', () => {
  it('should draw the same waveform for the same seed', () => {
    // The shape is seeded by download id so it stays put across the 1s poll.
    const first = render(<Waveform seed="job-a" />).container.innerHTML
    const second = render(<Waveform seed="job-a" />).container.innerHTML

    expect(first).toBe(second)
  })

  it('should draw a different waveform for a different seed', () => {
    const a = render(<Waveform seed="job-a" />).container.innerHTML
    const b = render(<Waveform seed="job-b" />).container.innerHTML

    expect(a).not.toBe(b)
  })

  it('should give every bar a height within the drawable range', () => {
    const { container } = render(<Waveform seed="job-a" />)

    bars(container).forEach((bar) => {
      const height = Number.parseFloat(bar.getAttribute('height') ?? '0')
      expect(height).toBeGreaterThan(0)
      expect(height).toBeLessThanOrEqual(40)
    })
  })

  it('should space every bar identically', () => {
    // Flex distribution used to leave neighbouring bars at different widths.
    const { container } = render(<Waveform seed="job-a" />)
    const widths = new Set(bars(container).map((bar) => bar.getAttribute('width')))

    expect(widths.size).toBe(1)
  })

  it('should draw a flat line when asked for silence', () => {
    const { container } = render(<Waveform seed="no-signal" flat />)
    const heights = new Set(bars(container).map((bar) => bar.getAttribute('height')))

    expect(heights.size).toBe(1)
  })
})

describe('progress', () => {
  it('should light no bars at zero', () => {
    const { container } = render(<Waveform seed="job-a" progress={0} />)
    expect(litCount(container)).toBe(0)
  })

  it('should light every bar when complete', () => {
    const { container } = render(<Waveform seed="job-a" progress={1} />)
    expect(litCount(container)).toBe(bars(container).length)
  })

  it('should light roughly half the bars at half progress', () => {
    const { container } = render(<Waveform seed="job-a" progress={0.5} />)
    const total = bars(container).length

    expect(litCount(container)).toBeGreaterThan(total * 0.4)
    expect(litCount(container)).toBeLessThan(total * 0.6)
  })

  it('should light more bars as progress advances', () => {
    const quarter = render(<Waveform seed="job-a" progress={0.25} />)
    const threeQuarters = render(<Waveform seed="job-a" progress={0.75} />)

    expect(litCount(threeQuarters.container)).toBeGreaterThan(
      litCount(quarter.container)
    )
  })
})

describe('tone', () => {
  it('should carry the tone it was given', () => {
    const { container } = render(<Waveform seed="job-a" tone="landed" />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'landed')
  })

  it('should default to the signal tone', () => {
    const { container } = render(<Waveform seed="job-a" />)
    expect(container.firstElementChild).toHaveAttribute('data-tone', 'signal')
  })
})

describe('accessibility', () => {
  it('should be hidden from assistive technology', () => {
    // The numeric readout beside it carries the meaning.
    const { container } = render(<Waveform seed="job-a" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
