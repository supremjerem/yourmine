import styles from './Segmented.module.css'
import type { DownloadMode } from '../types'

interface ModeToggleProps {
  readonly mode: DownloadMode
  readonly onModeChange: (mode: DownloadMode) => void
}

function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <fieldset className={styles.group} aria-label="Download mode selection">
      <span className={styles.legend}>Input</span>
      <button
        className={styles.option}
        data-active={mode === 'single' || undefined}
        onClick={() => onModeChange('single')}
        aria-pressed={mode === 'single'}
        aria-label="Single download mode"
        type="button"
      >
        One link
      </button>
      <button
        className={styles.option}
        data-active={mode === 'batch' || undefined}
        onClick={() => onModeChange('batch')}
        aria-pressed={mode === 'batch'}
        aria-label="Batch download mode"
        type="button"
      >
        Many links
      </button>
    </fieldset>
  )
}

export default ModeToggle
