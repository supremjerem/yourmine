# 1. Keep download jobs in memory

Date: 2026-08-14

## Status

Accepted

## Context

Yourmine tracks the state of each download — queued, downloading, converting,
saved or failed — so the UI can show progress. That state has to live somewhere.

The obvious alternatives were SQLite (or another embedded database) and a plain
in-process dictionary. Jobs are only interesting while they run: once a file is
in `~/Downloads`, the record's remaining value is a line of history the user can
already see in their file manager. The tool is also single-user and local, so
there is no second process that needs to read the same state.

The original implementation used a module-level dictionary that was never
pruned, so every URL and title requested since start-up stayed in memory for as
long as the process lived.

## Decision

Keep jobs in an in-process, thread-safe, size-capped store (`backend/store.py`).

The store retains at most `YOURMINE_MAX_STORED_JOBS` (default 200) jobs and
evicts finished ones oldest-first when full. Jobs that are still running are
never evicted, since a background task is still writing to them; if every job is
active the store is allowed to exceed its cap rather than drop live work.

## Consequences

- Restarting the backend clears all history. For a local tool this is
  acceptable and arguably correct — the files themselves are the real output.
- Memory use is bounded, and old URLs and titles do not accumulate indefinitely.
- The frontend's "Earlier" list can reference jobs the backend has evicted, so
  it prunes its own cleared-ID list against what the backend still reports.
- If Yourmine ever needs history across restarts, or more than one process, this
  decision has to be revisited. `DownloadStore` is a narrow interface
  (`add`/`get`/`update`/`list_all`) specifically so a persistent implementation
  can replace it without touching the service or API layers.
