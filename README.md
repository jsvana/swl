# SWL - Shortwave Listener

A modern web application for listening to WebSDR radio servers. Features a real-time waterfall display, LED-style frequency readout, and analog S-meter - all in a responsive interface that works on desktop and mobile.

## Features

- Connect to WebSDR servers worldwide
- Real-time waterfall/spectrum display
- LED 7-segment frequency display
- Analog S-meter with needle animation
- Mode selection (USB, LSB, CW, AM, FM)
- Adjustable filter bandwidth
- Mobile-responsive with slide-up control sheet
- Preset server list (Utah SDR, K3FEF, KFS)

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/jsvana/swl.git
cd swl
npm install
```

### Running

```bash
npm run dev
```

This starts both the Vite dev server (http://localhost:5173) and the WebSocket proxy (port 8080). The proxy is required because WebSDR servers don't support CORS.

Open http://localhost:5173 in your browser, select a server, and click Connect.

### Building for Production

```bash
npm run build
```

The built files will be in `dist/`. Note: Production deployment requires hosting the WebSocket proxy or running from the same origin as the WebSDR server.

## Usage

1. **Select a server** from the dropdown (defaults to Utah SDR #2)
2. **Click Connect** to start receiving audio and waterfall data
3. **Click on the waterfall** to tune to a frequency
4. **Adjust mode** (USB/LSB/CW/AM/FM) using the mode buttons
5. **Adjust filter width** using the bandwidth control

### Keyboard Shortcuts

*Coming in Phase 3*

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SWL App                              │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Svelte)                                          │
│  ├── Waterfall         - Canvas-rendered FFT display        │
│  ├── FrequencyDisplay  - LED-style segmented readout        │
│  ├── SMeter            - Animated needle gauge              │
│  ├── ControlPanel      - Frequency/mode/bandwidth           │
│  └── ServerPicker      - Preset server list                 │
├─────────────────────────────────────────────────────────────┤
│  Connection Layer                                           │
│  ├── WebSDRClient      - Audio + waterfall WebSockets       │
│  ├── AudioDecoder      - Compressed audio decompression     │
│  └── AudioEngine       - WebAudio playback + resampling     │
├─────────────────────────────────────────────────────────────┤
│  State Management (Svelte stores)                           │
│  ├── radioStore        - freq, mode, bandwidth, volume      │
│  └── serverStore       - connection status, server list     │
└─────────────────────────────────────────────────────────────┘
```

## Preset Servers

| Name | Location | Bands |
|------|----------|-------|
| Utah SDR #2 | Corinne, UT | 30m - 6m |
| Utah SDR #1 | Corinne, UT | 160m - 40m |
| K3FEF | Milford, PA | 160m - 20m |
| KFS | Half Moon Bay, CA | Various |

## Known Limitations

- **HTTP only**: WebSDR uses unencrypted WebSocket connections. The app won't work when served over HTTPS due to mixed content restrictions.
- **Proxy required**: Development requires the included proxy server. Production deployment needs equivalent proxy infrastructure.
- **Third-party servers**: Depends on WebSDR servers being online and accessible.

## Roadmap

- [x] Phase 1: Core functionality (audio, waterfall, basic controls)
- [ ] Phase 2: RBN spot integration with hearability scoring
- [ ] Phase 3: WebGL waterfall, keyboard shortcuts, audio recording

## Technology

- [Svelte](https://svelte.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio playback
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Waterfall rendering

## Credits

- WebSDR protocol by PA3FWM (Pieter-Tjerk de Boer)
- WebSDR server operators worldwide

## License

MIT
