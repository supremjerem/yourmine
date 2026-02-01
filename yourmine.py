#!/usr/bin/env python3
"""
Yourmine - YouTube Audio Converter
Usage: python yourmine.py <YOUTUBE_URL> [--format mp3|wav]
"""

import sys
import os
import argparse
from pathlib import Path
try:
    import yt_dlp
except ImportError:
    print("yt-dlp is not installed. Install it with: pip install yt-dlp")
    sys.exit(1)


def download_audio(youtube_url, output_dir=".", audio_format="mp3"):
    """
    Downloads a YouTube video and converts it to the specified audio format
    
    Args:
        youtube_url: The YouTube video URL
        output_dir: The output directory (default: current directory)
        audio_format: Audio format (mp3 or wav, default: mp3)
    """
    # Configuration based on format
    if audio_format == "wav":
        postprocessors = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
        }]
    else:  # mp3
        postprocessors = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    
    # Configuration for yt-dlp
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': postprocessors,
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'quiet': False,
        'no_warnings': False,
        'noplaylist': True,  # Download only single video, not playlists
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Downloading: {youtube_url}")
            print(f"Format: {audio_format.upper()} {'(lossless)' if audio_format == 'wav' else ''}")
            info = ydl.extract_info(youtube_url, download=True)
            print(f"\n✓ Conversion complete: {info['title']}.{audio_format}")
            return True
    except Exception as e:
        print(f"\n✗ Error during download: {e}")
        return False


def main():
    """Main script entry point"""
    parser = argparse.ArgumentParser(
        description='Yourmine - YouTube Audio Converter',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python yourmine.py https://www.youtube.com/watch?v=dQw4w9WgXcQ
  python yourmine.py https://youtu.be/dQw4w9WgXcQ --format wav
  python yourmine.py https://youtu.be/dQw4w9WgXcQ --output ~/Music --format wav
        """
    )
    
    parser.add_argument('url', help='YouTube video URL')
    parser.add_argument('-o', '--output', default='.', 
                       help='Output directory (default: current directory)')
    parser.add_argument('-f', '--format', choices=['mp3', 'wav'], default='mp3',
                       help='Audio format: mp3 (lossy, default) or wav (lossless)')
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    Path(args.output).mkdir(parents=True, exist_ok=True)
    
    # Start download
    success = download_audio(args.url, args.output, args.format)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
