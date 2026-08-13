"""Tests for the yt-dlp adapter, with yt-dlp itself mocked out."""

from unittest.mock import MagicMock, patch

import pytest
import yt_dlp

from backend.downloader import (
    ERROR_EXTRACT,
    ERROR_UNAVAILABLE,
    ERROR_UNEXPECTED,
    _build_postprocessors,
    _make_progress_hook,
    _resolve_filename,
    download_audio,
)

URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


class TestPostprocessorConfig:
    def test_should_request_wav_codec_without_quality_setting(self):
        [config] = _build_postprocessors("wav")
        assert config["preferredcodec"] == "wav"
        assert "preferredquality" not in config

    def test_should_request_mp3_codec_with_default_quality(self):
        [config] = _build_postprocessors("mp3")
        assert config["preferredcodec"] == "mp3"
        assert config["preferredquality"] == "192"

    def test_should_default_to_mp3_for_unknown_format(self):
        [config] = _build_postprocessors("flac")
        assert config["preferredcodec"] == "mp3"


class TestFilenameResolution:
    def test_should_use_the_path_yt_dlp_actually_wrote(self):
        """yt-dlp sanitizes titles, so the real path is the only truth."""
        info = {
            "title": "AC/DC: Back in Black",
            "requested_downloads": [{"filepath": "/out/AC_DC - Back in Black.mp3"}],
        }
        assert _resolve_filename(info, "mp3") == "AC_DC - Back in Black.mp3"

    def test_should_fall_back_to_title_when_no_path_reported(self):
        assert _resolve_filename({"title": "Song"}, "wav") == "Song.wav"

    def test_should_fall_back_when_requested_downloads_is_empty(self):
        info = {"title": "Song", "requested_downloads": []}
        assert _resolve_filename(info, "mp3") == "Song.mp3"


class TestProgressHook:
    def test_should_report_percentage_and_speed_while_downloading(self):
        received = []
        hook, _ = _make_progress_hook(received.append)

        hook(
            {"status": "downloading", "_percent_str": "42.0%", "_speed_str": "1.2MiB/s"}
        )

        assert received[0]["status"] == "downloading"
        assert received[0]["percent"] == "42.0%"
        assert received[0]["speed"] == "1.2MiB/s"

    def test_should_switch_to_converting_when_download_finishes(self):
        received = []
        hook, complete = _make_progress_hook(received.append)

        hook({"status": "finished"})

        assert complete[0] is True
        assert received[0]["status"] == "converting"

    def test_should_tolerate_a_missing_callback(self):
        hook, _ = _make_progress_hook(None)
        hook({"status": "downloading", "_percent_str": "10%"})


class TestDownloadAudio:
    @patch("backend.downloader.yt_dlp.YoutubeDL")
    def test_should_report_success_with_title_and_filename(self, mock_ydl):
        mock_ydl.return_value.__enter__.return_value.extract_info.return_value = {
            "title": "Test Song",
            "requested_downloads": [{"filepath": "/out/Test Song.mp3"}],
        }

        result = download_audio(URL, "/out", "mp3")

        assert result["success"] is True
        assert result["title"] == "Test Song"
        assert result["filename"] == "Test Song.mp3"
        assert result["format"] == "mp3"

    @patch("backend.downloader.yt_dlp.YoutubeDL")
    def test_should_emit_extracting_then_complete_progress(self, mock_ydl):
        mock_ydl.return_value.__enter__.return_value.extract_info.return_value = {
            "title": "Test Song"
        }
        received = []

        download_audio(URL, "/out", "mp3", received.append)

        assert [event["status"] for event in received] == ["extracting", "complete"]

    @pytest.mark.parametrize(
        ("exception", "expected_message"),
        [
            (yt_dlp.utils.DownloadError("boom"), ERROR_UNAVAILABLE),
            (yt_dlp.utils.ExtractorError("boom"), ERROR_EXTRACT),
            (RuntimeError("boom"), ERROR_UNEXPECTED),
        ],
    )
    @patch("backend.downloader.yt_dlp.YoutubeDL")
    def test_should_return_a_user_facing_message_for_each_failure(
        self, mock_ydl, exception, expected_message
    ):
        mock_ydl.return_value.__enter__.return_value.extract_info.side_effect = (
            exception
        )

        result = download_audio(URL, "/out", "mp3")

        assert result["success"] is False
        assert result["error"] == expected_message
        assert result["url"] == URL

    @patch("backend.downloader.yt_dlp.YoutubeDL")
    def test_should_not_leak_raw_exception_text_to_the_caller(self, mock_ydl):
        """Raw yt-dlp errors carry local filesystem paths; they stay in the log."""
        secret = "/Users/someone/private/path/cookies.txt"
        mock_ydl.return_value.__enter__.return_value.extract_info.side_effect = (
            yt_dlp.utils.DownloadError(f"failed reading {secret}")
        )

        result = download_audio(URL, "/out", "mp3")

        assert secret not in result["error"]

    @patch("backend.downloader.yt_dlp.YoutubeDL")
    def test_should_disable_playlist_expansion(self, mock_ydl):
        mock_ydl.return_value.__enter__.return_value.extract_info.return_value = {
            "title": "Test Song"
        }

        download_audio(URL, "/out", "mp3")

        options = mock_ydl.call_args[0][0]
        assert options["noplaylist"] is True

    @patch("backend.downloader.yt_dlp.YoutubeDL", MagicMock())
    def test_should_write_into_the_requested_output_directory(self):
        with patch("backend.downloader.yt_dlp.YoutubeDL") as mock_ydl:
            mock_ydl.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Song"
            }
            download_audio(URL, "/custom/dir", "mp3")

            assert mock_ydl.call_args[0][0]["outtmpl"].startswith("/custom/dir")
