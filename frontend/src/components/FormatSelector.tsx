import type { AudioFormat } from '../types'

interface FormatSelectorProps {
  readonly format: AudioFormat
  readonly onFormatChange: (format: AudioFormat) => void
}

function FormatSelector({ format, onFormatChange }: FormatSelectorProps) {
  return (
    <fieldset
      className="format-selector"
      aria-label="Audio format selection"
    >
      <label>
        <input
          type="radio"
          name="format"
          value="mp3"
          checked={format === 'mp3'}
          onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
          aria-label="MP3 lossy format"
        />
        <span>MP3 (Lossy)</span>
      </label>
      <label>
        <input
          type="radio"
          name="format"
          value="wav"
          checked={format === 'wav'}
          onChange={(e) => onFormatChange(e.target.value as AudioFormat)}
          aria-label="WAV lossless format"
        />
        <span>WAV (Lossless)</span>
      </label>
    </fieldset>
  )
}

export default FormatSelector
