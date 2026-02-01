# Yourmine

A simple command-line tool to download YouTube videos and convert them to MP3 files.

## Prerequisites

- Python 3.6 or higher
- FFmpeg (for audio conversion)

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic syntax
```bash
python yourmine.py <YOUTUBE_URL>
```

### With custom output directory
```bash
python yourmine.py <YOUTUBE_URL> <output_directory>
```

## Examples

Download to current directory:
```bash
python yourmine.py https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Download to specific folder:
```bash
python yourmine.py https://youtu.be/dQw4w9WgXcQ ~/Music
```

## Supported URL formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

## Notes

- Default audio quality is 192 kbps
- The MP3 file will be automatically named based on the video title
- FFmpeg must be installed for conversion to work
