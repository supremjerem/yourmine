import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DownloadCard from './DownloadCard'
import type { Download } from '../types'

function makeDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: 'download-1',
    status: 'downloading',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    format: 'mp3',
    ...overrides
  }
}

describe('DownloadCard', () => {
  it('should show the video title once it is known', () => {
    render(<DownloadCard download={makeDownload({ title: 'Roygbiv' })} />)
    expect(screen.getByText('Roygbiv')).toBeInTheDocument()
  })

  it('should show the source url alongside a known title', () => {
    render(<DownloadCard download={makeDownload({ title: 'Roygbiv' })} />)
    expect(screen.getByText(/dQw4w9WgXcQ/)).toBeInTheDocument()
  })

  it('should fall back to the link as the heading before the title is known', () => {
    render(<DownloadCard download={makeDownload()} />)
    // Shown once as the heading, not repeated in the readout below.
    expect(screen.getByText(/dQw4w9WgXcQ/)).toBeInTheDocument()
  })

  it('should expose progress to assistive technology', () => {
    render(<DownloadCard download={makeDownload({ progress: { percent: '63.0%' } })} />)

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '63')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('should not render a progress bar before any progress is reported', () => {
    render(<DownloadCard download={makeDownload({ status: 'queued' })} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('should announce an error as an alert', () => {
    render(
      <DownloadCard
        download={makeDownload({ status: 'failed', error: 'Video unavailable' })}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Video unavailable')
  })

  it('should not render an alert when there is no error', () => {
    render(<DownloadCard download={makeDownload()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should show the chosen audio format', () => {
    render(<DownloadCard download={makeDownload({ format: 'wav' })} />)
    expect(screen.getByText(/WAV/i)).toBeInTheDocument()
  })

  it('should fill the waveform completely once the file is saved', () => {
    const { container } = render(
      <DownloadCard download={makeDownload({ status: 'completed' })} />
    )
    const bars = container.querySelectorAll('rect')
    const lit = container.querySelectorAll('rect[data-lit]')

    expect(lit.length).toBe(bars.length)
  })

  it('should not claim progress a failed download never made', () => {
    // A failed job used to render a fully lit waveform, implying it finished.
    const { container } = render(
      <DownloadCard download={makeDownload({ status: 'failed', error: 'nope' })} />
    )

    expect(container.querySelectorAll('rect[data-lit]').length).toBe(0)
  })
})
