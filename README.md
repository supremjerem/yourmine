# YourMine - YouTube Audio Downloader

Web interface for downloading audio from YouTube videos and playlists.

## Features

- 🎵 Download audio from YouTube videos
- 📋 Batch download from playlists
- 📊 Real-time progress tracking
- 🔄 Conversion status monitoring
- 📁 Direct download to ~/Downloads folder
- 🧪 Full E2E test coverage (17 tests)

## Quick Start with Docker

The easiest way to run YourMine is with Docker Compose:

```bash
# Start the application
docker-compose up
```

To stop the application:

```bash
docker-compose down
```

## Development Setup (without Docker)

### Prerequisites

- Python 3.11+
- Node.js 20+
- FFmpeg

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python backend/api.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Install Playwright
npx playwright install

# Run all E2E tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui
```

## Tech Stack

- **Backend**: FastAPI, yt-dlp, Python 3.11
- **Frontend**: React 18, Vite 5
- **Testing**: Playwright
- **Containerization**: Docker, Docker Compose

## Architecture

- Downloads are saved directly to `~/Downloads` folder
- No server-side file storage
- Real-time progress tracking via polling
- Status progression: queued → extracting → downloading → converting → completed

## API Endpoints

- `POST /download` - Download single video
- `POST /download/batch` - Download playlist
- `GET /downloads` - Get all downloads status

See full API documentation at http://localhost:8000/docs

## License

MIT
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
