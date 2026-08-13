"""
FastAPI application for Yourmine.

This module owns the HTTP layer only: routing, status codes, and dependency
wiring. Job orchestration lives in `service.py` and state in `store.py`.
"""

import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.config import Settings, configure_logging
from backend.downloader import download_audio
from backend.models import (
    BatchDownloadRequest,
    BatchDownloadResponse,
    DownloadJob,
    DownloadListResponse,
    DownloadRequest,
)
from backend.service import DownloadService
from backend.store import DownloadStore

logger = logging.getLogger(__name__)

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Build the application's dependencies at startup.

    Resolving the output directory here rather than at import time keeps
    importing this module free of filesystem side effects.
    """
    configure_logging(settings.log_level)

    output_dir = settings.resolved_output_dir()
    logger.info("Output directory: %s", output_dir)

    store = DownloadStore(max_jobs=settings.max_stored_jobs)
    app.state.store = store
    app.state.service = DownloadService(
        store=store,
        output_dir=output_dir,
        download_fn=download_audio,
        max_concurrent=settings.max_concurrent_downloads,
    )
    yield


app = FastAPI(title="Yourmine API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_store(request: Request) -> DownloadStore:
    """Provide the application's job store."""
    return request.app.state.store


def get_service(request: Request) -> DownloadService:
    """Provide the application's download service."""
    return request.app.state.service


StoreDep = Annotated[DownloadStore, Depends(get_store)]
ServiceDep = Annotated[DownloadService, Depends(get_service)]


@app.get("/")
def root() -> dict:
    """
    Health check endpoint.

    Returns:
        dict: Status message indicating the API is running.
    """
    return {"status": "ok", "message": "Yourmine API is running"}


@app.post("/download", response_model=DownloadJob)
async def create_download(
    request: DownloadRequest,
    service: ServiceDep,
) -> DownloadJob:
    """
    Start a single video download.

    Args:
        request: The download request containing URL and format.
        service: The download orchestration service.

    Returns:
        The created download job.
    """
    job = service.create_job(request.url, request.format)
    service.schedule(job)
    return job


@app.post("/download/batch", response_model=BatchDownloadResponse)
async def create_batch_download(
    request: BatchDownloadRequest,
    service: ServiceDep,
) -> BatchDownloadResponse:
    """
    Start multiple video downloads.

    Downloads run concurrently up to the configured concurrency limit; the
    remainder wait their turn rather than saturating the executor.

    Args:
        request: The batch download request containing URLs and format.
        service: The download orchestration service.

    Returns:
        Batch information with the created download IDs.

    Raises:
        HTTPException: 422 if the batch exceeds the configured size limit.
    """
    if len(request.urls) > settings.max_batch_size:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Batch is limited to {settings.max_batch_size} URLs; "
                f"received {len(request.urls)}"
            ),
        )

    jobs = [service.create_job(url, request.format) for url in request.urls]
    for job in jobs:
        service.schedule(job)

    return BatchDownloadResponse(
        batch_id=str(uuid.uuid4()),
        download_ids=[job.id for job in jobs],
        total=len(jobs),
    )


@app.get("/downloads", response_model=DownloadListResponse)
async def list_downloads(
    store: StoreDep,
) -> DownloadListResponse:
    """
    List all downloads, newest first.

    Args:
        store: The job store.

    Returns:
        All download jobs with their current status and the total count.
    """
    jobs = store.list_all()
    return DownloadListResponse(downloads=jobs, total=len(jobs))


if __name__ == "__main__":
    configure_logging(settings.log_level)
    uvicorn.run("backend.api:app", host=settings.host, port=settings.port)
