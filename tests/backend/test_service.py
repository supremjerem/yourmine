"""Tests for download orchestration, with the downloader injected as a fake."""

import asyncio
import tempfile
import time
from pathlib import Path

import pytest

from backend.models import AudioFormat, DownloadState
from backend.service import DownloadService
from backend.store import DownloadStore

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def build_service(
    download_fn, max_concurrent: int = 3
) -> tuple[DownloadService, DownloadStore]:
    """Wire a service against a fresh store and the given download function."""
    store = DownloadStore(max_jobs=100)
    service = DownloadService(
        store=store,
        output_dir=Path(tempfile.mkdtemp()),
        download_fn=download_fn,
        max_concurrent=max_concurrent,
    )
    return service, store


class TestJobCreation:
    def test_should_create_a_queued_job(self, successful_download):
        service, _ = build_service(successful_download)

        job = service.create_job(URL, AudioFormat.MP3)

        assert job.status == DownloadState.QUEUED
        assert job.url == URL
        assert job.format == AudioFormat.MP3

    def test_should_store_the_created_job(self, successful_download):
        service, store = build_service(successful_download)

        job = service.create_job(URL, AudioFormat.WAV)

        assert store.get(job.id) == job

    def test_should_give_each_job_a_unique_id(self, successful_download):
        service, _ = build_service(successful_download)

        ids = {service.create_job(URL, AudioFormat.MP3).id for _ in range(5)}

        assert len(ids) == 5


@pytest.mark.asyncio
class TestProcessing:
    async def test_should_mark_a_successful_download_completed(
        self, successful_download
    ):
        service, store = build_service(successful_download)
        job = service.create_job(URL, AudioFormat.MP3)

        await service._process(job.id, job.url, job.format)

        stored = store.get(job.id)
        assert stored.status == DownloadState.COMPLETED
        assert stored.title == "Test Video"
        assert stored.filename == "Test Video.mp3"

    async def test_should_mark_a_failed_download_failed_with_its_error(
        self, failing_download
    ):
        service, store = build_service(failing_download)
        job = service.create_job(URL, AudioFormat.MP3)

        await service._process(job.id, job.url, job.format)

        stored = store.get(job.id)
        assert stored.status == DownloadState.FAILED
        assert stored.error == "Video unavailable"

    async def test_should_record_progress_reported_by_the_downloader(
        self, successful_download
    ):
        service, store = build_service(successful_download)
        job = service.create_job(URL, AudioFormat.MP3)

        await service._process(job.id, job.url, job.format)

        assert store.get(job.id).progress.percent == "50.0%"

    async def test_should_pass_the_requested_format_to_the_downloader(self):
        seen = {}

        def capture(url, output_dir, audio_format, progress_callback=None):
            seen["format"] = audio_format
            return {"success": True, "title": "T", "filename": "T.wav", "format": "wav"}

        service, _ = build_service(capture)
        job = service.create_job(URL, AudioFormat.WAV)

        await service._process(job.id, job.url, job.format)

        assert seen["format"] == "wav"

    async def test_should_survive_its_job_being_evicted_mid_download(
        self, successful_download
    ):
        """Eviction while a download is in flight must not crash the task."""
        service, store = build_service(successful_download)
        job = service.create_job(URL, AudioFormat.MP3)
        store._jobs.clear()

        await service._process(job.id, job.url, job.format)


@pytest.mark.asyncio
class TestConcurrencyLimit:
    async def test_should_not_run_more_downloads_than_the_limit_allows(self):
        """A large batch must not saturate the executor."""
        running = 0
        peak = 0

        def slow_download(url, output_dir, audio_format, progress_callback=None):
            nonlocal running, peak
            running += 1
            peak = max(peak, running)
            time.sleep(0.05)
            running -= 1
            return {"success": True, "title": "T", "filename": "T.mp3", "format": "mp3"}

        service, _ = build_service(slow_download, max_concurrent=2)
        jobs = [service.create_job(URL, AudioFormat.MP3) for _ in range(6)]

        await asyncio.gather(*(service._process(j.id, j.url, j.format) for j in jobs))

        assert peak <= 2
