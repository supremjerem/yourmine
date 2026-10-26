"""
YouTube URL validation.

The downloader hands whatever URL it is given to yt-dlp, whose generic
extractor will happily fetch *any* HTTP host — including private addresses and
cloud metadata endpoints. Restricting input to real YouTube video URLs at the
API boundary is what keeps this tool from doubling as an SSRF gadget.
"""

import re
from urllib.parse import ParseResult, parse_qs, urlparse

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

# Playlist IDs vary in length by prefix (PL..., OLAK5uy_..., RD...). The lower
# bound rejects the two-letter private lists ("WL", "LL"), which need a login.
PLAYLIST_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{10,64}$")

# Only the full YouTube hosts serve /playlist; youtu.be does not.
PLAYLIST_HOSTS = ALLOWED_HOSTS - {"youtu.be", "www.youtu.be"}

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
    parsed, host = _parse_allowed_url(url)

    video_id = _video_id_from_parts(host, parsed.path, parsed.query)
    if video_id is None or not VIDEO_ID_PATTERN.match(video_id):
        raise InvalidYouTubeUrlError("URL does not contain a valid video ID")

    return video_id


def _parse_allowed_url(url: str) -> tuple[ParseResult, str]:
    """Parse `url` and return it with its lowercased host, or raise if not allowed."""
    try:
        parsed = urlparse(url)
    except ValueError as exc:
        raise InvalidYouTubeUrlError("URL could not be parsed") from exc

    if parsed.scheme not in ("http", "https"):
        raise InvalidYouTubeUrlError("URL must use http or https")

    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_HOSTS:
        raise InvalidYouTubeUrlError("Only YouTube video URLs are accepted")

    return parsed, host


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


def extract_playlist_id(url: str) -> str:
    """
    Validate a YouTube playlist URL and return its playlist ID.

    Only the dedicated `/playlist?list=ID` form is accepted. A watch URL that
    merely carries a `list` parameter is a single-video link and is handled by
    `extract_video_id`.

    Args:
        url: The URL to validate.

    Returns:
        The playlist ID.

    Raises:
        InvalidYouTubeUrlError: If the URL is malformed, points at a host
            outside the allowlist, or carries no valid playlist ID.

    Example:
        >>> extract_playlist_id("https://www.youtube.com/playlist?list=PLabcdefghij")
        'PLabcdefghij'
    """
    parsed, host = _parse_allowed_url(url)

    if host not in PLAYLIST_HOSTS or parsed.path.rstrip("/") != "/playlist":
        raise InvalidYouTubeUrlError("URL is not a YouTube playlist")

    playlist_id = parse_qs(parsed.query).get("list", [None])[0]
    if playlist_id is None or not PLAYLIST_ID_PATTERN.match(playlist_id):
        raise InvalidYouTubeUrlError("URL does not contain a valid playlist ID")

    return playlist_id


def is_playlist_url(url: str) -> bool:
    """Return True if the URL is a supported YouTube playlist URL."""
    try:
        extract_playlist_id(url)
    except InvalidYouTubeUrlError:
        return False
    return True
