"""
YouTube URL validation.

The downloader hands whatever URL it is given to yt-dlp, whose generic
extractor will happily fetch *any* HTTP host — including private addresses and
cloud metadata endpoints. Restricting input to real YouTube video URLs at the
API boundary is what keeps this tool from doubling as an SSRF gadget.
"""

import re
from urllib.parse import parse_qs, urlparse

# Exact hostnames only. A suffix check would accept `youtube.com.attacker.tld`.
ALLOWED_HOSTS = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtu.be",
    }
)

# YouTube video IDs are exactly 11 characters from the URL-safe alphabet.
VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Path forms that carry the video ID as the final path segment.
PATH_PREFIXES = ("/shorts/", "/embed/", "/v/", "/live/")


class InvalidYouTubeUrlError(ValueError):
    """Raised when a URL is not a supported YouTube video URL."""


def extract_video_id(url: str) -> str:
    """
    Validate a YouTube URL and return its video ID.

    Accepts the standard watch URL, the youtu.be short form, and the
    shorts/embed/v/live path forms, on any allowed YouTube host.

    Args:
        url: The URL to validate.

    Returns:
        The 11-character YouTube video ID.

    Raises:
        InvalidYouTubeUrlError: If the URL is malformed, points at a host
            outside the allowlist, or carries no valid video ID.

    Example:
        >>> extract_video_id("https://youtu.be/dQw4w9WgXcQ")
        'dQw4w9WgXcQ'
    """
    try:
        parsed = urlparse(url)
    except ValueError as exc:
        raise InvalidYouTubeUrlError("URL could not be parsed") from exc

    if parsed.scheme not in ("http", "https"):
        raise InvalidYouTubeUrlError("URL must use http or https")

    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise InvalidYouTubeUrlError("Only YouTube video URLs are accepted")

    video_id = _video_id_from_parts(host, parsed.path, parsed.query)
    if video_id is None or not VIDEO_ID_PATTERN.match(video_id):
        raise InvalidYouTubeUrlError("URL does not contain a valid video ID")

    return video_id


def _video_id_from_parts(host: str, path: str, query: str) -> str | None:
    """Pull the candidate video ID out of a parsed URL's path or query."""
    if host in ("youtu.be", "www.youtu.be"):
        return path.lstrip("/").split("/")[0] or None

    if path in ("/watch", "/watch/"):
        return parse_qs(query).get("v", [None])[0]

    for prefix in PATH_PREFIXES:
        if path.startswith(prefix):
            return path[len(prefix) :].split("/")[0] or None

    return None


def is_valid_youtube_url(url: str) -> bool:
    """Return True if the URL is a supported YouTube video URL."""
    try:
        extract_video_id(url)
    except InvalidYouTubeUrlError:
        return False
    return True
