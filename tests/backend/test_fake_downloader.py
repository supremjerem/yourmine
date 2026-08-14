"""Tests for the simulated downloader used by the end-to-end suite."""

from pathlib import Path
from unittest.mock import patch

import pytest

from backend.downloader import download_audio
from backend.fake_downloader import (
    ERROR_UNAVAILABLE,
    _simulates_failure,
    fake_download_audio,
)

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.fixture(autouse=True)
def _no_sleeping():
    """Keep the suite fast; the delays exist for the browser, not for us."""
    with patch("backend.fake_downloader.time.sleep"):
        yield


class TestSuccessfulSimulation:
    def test_should_report_success(self, tmp_path):
        result = fake_download_audio(URL, str(tmp_path), "mp3")
        assert result["success"] is True

    def test_should_write_a_real_file_so_saved_is_not_a_lie(self, tmp_path):
        result = fake_download_audio(URL, str(tmp_path), "mp3")
        written = tmp_path / str(result["filename"])
        assert written.exists()
        assert written.stat().st_size > 0

    def test_should_use_the_requested_format_as_the_extension(self, tmp_path):
        result = fake_download_audio(URL, str(tmp_path), "wav")
        assert str(result["filename"]).endswith(".wav")

    def test_should_derive_the_title_from_the_video_id(self, tmp_path):
        result = fake_download_audio(URL, str(tmp_path), "mp3")
        assert "dQw4w9WgXcQ" in str(result["title"])

    def test_should_create_the_output_directory_if_missing(self, tmp_path):
        target = tmp_path / "nested" / "dir"
        result = fake_download_audio(URL, str(target), "mp3")
        assert result["success"] is True
        assert target.exists()


class TestProgressReporting:
    def test_should_emit_the_same_status_sequence_as_the_real_downloader(
        self, tmp_path
    ):
        events: list[dict] = []
        fake_download_audio(URL, str(tmp_path), "mp3", events.append)

        statuses = [event["status"] for event in events]
        assert statuses[0] == "extracting"
        assert statuses[-1] == "complete"
        assert "downloading" in statuses
        assert "converting" in statuses

    def test_should_report_increasing_percentages(self, tmp_path):
        events: list[dict] = []
        fake_download_audio(URL, str(tmp_path), "mp3", events.append)

        percents = [
            float(event["percent"].rstrip("%"))
            for event in events
            if event.get("status") == "downloading"
        ]
        assert percents == sorted(percents)
        assert len(percents) > 1

    def test_should_tolerate_a_missing_callback(self, tmp_path):
        assert fake_download_audio(URL, str(tmp_path), "mp3")["success"] is True


class TestFailureSentinels:
    @pytest.mark.parametrize("video_id", ["aaaaaaaaaaa", "invalid_vid", "invalidxxxx"])
    def test_should_treat_sentinel_ids_as_unavailable(self, video_id):
        assert _simulates_failure(video_id) is True

    @pytest.mark.parametrize("video_id", ["dQw4w9WgXcQ", "9bZkp7q19f0", "jNQXAC9IVRw"])
    def test_should_treat_realistic_ids_as_available(self, video_id):
        assert _simulates_failure(video_id) is False

    def test_should_fail_the_download_for_a_sentinel_id(self, tmp_path):
        url = "https://www.youtube.com/watch?v=aaaaaaaaaaa"
        result = fake_download_audio(url, str(tmp_path), "mp3")

        assert result["success"] is False
        assert result["error"] == ERROR_UNAVAILABLE

    def test_should_not_write_a_file_when_simulating_failure(self, tmp_path):
        url = "https://www.youtube.com/watch?v=aaaaaaaaaaa"
        fake_download_audio(url, str(tmp_path), "mp3")

        assert list(tmp_path.iterdir()) == []


class TestInterchangeability:
    def test_should_return_the_same_keys_as_the_real_downloader_on_success(
        self, tmp_path
    ):
        """The service layer must not be able to tell the two apart."""
        with patch("backend.downloader.yt_dlp.YoutubeDL") as mock_ydl:
            mock_ydl.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Song",
                "requested_downloads": [{"filepath": "/out/Song.mp3"}],
            }
            real = download_audio(URL, str(tmp_path), "mp3")

        fake = fake_download_audio(URL, str(tmp_path), "mp3")
        assert set(real) == set(fake)

    def test_should_return_the_same_keys_as_the_real_downloader_on_failure(
        self, tmp_path
    ):
        import yt_dlp

        with patch("backend.downloader.yt_dlp.YoutubeDL") as mock_ydl:
            mock_ydl.return_value.__enter__.return_value.extract_info.side_effect = (
                yt_dlp.utils.DownloadError("boom")
            )
            real = download_audio(URL, str(tmp_path), "mp3")

        fake = fake_download_audio(
            "https://www.youtube.com/watch?v=aaaaaaaaaaa", str(tmp_path), "mp3"
        )
        assert set(real) == set(fake)


class TestNoNetworkAccess:
    def test_should_never_construct_a_yt_dlp_client(self, tmp_path):
        """The whole point: this path must not reach the network."""
        with patch("backend.downloader.yt_dlp.YoutubeDL") as mock_ydl:
            fake_download_audio(URL, str(tmp_path), "mp3")

        mock_ydl.assert_not_called()


class TestOutputDirectoryFailure:
    def test_should_report_a_failure_when_the_file_cannot_be_written(self, tmp_path):
        with patch.object(Path, "write_bytes", side_effect=OSError("read-only")):
            result = fake_download_audio(URL, str(tmp_path), "mp3")

        assert result["success"] is False
