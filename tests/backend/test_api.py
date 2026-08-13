"""API-level tests driving the real FastAPI app with a fake downloader."""

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.api import app, get_service, get_store
from backend.service import DownloadService
from backend.store import DownloadStore

VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
OTHER_URL = "https://youtu.be/oHg5SJYRHA0"


@pytest.fixture
def client(successful_download):
    """A TestClient whose service uses a fake downloader and a fresh store."""
    store = DownloadStore(max_jobs=100)
    service = DownloadService(
        store=store,
        output_dir=Path(tempfile.mkdtemp()),
        download_fn=successful_download,
        max_concurrent=3,
    )

    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_service] = lambda: service

    with TestClient(app) as test_client:
        test_client.store = store
        yield test_client

    app.dependency_overrides.clear()


class TestHealthCheck:
    def test_should_report_ok(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestSingleDownload:
    def test_should_accept_a_valid_youtube_url(self, client):
        response = client.post("/download", json={"url": VALID_URL, "format": "mp3"})

        assert response.status_code == 200
        body = response.json()
        assert body["url"] == VALID_URL
        assert body["format"] == "mp3"
        assert body["id"]

    def test_should_default_to_mp3_when_no_format_given(self, client):
        response = client.post("/download", json={"url": VALID_URL})
        assert response.json()["format"] == "mp3"

    def test_should_accept_wav_format(self, client):
        response = client.post("/download", json={"url": VALID_URL, "format": "wav"})
        assert response.json()["format"] == "wav"

    @pytest.mark.parametrize(
        "url",
        [
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/",
            "https://evil.example.com/watch?v=dQw4w9WgXcQ",
            "https://youtube.com.attacker.tld/watch?v=dQw4w9WgXcQ",
            "file:///etc/passwd",
        ],
    )
    def test_should_reject_non_youtube_urls(self, client, url):
        """The SSRF regression check at the HTTP boundary."""
        response = client.post("/download", json={"url": url, "format": "mp3"})
        assert response.status_code == 422

    def test_should_reject_an_unsupported_format(self, client):
        response = client.post("/download", json={"url": VALID_URL, "format": "flac"})
        assert response.status_code == 422

    def test_should_reject_a_missing_url(self, client):
        assert client.post("/download", json={"format": "mp3"}).status_code == 422


class TestBatchDownload:
    def test_should_accept_multiple_urls_and_return_their_ids(self, client):
        response = client.post(
            "/download/batch", json={"urls": [VALID_URL, OTHER_URL], "format": "mp3"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert len(body["download_ids"]) == 2

    def test_should_reject_a_batch_over_the_configured_cap(self, client):
        """An unbounded batch would saturate the executor."""
        response = client.post(
            "/download/batch", json={"urls": [VALID_URL] * 25, "format": "mp3"}
        )

        assert response.status_code == 422
        assert "limited to" in response.json()["detail"]

    def test_should_reject_an_empty_batch(self, client):
        response = client.post("/download/batch", json={"urls": [], "format": "mp3"})
        assert response.status_code == 422

    def test_should_reject_a_batch_containing_a_non_youtube_url(self, client):
        response = client.post(
            "/download/batch",
            json={"urls": [VALID_URL, "http://192.168.1.1/"], "format": "mp3"},
        )
        assert response.status_code == 422


class TestListDownloads:
    def test_should_return_an_empty_list_initially(self, client):
        response = client.get("/downloads")

        assert response.status_code == 200
        assert response.json() == {"downloads": [], "total": 0}

    def test_should_return_jobs_created_through_the_api(self, client):
        client.post("/download", json={"url": VALID_URL, "format": "mp3"})

        body = client.get("/downloads").json()

        assert body["total"] == 1
        assert body["downloads"][0]["url"] == VALID_URL

    def test_should_return_newest_jobs_first(self, client):
        client.post("/download", json={"url": VALID_URL})
        client.post("/download", json={"url": OTHER_URL})

        downloads = client.get("/downloads").json()["downloads"]

        assert downloads[0]["url"] == OTHER_URL
