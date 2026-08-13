"""
In-memory store for download jobs.

Downloads are ephemeral by design (see docs/adr/0001-in-memory-job-store.md),
but "ephemeral" still needs a ceiling: without eviction the store grows for as
long as the process lives, holding every URL and title ever requested.
"""

import threading
from collections import OrderedDict

from backend.models import DownloadJob


class DownloadStore:
    """
    Thread-safe, size-capped store of download jobs.

    Jobs are keyed by ID and kept in insertion order. When the store is full,
    finished jobs are evicted oldest-first; active jobs are never evicted,
    since something is still writing to them.
    """

    def __init__(self, max_jobs: int = 200) -> None:
        """
        Args:
            max_jobs: Maximum number of jobs to retain.
        """
        self._jobs: OrderedDict[str, DownloadJob] = OrderedDict()
        self._lock = threading.Lock()
        self._max_jobs = max_jobs

    def add(self, job: DownloadJob) -> None:
        """Store a new job, evicting old finished jobs if the store is full."""
        with self._lock:
            self._jobs[job.id] = job
            self._evict_if_needed()

    def get(self, job_id: str) -> DownloadJob | None:
        """Return a job by ID, or None if it is unknown or was evicted."""
        with self._lock:
            return self._jobs.get(job_id)

    def list_all(self) -> list[DownloadJob]:
        """Return every stored job, newest first."""
        with self._lock:
            return list(reversed(self._jobs.values()))

    def update(self, job_id: str, **fields: object) -> None:
        """
        Apply field updates to a job.

        Silently ignores unknown IDs: a job can be evicted while its download
        is still finishing, and that is not an error worth crashing a
        background task over.
        """
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            self._jobs[job_id] = job.model_copy(update=fields)

    def _evict_if_needed(self) -> None:
        """Drop the oldest finished jobs until the store is within its cap."""
        while len(self._jobs) > self._max_jobs:
            evictable = next(
                (
                    job_id
                    for job_id, job in self._jobs.items()
                    if job.status.is_terminal
                ),
                None,
            )
            if evictable is None:
                # Everything still in flight; let the store exceed its cap
                # rather than dropping a job that is actively being written.
                return
            del self._jobs[evictable]
