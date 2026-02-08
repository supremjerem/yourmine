"""
FastAPI Backend for Yourmine YouTube Downloader
"""
import asyncio
import threading
import uuid
from datetime import datetime
from typing import Literal, Optional

import uvicorn
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, HttpUrl

from backend.downloader import download_audio

app = FastAPI(title="Yourmine API", version="2.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Thread-safe storage for download jobs
downloads: dict = {}
downloads_lock = threading.Lock()


def get_output_directory() -> Path:
    """
    Get the best available directory for downloads.

    Tries directories in order of preference:
        1. ~/Downloads (creates if doesn't exist)
        2. ~/Desktop (if exists and writable)
        3. ~/ (home directory as last resort)

    Returns:
        Path: The path to the selected output directory.
    """
    downloads_dir = Path.home() / "Downloads"
    try:
        downloads_dir.mkdir(exist_ok=True)
        test_file = downloads_dir / ".test_write"
        test_file.touch()
        test_file.unlink()
        return downloads_dir
    except (PermissionError, OSError) as e:
        print(f"Cannot use Downloads folder: {e}")

    desktop_dir = Path.home() / "Desktop"
    if desktop_dir.exists() and desktop_dir.is_dir():
        try:
            test_file = desktop_dir / ".test_write"
            test_file.touch()
            test_file.unlink()
            print(f"Using Desktop folder: {desktop_dir}")
            return desktop_dir
        except (PermissionError, OSError):
            pass

    home_dir = Path.home()
    print(f"Using home directory: {home_dir}")
    return home_dir


OUTPUT_DIR = get_output_directory()
print(f"Output directory set to: {OUTPUT_DIR}")


AudioFormat = Literal["mp3", "wav"]


class DownloadRequest(BaseModel):
    url: HttpUrl
    format: AudioFormat = "mp3"


class BatchDownloadRequest(BaseModel):
    urls: list[HttpUrl]
    format: AudioFormat = "mp3"


class DownloadStatus(BaseModel):
    id: str
    status: str
    url: str
    format: str
    title: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    progress: Optional[dict] = None
    created_at: str


@app.get("/")
def root() -> dict:
    """
    Health check endpoint.

    Returns:
        dict: Status message indicating the API is running.
    """
    return {"status": "ok", "message": "Yourmine API is running"}


@app.post("/download", response_model=DownloadStatus)
async def create_download(
    request: DownloadRequest,
    background_tasks: BackgroundTasks
) -> dict:
    """
    Start a single video download.

    Args:
        request: The download request containing URL and format.
        background_tasks: FastAPI background tasks handler.

    Returns:
        dict: The created download job with status information.
    """
    download_id = str(uuid.uuid4())

    job = {
        'id': download_id,
        'status': 'queued',
        'url': str(request.url),
        'format': request.format,
        'created_at': datetime.now().isoformat(),
        'progress': None
    }
    with downloads_lock:
        downloads[download_id] = job

    background_tasks.add_task(
        process_download, download_id, str(request.url), request.format
    )

    return job


@app.post("/download/batch")
async def create_batch_download(
    request: BatchDownloadRequest,
) -> dict:
    """
    Start multiple video downloads in parallel.

    Args:
        request: The batch download request containing URLs and format.

    Returns:
        dict: Batch information with download IDs and total count.
    """
    download_ids = []

    for url in request.urls:
        download_id = str(uuid.uuid4())
        job = {
            'id': download_id,
            'status': 'queued',
            'url': str(url),
            'format': request.format,
            'created_at': datetime.now().isoformat(),
            'progress': None
        }
        with downloads_lock:
            downloads[download_id] = job
        download_ids.append(download_id)

    for download_id, url in zip(download_ids, request.urls):
        asyncio.create_task(
            process_download(download_id, str(url), request.format)
        )

    return {
        'batch_id': str(uuid.uuid4()),
        'download_ids': download_ids,
        'total': len(download_ids)
    }


@app.get("/downloads")
async def list_downloads() -> dict:
    """
    List all downloads.

    Returns:
        dict: All download jobs with their current status and total count.
    """
    with downloads_lock:
        items = list(downloads.values())
    return {
        'downloads': items,
        'total': len(items)
    }


async def process_download(
    download_id: str, url: str, audio_format: str
) -> None:
    """
    Background task to process a download.

    Args:
        download_id: Unique identifier for this download job.
        url: The YouTube video URL to download.
        audio_format: Target audio format (mp3 or wav).
    """
    def update_progress(progress_data: dict) -> None:
        with downloads_lock:
            if download_id in downloads:
                downloads[download_id]['progress'] = progress_data
                status = progress_data.get('status')
                if status in ('downloading', 'extracting', 'converting'):
                    downloads[download_id]['status'] = status

    with downloads_lock:
        downloads[download_id]['status'] = 'processing'

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        download_audio,
        url,
        str(OUTPUT_DIR),
        audio_format,
        update_progress
    )

    with downloads_lock:
        if result['success']:
            downloads[download_id].update({
                'status': 'completed',
                'title': result['title'],
                'filename': result['filename']
            })
        else:
            downloads[download_id].update({
                'status': 'failed',
                'error': result['error']
            })


if __name__ == "__main__":
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
