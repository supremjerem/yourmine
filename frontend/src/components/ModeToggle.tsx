import type { DownloadMode } from '../types'

interface ModeToggleProps {
  mode: DownloadMode
  onModeChange: (mode: DownloadMode) => void
}

function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div
      className="mode-toggle"
      role="group"
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
    </div>
  )
}

export default ModeToggle
