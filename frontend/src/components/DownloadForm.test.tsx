import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DownloadForm from './DownloadForm'

/**
 * These queries are all role- and label-based, so they describe the form's
 * behaviour rather than its markup and survive a restyle.
 */
function renderForm(overrides = {}) {
  const props = {
    mode: 'single' as const,
    url: '',
    urls: '',
    loading: false,
    onUrlChange: vi.fn(),
    onUrlsChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    ...overrides
  }
  render(<DownloadForm {...props} />)
  return props
}

describe('single mode', () => {
  it('should offer a single url field', () => {
    renderForm()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should report what the user typed', async () => {
    const user = userEvent.setup()
    const props = renderForm()

    await user.type(screen.getByRole('textbox'), 'h')

    expect(props.onUrlChange).toHaveBeenCalledWith('h')
  })

  it('should disable submission while the field is empty', () => {
    renderForm({ url: '' })
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should disable submission for whitespace only', () => {
    renderForm({ url: '   ' })
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should enable submission once a url is present', () => {
    renderForm({ url: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('should submit the form when the action is used', async () => {
    const user = userEvent.setup()
    const props = renderForm({ url: 'https://youtu.be/dQw4w9WgXcQ' })

    await user.click(screen.getByRole('button'))

    expect(props.onSubmit).toHaveBeenCalled()
  })
})

describe('batch mode', () => {
  it('should offer a multi-line field', () => {
    renderForm({ mode: 'batch' })
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('should enable submission once urls are present', () => {
    renderForm({ mode: 'batch', urls: 'https://youtu.be/dQw4w9WgXcQ' })
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('should report what the user typed', async () => {
    const user = userEvent.setup()
    const props = renderForm({ mode: 'batch' })

    await user.type(screen.getByRole('textbox'), 'x')

    expect(props.onUrlsChange).toHaveBeenCalledWith('x')
  })
})

describe('while a request is in flight', () => {
  it('should disable the input', () => {
    renderForm({ url: 'https://youtu.be/dQw4w9WgXcQ', loading: true })
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('should disable the action', () => {
    renderForm({ url: 'https://youtu.be/dQw4w9WgXcQ', loading: true })
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
