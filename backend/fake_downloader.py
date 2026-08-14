"""
Simulated downloader, for exercising the app without contacting YouTube.

Enabled only by YOURMINE_FAKE_DOWNLOADS. It exists because CI runners have
datacenter IP addresses, which YouTube refuses with "Sign in to confirm you're
not a bot" — so the end-to-end suite cannot depend on real downloads there.

This module never performs network I/O. It reports plausible progress and
writes a small placeholder file, so "saved to your Downloads folder" stays
true from the UI's point of view.
"""

import logging
import time
from collections.abc import Callable
from pathlib import Path

from backend.validation import InvalidYouTubeUrlError, extract_video_id

logger = logging.getLogger(__name__)

# Roughly 2.5s end to end: long enough for the 1s poll to observe progress,
# short enough not to dominate the test suite.
STEP_DELAY_SECONDS = 0.35
PROGRESS_STEPS = (12.5, 31.0, 54.5, 78.0, 96.5)

PLACEHOLDER_BYTES = 1024

ERROR_UNAVAILABLE = "Video unavailable, private, or region-restricted"
ERROR_WRITE_FAILED = "Could not write the output file"


def _simulates_failure(video_id: str) -> bool:
    """
    Whether this ID is a test sentinel meaning "unavailable".

    Real YouTube IDs are effectively random, so neither shape occurs naturally:
    an ID announcing itself as invalid, or one made of a single repeated
    character. Tests that assert on failure handling use these.
    """
    return video_id.startswith("invalid") or len(set(video_id)) == 1


def fake_download_audio(
    youtube_url: str,
    output_dir: str = ".",
    audio_format: str = "mp3",
    progress_callback: Callable[[dict], None] | None = None,
) -> dict[str, str | bool]:
    """
    Simulate `download_audio` without touching the network.

    Matches the real downloader's signature and return shape exactly, so the
    service layer cannot tell them apart.

    Args:
        youtube_url: The URL that would have been downloaded.
        output_dir: Where the placeholder file is written.
        audio_format: Target audio format, used for the file extension.
        progress_callback: Receives the same progress dictionaries the real
            downloader emits.

    Returns:
        The same dictionary shape as `download_audio`.
    """
    try:
        video_id = extract_video_id(youtube_url)
    except InvalidYouTubeUrlError:
        video_id = "unknown"

    if progress_callback:
        progress_callback({"status": "extracting", "url": youtube_url})
    time.sleep(STEP_DELAY_SECONDS)

    if _simulates_failure(video_id):
        logger.info("Fake downloader reporting %s as unavailable", video_id)
        return {"success": False, "error": ERROR_UNAVAILABLE, "url": youtube_url}

    for percent in PROGRESS_STEPS:
        if progress_callback:
            progress_callback(
                {
                    "status": "downloading",
                    "percent": f"{percent:.1f}%",
                    "speed": "8.42MiB/s",
                    "eta": "00:01",
                }
            )
        time.sleep(STEP_DELAY_SECONDS)

    if progress_callback:
        progress_callback(
            {
                "status": "converting",
                "percent": "50%",
                "message": "Converting to audio...",
            }
        )
    time.sleep(STEP_DELAY_SECONDS)

    title = f"Test video {video_id}"
    filename = f"{title}.{audio_format}"

    try:
        destination = Path(output_dir)
        destination.mkdir(parents=True, exist_ok=True)
        (destination / filename).write_bytes(b"\0" * PLACEHOLDER_BYTES)
    except OSError as exc:
        logger.warning("Fake downloader could not write %s: %s", filename, exc)
        return {"success": False, "error": ERROR_WRITE_FAILED, "url": youtube_url}

    if progress_callback:
        progress_callback({"status": "complete", "title": title})

    return {
        "success": True,
        "title": title,
        "filename": filename,
        "format": audio_format,
    }
