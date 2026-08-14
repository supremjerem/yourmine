"""
Request and response models, plus the download state machine.

`DownloadState` is the single source of truth for status values. The frontend's
`DownloadStatusType` union mirrors it, and a test asserts the two stay in step.
"""

from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

from backend.validation import InvalidYouTubeUrlError, extract_video_id


class DownloadState(StrEnum):
    """Lifecycle of a download job, in the order states are entered."""

    QUEUED = "queued"
    PROCESSING = "processing"
    EXTRACTING = "extracting"
    DOWNLOADING = "downloading"
    CONVERTING = "converting"
    COMPLETED = "completed"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        """True once the job will not change state again."""
        return self in (DownloadState.COMPLETED, DownloadState.FAILED)


class AudioFormat(StrEnum):
    """Supported output audio formats."""

    MP3 = "mp3"
    WAV = "wav"


def _validate_youtube_url(url: str) -> str:
    """Pydantic validator wrapper that reports errors in Pydantic's idiom."""
    try:
        extract_video_id(url)
    except InvalidYouTubeUrlError as exc:
        raise ValueError(str(exc)) from exc
    return url


# A URL string proven to point at a YouTube video before it reaches yt-dlp.
YouTubeUrl = Annotated[
    str,
    Field(max_length=2048),
    AfterValidator(_validate_youtube_url),
]


class DownloadRequest(BaseModel):
    """Request body for a single download."""

    url: YouTubeUrl
    format: AudioFormat = AudioFormat.MP3


class BatchDownloadRequest(BaseModel):
    """Request body for a batch download."""

    # The cap is enforced here so an oversized batch is rejected before any
    # work is scheduled. The runtime limit lives in Settings.max_batch_size.
    urls: list[YouTubeUrl] = Field(min_length=1)
    format: AudioFormat = AudioFormat.MP3


class DownloadProgress(BaseModel):
    """Progress snapshot reported by the downloader."""

    status: str | None = None
    percent: str | None = None
    speed: str | None = None
    eta: str | None = None
    message: str | None = None


class DownloadJob(BaseModel):
    """A download job as exposed by the API."""

    id: str
    status: DownloadState
    url: str
    format: AudioFormat
    title: str | None = None
    filename: str | None = None
    error: str | None = None
    progress: DownloadProgress | None = None
    created_at: str


class BatchDownloadResponse(BaseModel):
    """Result of scheduling a batch."""

    batch_id: str
    download_ids: list[str]
    total: int


class DownloadListResponse(BaseModel):
    """All known download jobs."""

    downloads: list[DownloadJob]
    total: int
