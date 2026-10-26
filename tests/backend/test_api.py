"""API-level tests driving the real FastAPI app with a fake downloader."""

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.api import app, get_service, get_store
from backend.playlist import PlaylistContents, PlaylistExpansionError
from backend.service import DownloadService
from backend.store import DownloadStore

VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
OTHER_URL = "https://youtu.be/oHg5SJYRHA0"
PLAYLIST_URL = (
    "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf"
)


@pytest.fixture
def expanded_playlist():
    """What the fake expander returns; tests replace `contents` to vary it."""
    return {
        "contents": PlaylistContents(
            video_urls=[VALID_URL, OTHER_URL], truncated=False
        ),
        "calls": [],
    }


@pytest.fixture
def client(successful_download, expanded_playlist):
    """A TestClient whose service uses a fake downloader and a fresh store."""

    def expand(url, limit):
        expanded_playlist["calls"].append((url, limit))
        contents = expanded_playlist["contents"]
        if isinstance(contents, Exception):
            raise contents
        return contents

    store = DownloadStore(max_jobs=100)
    service = DownloadService(
        store=store,
        output_dir=Path(tempfile.mkdtemp()),
        download_fn=successful_download,
        max_concurrent=3,
        expand_playlist_fn=expand,
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


class TestPlaylistDownload:
    def test_should_create_one_job_per_video_in_the_playlist(self, client):
        response = client.post(
            "/download/playlist", json={"url": PLAYLIST_URL, "format": "wav"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert len(body["download_ids"]) == 2
        assert body["truncated"] is False

        jobs = client.get("/downloads").json()["downloads"]
        assert {job["url"] for job in jobs} == {VALID_URL, OTHER_URL}
        assert {job["format"] for job in jobs} == {"wav"}

    def test_should_default_to_mp3_when_no_format_given(self, client):
        client.post("/download/playlist", json={"url": PLAYLIST_URL})

        jobs = client.get("/downloads").json()["downloads"]

        assert {job["format"] for job in jobs} == {"mp3"}

    def test_should_ask_the_expander_for_the_configured_maximum(
        self, client, expanded_playlist
    ):
        client.post("/download/playlist", json={"url": PLAYLIST_URL})

        assert expanded_playlist["calls"] == [(PLAYLIST_URL, 50)]

    def test_should_report_when_the_playlist_was_truncated(
        self, client, expanded_playlist
    ):
        expanded_playlist["contents"] = PlaylistContents(
            video_urls=[VALID_URL], truncated=True
        )

        response = client.post("/download/playlist", json={"url": PLAYLIST_URL})

        assert response.json()["truncated"] is True

    def test_should_return_422_with_the_message_when_expansion_fails(
        self, client, expanded_playlist
    ):
        expanded_playlist["contents"] = PlaylistExpansionError("Playlist unavailable")

        response = client.post("/download/playlist", json={"url": PLAYLIST_URL})

        assert response.status_code == 422
        assert response.json()["detail"] == "Playlist unavailable"
        assert client.get("/downloads").json()["total"] == 0

    @pytest.mark.parametrize(
        "url",
        [
            VALID_URL,
            "http://192.168.1.1/playlist?list=PLrAXtmErZgOeiKm4sg",
            "https://evil.example.com/playlist?list=PLrAXtmErZgOeiKm4sg",
            "https://www.youtube.com/playlist?list=WL",
        ],
    )
    def test_should_reject_urls_that_are_not_youtube_playlists(
        self, client, expanded_playlist, url
    ):
        response = client.post("/download/playlist", json={"url": url})

        assert response.status_code == 422
        assert expanded_playlist["calls"] == []

    def test_should_not_accept_a_playlist_url_on_the_single_endpoint(self, client):
        response = client.post("/download", json={"url": PLAYLIST_URL})

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
