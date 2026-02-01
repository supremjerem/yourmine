# Yourmine - YouTube Audio Downloader

Convert YouTube videos to MP3 or WAV audio files with a beautiful web interface or command-line tool.

## Features

- 🎵 Download YouTube videos as MP3 (lossy) or WAV (lossless)
- 🚀 Single or batch download mode
- ⚡ Parallel downloads for batch mode
- 🌐 Modern web interface (React + FastAPI)
- 💻 Command-line interface
- 📊 Real-time download progress
- 🎨 Beautiful, responsive UI

## Prerequisites

- Python 3.6 or higher
- FFmpeg (for audio conversion)

- Python 3.8+
- Node.js 16+ (for web interface)
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

```bash
# Clone the repository
git clone https://github.com/supremjerem/yourmine.git
cd yourmine

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

## Usage

### 🌐 Web Interface (Recommended)

Start the web interface:
```bash
chmod +x start.sh
./start.sh
```

Then open http://localhost:3000 in your browser.

The web interface provides:
- Easy URL input (single or batch)
- Format selection (MP3/WAV)
- Real-time download progress
- Download history
- File downloads

### 💻 Command Line Interface

**Single download:**
```bash
python yourmine.py https://www.youtube.com/watch?v=VIDEO_ID --format mp3
python yourmine.py https://www.youtube.com/watch?v=VIDEO_ID --format wav --output ~/Music
```

**Batch download from file:**
```bash
python yourmine.py --file urls.txt --format wav --workers 4
```

Create a `urls.txt` file with one URL per line:
```
https://www.youtube.com/watch?v=VIDEO_ID_1
https://www.youtube.com/watch?v=VIDEO_ID_2
# Comments are supported
https://www.youtube.com/watch?v=VIDEO_ID_3
```

## Options

- `--format`, `-f`: Audio format (`mp3` or `wav`)
- `--output`, `-o`: Output directory
- `--file`, `-i`: Input file with URLs (batch mode)
- `--workers`, `-w`: Number of parallel workers (batch mode)

## Architecture

```
yourmine/
├── backend/              # FastAPI backend
│   ├── api.py           # API endpoints
│   └── downloader.py    # Download logic
├── frontend/            # React frontend
│   └── src/
├── yourmine.py          # CLI tool
└── requirements.txt     # Python dependencies
```

## API Endpoints

- `POST /download` - Start a single download
- `POST /download/batch` - Start batch downloads
- `GET /download/{id}` - Get download status
- `GET /downloads` - List all downloads
- `GET /download/{id}/file` - Download the file

Full API documentation: http://localhost:8000/docs

## Examples

Download to current directory as MP3:
```bash
python yourmine.py https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Download to specific folder as WAV:
```bash
python yourmine.py https://youtu.be/dQw4w9WgXcQ --output ~/Music --format wav
```

## Supported URL formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

## Notes

- Default audio quality is 192 kbps
- The MP3 file will be automatically named based on the video title
- FFmpeg must be installed for conversion to work
