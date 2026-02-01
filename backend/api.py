"""
FastAPI Backend for Yourmine YouTube Downloader
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import uvicorn
from pathlib import Path
import uuid
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import sys
import os

# Thread pool for parallel downloads
download_executor = ThreadPoolExecutor(max_workers=5)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.downloader import download_audio

app = FastAPI(title="Yourmine API", version="2.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage for download jobs
downloads = {}

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
    # Try Downloads folder first
    downloads_dir = Path.home() / "Downloads"
    try:
        downloads_dir.mkdir(exist_ok=True)
        # Test if we can write to it
        test_file = downloads_dir / ".test_write"
        test_file.touch()
        test_file.unlink()
        return downloads_dir
    except (PermissionError, OSError) as e:
        print(f"Cannot use Downloads folder: {e}")
    
    # Try Desktop as fallback
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
    
    # Last resort: home directory
    home_dir = Path.home()
    print(f"Using home directory: {home_dir}")
    return home_dir

OUTPUT_DIR = get_output_directory()
print(f"Output directory set to: {OUTPUT_DIR}")


class DownloadRequest(BaseModel):
    url: HttpUrl
    format: str = "mp3"


class BatchDownloadRequest(BaseModel):
    urls: List[HttpUrl]
    format: str = "mp3"
    max_workers: int = 3


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
    
    # Create download job
    downloads[download_id] = {
        'id': download_id,
        'status': 'queued',
        'url': str(request.url),
        'format': request.format,
        'created_at': datetime.now().isoformat(),
        'progress': None
    }
    
    # Start download in background
    background_tasks.add_task(process_download, download_id, str(request.url), request.format)
    
    return downloads[download_id]


@app.post("/download/batch")
async def create_batch_download(
    request: BatchDownloadRequest,
    background_tasks: BackgroundTasks
) -> dict:
    """
    Start multiple video downloads in parallel.

    Args:
        request: The batch download request containing URLs and format.
        background_tasks: FastAPI background tasks handler.

    Returns:
        dict: Batch information with download IDs and total count.
    """
    download_ids = []
    
    for url in request.urls:
        download_id = str(uuid.uuid4())
        downloads[download_id] = {
            'id': download_id,
            'status': 'queued',
            'url': str(url),
            'format': request.format,
            'created_at': datetime.now().isoformat(),
            'progress': None
        }
        download_ids.append(download_id)
    
    # Start all downloads in parallel using asyncio.create_task
    for download_id, url in zip(download_ids, request.urls):
        asyncio.create_task(process_download(download_id, str(url), request.format))
    
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
    return {
        'downloads': list(downloads.values()),
        'total': len(downloads)
    }


async def process_download(download_id: str, url: str, audio_format: str) -> None:
    """
    Background task to process a download.

    Downloads the video from the given URL and converts it to the specified
    audio format. Updates the download status throughout the process.

    Args:
        download_id: Unique identifier for this download job.
        url: The YouTube video URL to download.
        audio_format: Target audio format (mp3 or wav).
    """
    def update_progress(progress_data):
        if download_id in downloads:
            downloads[download_id]['progress'] = progress_data
            if progress_data.get('status') == 'downloading':
                downloads[download_id]['status'] = 'downloading'
            elif progress_data.get('status') == 'extracting':
                downloads[download_id]['status'] = 'extracting'
            elif progress_data.get('status') == 'converting':
                downloads[download_id]['status'] = 'converting'
    
    # Update status to processing
    downloads[download_id]['status'] = 'processing'
    
    # Run download in thread pool (yt-dlp is blocking)
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        download_audio,
        url,
        str(OUTPUT_DIR),
        audio_format,
        update_progress
    )
    
    # Update final status
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
