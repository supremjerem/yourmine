"""
Playlist expansion contract.

Turning a playlist URL into video URLs needs yt-dlp, but the service layer must
stay free of it. This module holds only the types both sides agree on, so the
real expander, the test fake, and the service can all depend on it.
"""

from collections.abc import Callable
from dataclasses import dataclass


class PlaylistExpansionError(Exception):
    """Raised when a playlist cannot be turned into a list of videos.

    The message is user-facing, so it must never carry raw yt-dlp output.
    """


@dataclass(frozen=True)
class PlaylistContents:
    """The videos found in a playlist, capped at the requested limit."""

    video_urls: list[str]
    # True when the playlist held more videos than the cap allowed.
    truncated: bool


# Takes a playlist URL and the maximum number of videos to return.
PlaylistExpandFn = Callable[[str, int], PlaylistContents]
