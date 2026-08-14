import styles from './Segmented.module.css'
import type { AudioFormat } from '../types'

interface FormatSelectorProps {
  readonly format: AudioFormat
  readonly onFormatChange: (format: AudioFormat) => void
}

function FormatSelector({ format, onFormatChange }: FormatSelectorProps) {
  return (
    <fieldset className={styles.group} aria-label="Audio format selection">
      <span className={styles.legend}>Format</span>

      <label className={styles.radioOption}>
        <input
          type="radio"
          name="format"
          value="mp3"
          checked={format === 'mp3'}
          onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
          aria-label="MP3 lossy format"
        />
        <span className={styles.mark}>
          MP3 <span className={styles.qualifier}>192 kbps</span>
        </span>
      </label>

      <label className={styles.radioOption}>
        <input
          type="radio"
          name="format"
          value="wav"
          checked={format === 'wav'}
          onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
          aria-label="WAV lossless format"
        />
        <span className={styles.mark}>
          WAV <span className={styles.qualifier}>lossless</span>
        </span>
      </label>
    </fieldset>
  )
}

export default FormatSelector
