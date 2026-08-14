/**
 * Regenerate docs/screenshot.png for the README.
 *
 * The download list is stubbed at the network layer so the shot always shows
 * the same representative states — one downloading, one converting, one saved —
 * instead of depending on what YouTube happens to serve at capture time.
 *
 * Usage: node scripts/capture-screenshot.mjs
 * Requires the frontend on :3000 (`npm run dev --prefix frontend`).
 */
import { chromium } from 'playwright'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const OUTPUT = 'docs/screenshot.png'

const DOWNLOADS = [
  {
    id: 'b7f1c4a2-0d6e-4a91-8c3f-1e5a9d2b7c40',
    status: 'downloading',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
    format: 'mp3',
    title: 'Boards of Canada — Roygbiv',
    progress: { percent: '66.8%', speed: '12.22MiB/s' },
    created_at: '2026-08-14T09:00:00'
  },
  {
    id: '3c9e5d18-77b2-4f6a-9a01-c2d4e8f5a613',
    status: 'converting',
    url: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
    format: 'wav',
    title: 'Aphex Twin — Xtal',
    progress: { percent: '50.0%' },
    created_at: '2026-08-14T08:59:00'
  },
  {
    id: 'f042a7be-3e51-4c8d-b96f-5a7c1d0e2b84',
    status: 'completed',
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    format: 'wav',
    title: 'Burial — Archangel',
    filename: 'Burial - Archangel.wav',
    created_at: '2026-08-14T08:58:00'
  }
]

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1120, height: 780 },
  deviceScaleFactor: 2,
  // Freeze the playhead pulse so the capture is reproducible.
  reducedMotion: 'reduce'
})

await context.route('**/downloads', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ downloads: DOWNLOADS, total: DOWNLOADS.length })
  })
)

const page = await context.newPage()
await page.goto(APP_URL, { waitUntil: 'networkidle' })

// The stubbed jobs are not from this browser session, so they land under
// "Earlier" — switch to that tab before capturing.
await page.getByRole('button', { name: /Download history/ }).click()
await page.waitForSelector('[data-testid="download-card"]')
await page.waitForTimeout(800)

await page.screenshot({ path: OUTPUT })
console.log(`wrote ${OUTPUT}`)

await browser.close()
