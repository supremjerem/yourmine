"""
YouTube downloader module - Core download logic.

This module provides functionality to download YouTube videos and convert
them to various audio formats using yt-dlp.
"""

import logging
from collections.abc import Callable
from pathlib import Path

import yt_dlp

from backend.playlist import PlaylistContents, PlaylistExpansionError
from backend.validation import VIDEO_ID_PATTERN

logger = logging.getLogger(__name__)

DEFAULT_MP3_QUALITY: str = "192"

# Messages returned to callers. Raw yt-dlp text is logged but never returned:
# it leaks local filesystem paths and internals to the client.
ERROR_UNAVAILABLE = "Video unavailable, private, or region-restricted"
ERROR_EXTRACT = "Could not read this video's details"
ERROR_UNEXPECTED = "Download failed unexpectedly"
ERROR_PLAYLIST_UNAVAILABLE = "Playlist unavailable, private, or empty"
ERROR_PLAYLIST_UNEXPECTED = "Could not read this playlist"


def _build_postprocessors(audio_format: str) -> list[dict]:
    """Build yt-dlp postprocessor config for the given audio format."""
    if audio_format == "wav":
        return [{"key": "FFmpegExtractAudio", "preferredcodec": "wav"}]
    return [
        {
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": DEFAULT_MP3_QUALITY,
        }
    ]


def _make_progress_hook(
    progress_callback: Callable[[dict], None] | None,
) -> tuple[Callable, list[bool]]:
    """Create a yt-dlp progress hook and a shared download-complete flag."""
    download_complete = [False]

    def progress_hook(d: dict) -> None:
        if d["status"] == "downloading" and progress_callback:
            progress_callback(
                {
                    "status": "downloading",
                    "percent": d.get("_percent_str", "0%"),
                    "speed": d.get("_speed_str", "N/A"),
                    "eta": d.get("_eta_str", "N/A"),
                }
            )
        elif d["status"] == "finished":
            download_complete[0] = True
            if progress_callback:
                progress_callback(
                    {
                        "status": "converting",
                        "percent": "10%",
                        "message": "Starting conversion...",
                    }
                )

    return progress_hook, download_complete


def _make_postprocessor_hook(
    progress_callback: Callable[[dict], None] | None,
    download_complete: list[bool],
) -> Callable:
    """Create a yt-dlp post-processor hook."""

    def postprocessor_hook(d: dict) -> None:
        if progress_callback and download_complete[0] and d["status"] == "started":
            progress_callback(
                {
                    "status": "converting",
                    "percent": "50%",
                    "message": "Converting to audio...",
                }
            )

    return postprocessor_hook


def _resolve_filename(info: dict, audio_format: str) -> str:
    """
    Determine the name of the file actually written to disk.

    yt-dlp sanitizes titles when building filenames, so reconstructing the name
    from `info['title']` reports something that may not exist on disk. Prefer
    the path yt-dlp reports for the post-processed file, and fall back to the
    reconstructed name only when that is unavailable.
    """
    for download in info.get("requested_downloads") or []:
        filepath = download.get("filepath")
        if filepath:
            return Path(filepath).name

    return f"{info['title']}.{audio_format}"


