# End-to-end tests

Playwright tests driving the real UI against a running backend. 26 tests across
5 files.

> **Known flakiness: two tests download from YouTube for real.**
>
> `should auto-move to history when completed` (downloads-single) and
> `should clear all history when clicking Clear History button`
> (feedback-validation) both wait for a download to *finish*, so they pass only
> when YouTube actually serves the file. After a burst of runs YouTube starts
> returning `HTTP 403 Forbidden` and those two fail with no code change
> involved. Treat an isolated failure of those two as environmental and re-run.
>
> The durable fix is to let the backend run against a stub downloader under
> test. The seam already exists — `DownloadService` takes its `download_fn` as a
> constructor argument — so this only needs an environment variable selecting
> which one `lifespan` wires up.

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
