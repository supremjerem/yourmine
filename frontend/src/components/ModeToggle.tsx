import type { DownloadMode } from '../types'

interface ModeToggleProps {
  readonly mode: DownloadMode
  readonly onModeChange: (mode: DownloadMode) => void
}

function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <fieldset
      className="mode-toggle"
      aria-label="Download mode selection"
    >
      <button
        className={mode === 'single' ? 'active' : ''}
        onClick={() => onModeChange('single')}
        aria-pressed={mode === 'single'}
        aria-label="Single download mode"
        type="button"
      >
        Single Download
      </button>
      <button
        className={mode === 'batch' ? 'active' : ''}
        onClick={() => onModeChange('batch')}
        aria-pressed={mode === 'batch'}
        aria-label="Batch download mode"
        type="button"
      >
        Batch Download
      </button>
    </fieldset>
  )
}

export default ModeToggle
