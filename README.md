# BrowserTV - Web IPTV Player

A modern React application that allows you to play IPTV streams directly in your browser. Load M3U playlists, organize channels into groups, mark favorites, and play content with an advanced multi-engine player.
Hosted site: [browsertv.thearchitechs.dev](https://browsertv.thearchitechs.dev/)

## Features

- **Playlist Management**
  - Load M3U playlists from local files or URLs
  - Save playlists locally in browser for future use
  - Update playlists from source URLs
  - Name and organize multiple playlists
  
- **Channel Organization**
  - Browse channels by groups
  - Drag and drop to reorder groups
  - Sort groups alphabetically
  - Mark channels as favorites
  - Comprehensive search functionality
  
- **Advanced Player**
  - Multi-engine player with automatic fallback:
    - Video.js (primary player)
    - HLS.js (for HLS/m3u8 streams)
    - mpegts.js (for MPEG-TS streams)
    - Native HTML5 video (final fallback)
  - Support for various streaming formats:
    - HLS (.m3u8) streams
    - MPEG-TS (.ts) streams
    - DASH (.mpd) streams
    - MP4 and other standard video formats
  - Automatic format detection
  - Detailed error handling with fallback options
  
- **User Experience**
  - Responsive interface for all devices
  - Auto-hiding controls during playback
  - Quick channel switching
  - Pagination for large playlists
  - "Force reconnect" option for problematic streams
  - CORS proxy option for region-restricted content

## Getting Started

This project uses React with TypeScript.

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Loading Content

- **Upload M3U File**: Load a playlist from your local device
- **Load from URL**: Fetch a playlist directly from a URL (with optional CORS proxy)
- **Direct Stream URL**: Enter a single stream URL to play without a playlist
- **Saved Playlists**: Select from previously loaded playlists

### Browsing Channels

- Browse channels by group
- Use the search function to find specific channels or content
- Mark channels as favorites for quick access
- Drag groups to reorder them
- Use pagination controls for large playlists

### Playback Controls

- **Retry Stream**: Attempts to reload the stream with cache-busting
- **Force Reconnect**: More aggressive reconnection for problematic streams
- **Clear Stream**: Stop playback and return to selection screen

### Troubleshooting

- **Error Code 4**: Stream URL may be invalid, offline, or not supported
- **CORS errors**: Enable the CORS proxy option for playlist loading
- **Playback issues**: Try the "Force Reconnect" button which attempts different playback methods
- **Regional restrictions**: Some streams may only be accessible in certain regions

## Technologies Used

- **React 19** with TypeScript
- **Dexie.js** for IndexedDB storage of playlists and favorites
- **Video.js** (v8) for primary video playback
- **HLS.js** for HLS stream support
- **mpegts.js** for MPEG-TS stream support
- **Modern CSS** for responsive design

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Docker Support

This application can be run in a Docker container, making it easy to deploy anywhere.

### Using the Published Docker Image

The easiest way to use this application is to pull the pre-built image from Docker Hub:

```bash
docker pull dyay108/browsertv:latest
docker run -p 8080:80 dyay108/browsertv:latest
```

Then access the application at http://localhost:8080

### Building the Docker Image Locally

If you prefer to build the image yourself:

```bash
docker build -t browsertv .
docker run -p 8080:80 browsertv
```

### Using Docker Compose

For convenience, you can use Docker Compose to build and run the application:

```bash
docker-compose up -d
```

This will build the Docker image if it doesn't exist and run the container in detached mode.

#### Example Docker Compose Configurations

We provide two example Docker Compose files for different deployment scenarios:

1. **Simple deployment** (`docker-compose.simple.yml`):
   ```bash
   docker-compose -f docker-compose.simple.yml up -d
   ```
   This file provides a minimal configuration for just running the IPTV application.

2. **Deployment from local docker build** (`docker-compose.yml`):
   ```bash
   docker-compose up -d
   ```
   This file includes more configuration options.
   
You can customize these files to fit your specific deployment needs.

## Data Privacy

All playlists and favorites are stored locally in your browser using IndexedDB. No data is uploaded to any server.
