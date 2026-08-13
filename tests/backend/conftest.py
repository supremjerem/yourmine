"""
Shared pytest fixtures for the backend test suite.

The output directory is redirected to a temporary path *before* any backend
module is imported, so importing the app never touches the real ~/Downloads.
"""

import os
import tempfile

# Must run before `backend.api` is imported: Settings reads the environment at
# module import time.
_TEST_OUTPUT_DIR = tempfile.mkdtemp(prefix="yourmine-tests-")
os.environ.setdefault("YOURMINE_OUTPUT_DIR", _TEST_OUTPUT_DIR)

import pytest  # noqa: E402

from backend.models import AudioFormat, DownloadJob, DownloadState  # noqa: E402
from backend.store import DownloadStore  # noqa: E402


@pytest.fixture
def store() -> DownloadStore:
    """An empty job store with a small cap, so eviction is easy to exercise."""
    return DownloadStore(max_jobs=3)


@pytest.fixture
def make_job():
    """Factory producing download jobs with sensible defaults."""

    def _make(
        job_id: str = "job-1",
        status: DownloadState = DownloadState.QUEUED,
        url: str = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ) -> DownloadJob:
        return DownloadJob(
            id=job_id,
            status=status,
            url=url,
            format=AudioFormat.MP3,
            created_at="2026-01-01T00:00:00",
        )

    return _make


@pytest.fixture
def successful_download():
    """A download_fn stand-in that always succeeds."""

    def _download(url, output_dir, audio_format, progress_callback=None):
        if progress_callback:
            progress_callback({"status": "downloading", "percent": "50.0%"})
        return {
            "success": True,
            "title": "Test Video",
            "filename": f"Test Video.{audio_format}",
            "format": audio_format,
        }

    return _download


@pytest.fixture
def failing_download():
    """A download_fn stand-in that always fails."""

    def _download(url, output_dir, audio_format, progress_callback=None):
        return {"success": False, "error": "Video unavailable", "url": url}

    return _download
