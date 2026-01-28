# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SWL (Shortwave Listener) is a web application for controlling and listening to WebSDR radio servers. It provides a modern HF radio interface with real-time waterfall display, targeting both desktop and mobile browsers.

## Development Commands

```bash
# Start development (runs both Vite and WebSocket proxy)
npm run dev

# Start only Vite dev server (no proxy - WebSDR won't connect)
npm run dev:vite

# Start only the WebSocket proxy
npm run proxy

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Data Flow

```
User tunes → radioStore updates → websdrClient sends command → server responds
                                                                    ↓
                                                         audioEngine decodes
                                                                    ↓
                                                         WebAudio playback
```

### Key Layers

**Connection Layer** (`src/lib/websdr/`)
- `client.js` - WebSDRClient singleton manages WebSocket connections (audio + waterfall)
- `protocol.js` - Formats commands for PA3FWM's WebSDR protocol; contains u-law decode table
- `audio.js` - WebSDRAudioDecoder handles compressed audio decoding with prediction filter; AudioEngine manages WebAudio playback with resampling

**State Management** (`src/stores/`)
- `radio.js` - Frequency, mode, filter, volume, S-meter (Svelte writable/derived stores)
- `server.js` - Server list, connection status, current server selection

**UI Components** (`src/components/`)
- App.svelte wires callbacks between websdrClient, audioEngine, and UI components
- Desktop shows sidebar controls; mobile uses ControlSheet slide-up panel

### WebSocket Proxy

Development requires `proxy-server.js` running on port 8080 to bypass CORS. The proxy maps paths like `/utah2/~~stream` to the actual WebSDR servers. Server mappings are defined in both `proxy-server.js` and `src/stores/server.js` (must stay in sync via `proxyId`).

### WebSDR Protocol Notes

- All receiver parameters (freq, mode, filter, band) must be sent together in a single command
- Audio stream uses compressed format with prediction filter (G=7 typical)
- Waterfall uses `format=0` for uncompressed 1-byte-per-pixel FFT data
- S-meter values embedded in audio stream with 0xF0-0xFF prefix bytes

## Project Status

Phase 1 (MVP) in progress. RBN integration (Phase 2) and WebGL waterfall (Phase 3) not yet implemented.
