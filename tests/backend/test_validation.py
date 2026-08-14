"""Tests for YouTube URL validation - the SSRF guard at the API boundary."""

import pytest

from backend.validation import (
    InvalidYouTubeUrlError,
    extract_video_id,
    is_valid_youtube_url,
)

VIDEO_ID = "dQw4w9WgXcQ"


class TestAcceptsRealYouTubeUrls:
    @pytest.mark.parametrize(
        "url",
        [
            f"https://www.youtube.com/watch?v={VIDEO_ID}",
            f"https://youtube.com/watch?v={VIDEO_ID}",
            f"https://m.youtube.com/watch?v={VIDEO_ID}",
            f"https://music.youtube.com/watch?v={VIDEO_ID}",
            f"http://www.youtube.com/watch?v={VIDEO_ID}",
            f"https://youtu.be/{VIDEO_ID}",
            f"https://www.youtube.com/shorts/{VIDEO_ID}",
            f"https://www.youtube.com/embed/{VIDEO_ID}",
            f"https://www.youtube.com/v/{VIDEO_ID}",
            f"https://www.youtube.com/live/{VIDEO_ID}",
        ],
    )
    def test_should_extract_video_id_from_supported_url_forms(self, url):
        assert extract_video_id(url) == VIDEO_ID

    def test_should_accept_watch_url_with_extra_query_parameters(self):
        url = f"https://www.youtube.com/watch?v={VIDEO_ID}&list=PLxyz&index=2"
        assert extract_video_id(url) == VIDEO_ID

    def test_should_accept_short_url_with_query_string(self):
        assert extract_video_id(f"https://youtu.be/{VIDEO_ID}?t=42") == VIDEO_ID

    def test_should_treat_host_case_insensitively(self):
        assert (
            extract_video_id(f"https://WWW.YouTube.COM/watch?v={VIDEO_ID}") == VIDEO_ID
        )


class TestRejectsNonYouTubeUrls:
    @pytest.mark.parametrize(
        "url",
        [
            "http://192.168.1.1/",
            "http://127.0.0.1:8000/downloads",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/",
            "https://evil.example.com/watch?v=dQw4w9WgXcQ",
        ],
    )
    def test_should_reject_hosts_outside_the_allowlist(self, url):
        """The SSRF regression check: internal hosts must never reach yt-dlp."""
        with pytest.raises(InvalidYouTubeUrlError):
            extract_video_id(url)

    @pytest.mark.parametrize(
        "url",
        [
            f"https://youtube.com.attacker.tld/watch?v={VIDEO_ID}",
            f"https://notyoutube.com/watch?v={VIDEO_ID}",
            f"https://youtube.com.evil/watch?v={VIDEO_ID}",
        ],
    )
    def test_should_reject_lookalike_hostnames(self, url):
        """Suffix-matching a host would let `youtube.com.attacker.tld` through."""
        with pytest.raises(InvalidYouTubeUrlError):
            extract_video_id(url)

    @pytest.mark.parametrize(
        "url",
        [
            "file:///etc/passwd",
            "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
            "javascript:alert(1)",
        ],
    )
    def test_should_reject_non_http_schemes(self, url):
        with pytest.raises(InvalidYouTubeUrlError):
            extract_video_id(url)

    @pytest.mark.parametrize(
        "url",
        [
            "https://www.youtube.com/watch?v=tooshort",
            "https://www.youtube.com/watch?v=waaaaaaaaaaytoolong",
            "https://www.youtube.com/watch",
            "https://www.youtube.com/",
            "https://youtu.be/",
            "https://www.youtube.com/watch?v=invalid!!!!",
            "https://www.youtube.com/feed/subscriptions",
        ],
    )
    def test_should_reject_urls_without_a_valid_video_id(self, url):
        with pytest.raises(InvalidYouTubeUrlError):
            extract_video_id(url)

    def test_should_reject_empty_string(self):
        with pytest.raises(InvalidYouTubeUrlError):
            extract_video_id("")


class TestIsValidYouTubeUrl:
    def test_should_return_true_for_valid_url(self):
        assert is_valid_youtube_url(f"https://youtu.be/{VIDEO_ID}") is True

    def test_should_return_false_instead_of_raising_for_invalid_url(self):
        assert is_valid_youtube_url("http://192.168.1.1/") is False
