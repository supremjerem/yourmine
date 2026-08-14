# 2. Report progress by polling rather than WebSockets

Date: 2026-08-14

## Status

Accepted

## Context

The UI shows live download progress: a percentage, a transfer speed, and a
waveform that fills as the file arrives. Getting that from the backend to the
browser can be done by polling `GET /downloads`, by Server-Sent Events, or by a
WebSocket.

yt-dlp reports progress through a synchronous callback on a worker thread, so
any push-based transport needs a bridge from that thread onto the event loop.
Downloads are also short — seconds to a couple of minutes — and a user rarely
has more than a handful running at once.

## Decision

Poll `GET /downloads` once per second from the frontend while any download is
still active, and stop polling entirely once every job has reached a terminal
state.

## Consequences

- The backend stays simple: no connection lifecycle, no reconnection handling,
  no thread-to-event-loop bridging. Progress callbacks just write to the store.
- One request per second while downloading is negligible for a tool talking to
  `localhost`, and the cost drops to zero when nothing is running.
- Progress is up to one second stale. At a 1s cadence against a progress bar,
  this is not perceptible.
- Jobs started outside the current browser tab do not appear until the page is
  reloaded, because polling only runs when the tab already knows about an active
  download. This is a real limitation and an accepted one for a single-user tool.
- If Yourmine ever grows multi-user or long-running jobs (playlists, large
  batches), SSE becomes the better fit — it is one-directional, which is all
  this needs, and it avoids the staleness and idle-tab issues above.
