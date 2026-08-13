"""
Application configuration.

All settings are read from the environment with a `YOURMINE_` prefix, so no
environment-specific value is hard-coded. See `.env.example` for the full list.
"""

import logging
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def resolve_output_directory() -> Path:
    """
    Find the best available directory for finished downloads.

    Tries, in order of preference:
        1. ~/Downloads (created if missing)
        2. ~/Desktop (if it exists and is writable)
        3. ~/ (home directory, as a last resort)

    Each candidate is probed with a real write so a directory that exists but
    is not writable is rejected rather than failing later mid-download.

    Returns:
        The path to the selected output directory.
    """
    for candidate in (Path.home() / "Downloads", Path.home() / "Desktop"):
        try:
            candidate.mkdir(exist_ok=True)
            probe = candidate / ".yourmine-write-test"
            probe.touch()
            probe.unlink()
        except OSError as exc:
            logger.warning("Cannot use %s for downloads: %s", candidate, exc)
            continue
        return candidate

    home = Path.home()
    logger.warning("Falling back to home directory for downloads: %s", home)
    return home


class Settings(BaseSettings):
    """Runtime configuration, overridable via YOURMINE_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="YOURMINE_", env_file=".env")

    # Bind to loopback by default: the API is unauthenticated, so it must not be
    # reachable from the network unless the operator opts in explicitly.
    host: str = "127.0.0.1"
    port: int = 8000

    # Empty means "resolve at startup" via resolve_output_directory().
    output_dir: Path | None = None

    # Caps that keep a single request from exhausting the process.
    max_batch_size: int = 20
    max_concurrent_downloads: int = 3
    max_stored_jobs: int = 200

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    log_level: str = "INFO"

    def resolved_output_dir(self) -> Path:
        """Return the configured output directory, resolving it if unset."""
        return (
            self.output_dir
            if self.output_dir is not None
            else resolve_output_directory()
        )


def configure_logging(level: str) -> None:
    """Set up application-wide logging with a consistent format."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
