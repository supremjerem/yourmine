import { memo, useMemo } from 'react'
import styles from './Waveform.module.css'

const BAR_COUNT = 72
const BAR_WIDTH = 2
const BAR_GAP = 1
const VIEW_HEIGHT = 40

const STRIDE = BAR_WIDTH + BAR_GAP
const VIEW_WIDTH = BAR_COUNT * STRIDE - BAR_GAP

export type WaveformTone = 'signal' | 'landed' | 'clipped' | 'idle'

interface WaveformProps {
  /** Seeds the shape. The same seed always draws the same waveform. */
  readonly seed: string
  /** How much of the waveform is filled, 0–1. */
  readonly progress?: number
  readonly tone?: WaveformTone
  /** Draw a flat line instead of a shape — silence rather than a signal. */
  readonly flat?: boolean
}

/** FNV-1a. Small, fast, and stable across runs — which is the point here. */
function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Mulberry32: a compact seeded PRNG, so a given seed yields a fixed shape. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build bar heights that read as audio rather than as noise.
 *
 * Three things separate this from a bar chart:
 *  - a slow envelope, so the clip swells and decays instead of sitting flat;
 *  - a low-biased grain, so quiet bars outnumber peaks the way real audio does;
 *  - light smoothing between neighbours, because audio is continuous and
 *    per-bar white noise reads as a hedge.
 *
 * The seeded RNG keeps every download's shape its own and stable across polls.
 */
function buildAmplitudes(seed: string, flat: boolean): number[] {
  if (flat) {
    return Array.from({ length: BAR_COUNT }, () => 0.04)
  }

  const random = seededRandom(hashSeed(seed))

  const raw = Array.from({ length: BAR_COUNT }, (_, index) => {
    const position = index / (BAR_COUNT - 1)
    // Two offset lobes give a less symmetrical, more song-like envelope.
    const envelope =
      0.55 * Math.sin(Math.PI * position) +
      0.45 * Math.sin(Math.PI * Math.min(1, position * 1.7))
    // Raising the sample to a power biases it low, creating sparse peaks.
    const grain = Math.pow(random(), 1.6)
    return envelope * (0.12 + 0.88 * grain)
  })

  return raw.map((value, index) => {
    const before = raw[index - 1] ?? value
    const after = raw[index + 1] ?? value
    const smoothed = value * 0.6 + (before + after) * 0.2
    return Math.min(1, Math.max(0.05, smoothed))
  })
}

/**
 * The download's progress, drawn as its waveform.
 *
 * Bars left of the playhead carry the meter colour; the rest stay unlit. A
 * finished download settles to a fully lit waveform, which is why the same
 * component serves as both progress bar and completion mark.
 *
 * Drawn as SVG with an explicit grid rather than flex children: at 72 bars,
 * subpixel flex distribution left neighbouring bars visibly different widths.
 */
function Waveform({
  seed,
  progress = 0,
  tone = 'signal',
  flat = false
}: WaveformProps) {
  const amplitudes = useMemo(() => buildAmplitudes(seed, flat), [seed, flat])
  const litUntil = Math.round(progress * BAR_COUNT)

  return (
    <svg
      className={styles.waveform}
      data-tone={tone}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {amplitudes.map((amplitude, index) => {
        const height = Math.max(1, amplitude * VIEW_HEIGHT)
        return (
          <rect
            // The index *is* the identity here: bars are fixed positions on a
            // meter, never reordered, inserted, or removed.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={styles.bar}
            data-lit={index < litUntil || undefined}
            x={index * STRIDE}
            y={(VIEW_HEIGHT - height) / 2}
            width={BAR_WIDTH}
            height={height}
          />
        )
      })}
    </svg>
  )
}

export default memo(Waveform)
