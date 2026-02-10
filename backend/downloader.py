"""
YouTube downloader module - Core download logic.

This module provides functionality to download YouTube videos and convert
them to various audio formats using yt-dlp.
"""
from pathlib import Path
from typing import Callable, Dict, Optional

import yt_dlp


DEFAULT_MP3_QUALITY: str = "192"


def _build_postprocessors(audio_format: str) -> list[dict]:
    """Build yt-dlp postprocessor config for the given audio format."""
    if audio_format == "wav":
        return [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'wav'}]
    return [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': DEFAULT_MP3_QUALITY,
    }]


def _make_progress_hook(
    progress_callback: Optional[Callable[[Dict], None]]
) -> tuple[Callable, list[bool]]:
    """Create a yt-dlp progress hook and a shared download-complete flag."""
    download_complete = [False]

    def progress_hook(d: Dict) -> None:
        if d['status'] == 'downloading' and progress_callback:
            progress_callback({
                'status': 'downloading',
                'percent': d.get('_percent_str', '0%'),
                'speed': d.get('_speed_str', 'N/A'),
                'eta': d.get('_eta_str', 'N/A')
            })
        elif d['status'] == 'finished':
            download_complete[0] = True
            if progress_callback:
                progress_callback({
                    'status': 'converting',
                    'percent': '10%',
                    'message': 'Starting conversion...'
                })

    return progress_hook, download_complete


def _make_postprocessor_hook(
    progress_callback: Optional[Callable[[Dict], None]],
    download_complete: list[bool]
) -> Callable:
    """Create a yt-dlp post-processor hook."""
    def postprocessor_hook(d: Dict) -> None:
        if progress_callback and download_complete[0] and d['status'] == 'started':
            progress_callback({
                'status': 'converting',
                'percent': '50%',
                'message': 'Converting to audio...'
            })
    return postprocessor_hook


def download_audio(
    youtube_url: str,
    output_dir: str = ".",
    audio_format: str = "mp3",
    progress_callback: Optional[Callable[[Dict], None]] = None
) -> Dict[str, str | bool]:
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
            - filename (str): Output filename (if successful).
            - format (str): Audio format used (if successful).
            - error (str): Error message (if failed).
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
        'format': 'bestaudio/best',
        'postprocessors': postprocessors,
        'outtmpl': str(Path(output_dir) / '%(title)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'progress_hooks': [progress_hook],
        'postprocessor_hooks': [postprocessor_hook],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            if progress_callback:
                progress_callback({'status': 'extracting', 'url': youtube_url})

            info = ydl.extract_info(youtube_url, download=True)
            filename = f"{info['title']}.{audio_format}"

            if progress_callback:
                progress_callback({'status': 'complete', 'title': info['title']})

            return {
                'success': True,
                'title': info['title'],
                'filename': filename,
                'format': audio_format
            }
    except yt_dlp.utils.DownloadError as e:
        return {
            'success': False,
            'error': f"Download error: {str(e)}",
            'url': youtube_url
        }
    except yt_dlp.utils.ExtractorError as e:
        return {
            'success': False,
            'error': f"Extractor error: {str(e)}",
            'url': youtube_url
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"Unexpected error: {str(e)}",
            'url': youtube_url
        }