def download_audio(
    youtube_url: str,
    output_dir: str = ".",
    audio_format: str = "mp3",
    progress_callback: Callable[[dict], None] | None = None,
) -> dict[str, str | bool]:
    """
    Download a YouTube video and convert it to the specified audio format.

    Downloads the audio track from a YouTube video and converts it to either
    MP3 (lossy, smaller file size) or WAV (lossless, larger file size) format.

    Args:
        youtube_url: The YouTube video URL to download.
        output_dir: The output directory for the downloaded file.
            Defaults to current directory.
        audio_format: Target audio format, either 'mp3' or 'wav'.
            Defaults to 'mp3'.
        progress_callback: Optional callback function that receives progress
            updates as a dictionary with 'status', 'percent', 'speed', etc.

    Returns:
        A dictionary containing:
            - success (bool): Whether the download was successful.
            - title (str): Video title (if successful).
            - filename (str): Name of the file written (if successful).
            - format (str): Audio format used (if successful).
            - error (str): User-facing error message (if failed).
            - url (str): The original URL (if failed).

    Raises:
        No exceptions are raised; errors are returned in the result dict.

    Example:
        >>> result = download_audio(
        ...     "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ...     output_dir="~/Music",
        ...     audio_format="mp3"
        ... )
        >>> if result['success']:
        ...     print(f"Downloaded: {result['title']}")
    """
    postprocessors = _build_postprocessors(audio_format)
    progress_hook, download_complete = _make_progress_hook(progress_callback)
    postprocessor_hook = _make_postprocessor_hook(progress_callback, download_complete)

    ydl_opts = {
        "format": "bestaudio/best",
        "postprocessors": postprocessors,
        "outtmpl": str(Path(output_dir) / "%(title)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "progress_hooks": [progress_hook],
        "postprocessor_hooks": [postprocessor_hook],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            if progress_callback:
                progress_callback({"status": "extracting", "url": youtube_url})

            info = ydl.extract_info(youtube_url, download=True)
            filename = _resolve_filename(info, audio_format)

            if progress_callback:
                progress_callback({"status": "complete", "title": info["title"]})

            return {
                "success": True,
                "title": info["title"],
                "filename": filename,
                "format": audio_format,
            }
    except yt_dlp.utils.DownloadError as exc:
        logger.warning("yt-dlp download error for %s: %s", youtube_url, exc)
        return {"success": False, "error": ERROR_UNAVAILABLE, "url": youtube_url}
    except yt_dlp.utils.ExtractorError as exc:
        logger.warning("yt-dlp extractor error for %s: %s", youtube_url, exc)
        return {"success": False, "error": ERROR_EXTRACT, "url": youtube_url}
    except Exception:
        logger.exception("Unexpected error downloading %s", youtube_url)
        return {"success": False, "error": ERROR_UNEXPECTED, "url": youtube_url}


def list_playlist_videos(playlist_url: str, limit: int) -> PlaylistContents:
    """
    List the videos in a YouTube playlist without downloading anything.

    Asks yt-dlp for one entry more than `limit` so a playlist that is exactly
    `limit` long can be told apart from one that was cut short.

    Args:
        playlist_url: A validated YouTube playlist URL.
        limit: Maximum number of videos to return.

    Returns:
        The video URLs found (at most `limit`) and whether the list was cut.

    Raises:
        PlaylistExpansionError: If the playlist cannot be read or has no
            downloadable videos. The message is safe to show to users.
    """
    ydl_opts = {
        # Flat extraction reads the playlist page only, not each video page.
        "extract_flat": "in_playlist",
        "playlistend": limit + 1,
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
    except yt_dlp.utils.YoutubeDLError as exc:
        logger.warning("yt-dlp playlist error for %s: %s", playlist_url, exc)
        raise PlaylistExpansionError(ERROR_PLAYLIST_UNAVAILABLE) from exc
    except Exception as exc:
        logger.exception("Unexpected error reading playlist %s", playlist_url)
        raise PlaylistExpansionError(ERROR_PLAYLIST_UNEXPECTED) from exc

    # Unavailable videos come back as None or without a usable ID. Rebuilding
    # the URL from a validated ID keeps entry URLs from yt-dlp out of the queue.
    video_ids = [
        entry["id"]
        for entry in (info or {}).get("entries") or []
        if entry and VIDEO_ID_PATTERN.match(str(entry.get("id", "")))
    ]
    if not video_ids:
        raise PlaylistExpansionError(ERROR_PLAYLIST_UNAVAILABLE)

    return PlaylistContents(
        video_urls=[
            f"https://www.youtube.com/watch?v={video_id}"
            for video_id in video_ids[:limit]
        ],
        truncated=len(video_ids) > limit,
    )
