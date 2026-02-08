#!/usr/bin/env python3
"""
Yourmine - YouTube Audio Converter.

A command-line tool for downloading YouTube videos and converting them
to audio formats (MP3 or WAV).

Usage:
    python yourmine.py <YOUTUBE_URL> [--format mp3|wav]
    python yourmine.py --file urls.txt [--format wav] [--workers 5]
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Tuple

from backend.downloader import download_audio


def cli_download(
    youtube_url: str,
    output_dir: str = ".",
    audio_format: str = "mp3",
    index: int | None = None
) -> bool:
    """
    CLI wrapper around download_audio with console output.

    Args:
        youtube_url: The YouTube video URL to download.
        output_dir: The output directory. Defaults to current directory.
        audio_format: Audio format ('mp3' or 'wav'). Defaults to 'mp3'.
        index: Optional index for batch downloads to track progress.

    Returns:
        True if download was successful, False otherwise.
    """
    prefix = f"[{index}] " if index is not None else ""
    print(f"{prefix}Downloading: {youtube_url}")
    print(f"{prefix}Format: {audio_format.upper()} {'(lossless)' if audio_format == 'wav' else ''}")

    result = download_audio(youtube_url, output_dir, audio_format)

    if result['success']:
        print(f"{prefix}✓ Conversion complete: {result['title']}.{audio_format}")
        return True

    print(f"✗ {result['error']}")
    return False


def read_urls_from_file(file_path: str) -> List[str]:
    """
    Read YouTube URLs from a text file.

    Reads one URL per line, skipping empty lines and comments (lines
    starting with '#').

    Args:
        file_path: Path to the text file containing URLs.

    Returns:
        List of YouTube URLs found in the file.

    Exits:
        Exits with code 1 if the file is not found or cannot be read.
    """
    urls = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    urls.append(line)
    except FileNotFoundError:
        print(f"✗ File not found: {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error reading file: {e}")
        sys.exit(1)

    return urls


def download_batch(
    urls: List[str],
    output_dir: str,
    audio_format: str,
    max_workers: int = 3
) -> Tuple[int, int]:
    """
    Download multiple YouTube videos in parallel.

    Uses a thread pool to download multiple videos concurrently,
    improving throughput for batch operations.

    Args:
        urls: List of YouTube URLs to download.
        output_dir: Output directory for all downloaded files.
        audio_format: Audio format for all downloads ('mp3' or 'wav').
        max_workers: Maximum number of parallel downloads. Defaults to 3.

    Returns:
        A tuple of (successful_downloads, total_downloads).
    """
    print(f"\n📥 Starting batch download of {len(urls)} videos...")
    print(f"Format: {audio_format.upper()} | Workers: {max_workers}\n")

    successful = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {
            executor.submit(cli_download, url, output_dir, audio_format, i + 1): (i + 1, url)
            for i, url in enumerate(urls)
        }

        for future in as_completed(future_to_url):
            index, url = future_to_url[future]
            try:
                if future.result():
                    successful += 1
            except Exception as e:
                print(f"✗ Exception for URL {index}: {e}")

    return successful, len(urls)


def main() -> None:
    """
    Main script entry point.

    Parses command-line arguments and dispatches to either single
    download or batch download mode based on the provided options.
    """
    parser = argparse.ArgumentParser(
        description='Yourmine - YouTube Audio Converter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single video download
  python yourmine.py https://www.youtube.com/watch?v=dQw4w9WgXcQ
  python yourmine.py https://youtu.be/dQw4w9WgXcQ --format wav

  # Batch download from file
  python yourmine.py --file urls.txt --format wav --output ~/Music
  python yourmine.py -i urls.txt -w 5  # 5 parallel downloads
        """
    )

    parser.add_argument('url', nargs='?', help='YouTube video URL')
    parser.add_argument('-i', '--file', '--input', dest='file',
                        help='Text file containing YouTube URLs (one per line)')
    parser.add_argument('-o', '--output', default='.',
                        help='Output directory (default: current directory)')
    parser.add_argument('-f', '--format', choices=['mp3', 'wav'], default='mp3',
                        help='Audio format: mp3 (lossy, default) or wav (lossless)')
    parser.add_argument('-w', '--workers', type=int, default=3,
                        help='Number of parallel downloads for batch mode (default: 3)')

    args = parser.parse_args()

    if not args.url and not args.file:
        parser.error('Either provide a URL or use --file to specify a file with URLs')

    if args.url and args.file:
        parser.error('Cannot use both URL and --file. Choose one.')

    Path(args.output).mkdir(parents=True, exist_ok=True)

    if args.file:
        urls = read_urls_from_file(args.file)
        if not urls:
            print("✗ No valid URLs found in file")
            sys.exit(1)

        successful, total = download_batch(urls, args.output, args.format, args.workers)
        print(f"\n{'=' * 50}")
        print(f"Batch download complete: {successful}/{total} successful")
        print(f"{'=' * 50}")
        sys.exit(0 if successful == total else 1)
    else:
        success = cli_download(args.url, args.output, args.format)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
