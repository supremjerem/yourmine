# End-to-end tests

Playwright tests driving the real UI against a running backend. 26 tests across
5 files.

> **CI runs against a simulated downloader.**
>
> YouTube answers datacenter IP addresses with "Sign in to confirm you're not a
> bot", so a GitHub runner can never complete a real download. The CI job sets
> `YOURMINE_FAKE_DOWNLOADS=1`, which swaps in `backend/fake_downloader.py`: it
> reports the same progress sequence and writes a small placeholder file,
> without touching the network.
>
> Two video IDs are treated as sentinels meaning "unavailable", so the tests
> that assert on failure handling still work: any ID starting with `invalid`,
> and any ID made of a single repeated character (`aaaaaaaaaaa`).
>
> Locally the suite uses the real downloader by default, so it still exercises
> yt-dlp end to end. If YouTube rate-limits you (`HTTP 403`), run it the way CI
> does: `YOURMINE_FAKE_DOWNLOADS=1 npx playwright test`.

## Files

| File | Tests | Covers |
|---|---|---|
| [ui-navigation.spec.ts](ui-navigation.spec.ts) | 7 | Header, input mode toggle, format selection, session/earlier tabs, ARIA attributes |
| [downloads-single.spec.ts](downloads-single.spec.ts) | 4 | Single MP3 and WAV downloads, progress display, move to history on completion |
| [downloads-batch.spec.ts](downloads-batch.spec.ts) | 2 | Batch downloads in both formats |
| [feedback-validation.spec.ts](feedback-validation.spec.ts) | 5 | Failed downloads, non-YouTube URL rejection, disabled submit, history persistence and clearing |
| [edge-cases.spec.ts](edge-cases.spec.ts) | 8 | Empty and comment-only input, field clearing, loading state, error toasts and in-row errors |

## Running

```bash
# Everything (starts both servers itself)
npx playwright test

# With a visible browser
npx playwright test --headed

# One test by name
npx playwright test --grep "should start a single MP3"

# Open the HTML report
npx playwright show-report
```

`playwright.config.js` starts the Vite dev server and the backend automatically
and reuses them if they are already running.

## Selector conventions

Prefer, in this order:

1. **Roles and accessible names** — `getByRole('button', { name: 'Rip' })`.
   These assert the accessibility contract at the same time.
2. **`data-testid`** — for elements with no meaningful role, such as
   `download-card`, `status-badge`, `toast-success`, `empty-state`.

Do **not** select on CSS class names. Components use CSS Modules, so class
names are hashed at build time and change between builds.
