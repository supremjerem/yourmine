"""
Guards the status contract shared by the backend and the frontend.

`DownloadState` is the source of truth. The frontend re-declares the same values
as a TypeScript union because it cannot import Python; this test fails if the
two ever drift apart.
"""

import re
from pathlib import Path

from backend.models import AudioFormat, DownloadState

FRONTEND_TYPES = Path(__file__).resolve().parents[2] / "frontend" / "src" / "types.ts"


def parse_union(source: str, type_name: str) -> set[str]:
    """Extract the string literals of a TypeScript union type declaration."""
    match = re.search(
        rf"export type {type_name}\s*=\s*(.*?)(?=\n\s*\nexport|\Z)", source, re.DOTALL
    )
    assert match, f"{type_name} not found in {FRONTEND_TYPES}"
    return set(re.findall(r"'([^']+)'", match.group(1)))


def test_frontend_download_status_matches_backend_enum():
    source = FRONTEND_TYPES.read_text(encoding="utf-8")
    assert parse_union(source, "DownloadStatusType") == {s.value for s in DownloadState}


def test_frontend_audio_format_matches_backend_enum():
    source = FRONTEND_TYPES.read_text(encoding="utf-8")
    assert parse_union(source, "AudioFormat") == {f.value for f in AudioFormat}
