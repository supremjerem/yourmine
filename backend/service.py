"""
Download orchestration.

This layer owns the job lifecycle and knows nothing about HTTP: it takes URLs,
schedules work, and reports state through the store. Keeping it free of FastAPI
is what makes it testable without a running server.
"""

import asyncio
import logging
import uuid
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from backend.models import AudioFormat, DownloadJob, DownloadProgress, DownloadState
from backend.store import DownloadStore

logger = logging.getLogger(__name__)

# Signature of the download function this service depends on. Injecting it
# rather than importing the concrete one keeps yt-dlp out of the unit tests.
DownloadFn = Callable[[str, str, str, Callable[[dict], None] | None], dict]

# Progress statuses that also advance the job's own state.
_PROGRESS_STATES = {
    "downloading": DownloadState.DOWNLOADING,
    "extracting": DownloadState.EXTRACTING,
    "converting": DownloadState.CONVERTING,
}


class DownloadService:
    """Schedules downloads and tracks their progress in a `DownloadStore`."""

    def __init__(
        self,
        store: DownloadStore,
        output_dir: Path,
        download_fn: DownloadFn,
        max_concurrent: int = 3,
    ) -> None:
        """
        Args:
            store: Where job state is recorded.
            output_dir: Directory finished files are written to.
            download_fn: The blocking download implementation to run.
            max_concurrent: Ceiling on simultaneous downloads.
        """
        self._store = store
        self._output_dir = output_dir
        self._download_fn = download_fn
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._tasks: set[asyncio.Task] = set()

    def create_job(self, url: str, audio_format: AudioFormat) -> DownloadJob:
        """Register a queued job for `url` and return it."""
        job = DownloadJob(
            id=str(uuid.uuid4()),
            status=DownloadState.QUEUED,
            url=url,
            format=audio_format,
            created_at=datetime.now().isoformat(),
        )
        self._store.add(job)
        return job

    def schedule(self, job: DownloadJob) -> None:
        """Start processing a job in the background."""
        task = asyncio.create_task(self._process(job.id, job.url, job.format))
        # Hold a reference so the task is not garbage-collected mid-flight.
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _process(self, job_id: str, url: str, audio_format: AudioFormat) -> None:
        """Run one download to completion, recording progress as it goes."""

        def on_progress(data: dict) -> None:
            fields: dict[str, object] = {"progress": DownloadProgress(**data)}
            state = _PROGRESS_STATES.get(str(data.get("status")))
            if state is not None:
                fields["status"] = state
            self._store.update(job_id, **fields)

        # The semaphore bounds how many downloads run at once, so a large
        # batch cannot saturate the executor and stall every other request.
        async with self._semaphore:
            self._store.update(job_id, status=DownloadState.PROCESSING)

            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                self._download_fn,
                url,
                str(self._output_dir),
                audio_format.value,
                on_progress,
            )

        if result["success"]:
            logger.info("Download completed: %s", result["title"])
            self._store.update(
                job_id,
                status=DownloadState.COMPLETED,
                title=result["title"],
                filename=result["filename"],
            )
        else:
            logger.warning("Download failed for %s: %s", url, result["error"])
            self._store.update(
                job_id,
                status=DownloadState.FAILED,
                error=result["error"],
            )
