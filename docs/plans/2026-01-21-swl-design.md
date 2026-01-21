# SWL - Shortwave Listener Web Application

**Date:** 2026-01-21
**Status:** Approved

## Overview

SWL is a modern, mobile- and desktop-friendly web application for WebSDR radio control and listening. It provides an HF radio interface aesthetic with real-time waterfall display and RBN (Reverse Beacon Network) spot integration.

## Goals

- Connect to existing WebSDR servers (preset favorites + custom URLs)
- Support casual listening and DX hunting use cases
- Modern hybrid UI: clean layout with nostalgic touches (LED frequency display, analog S-meter)
- Entirely client-side (no backend required)
- Mobile-first responsive design with waterfall prominence

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SWL App                              │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Svelte)                                          │
│  ├── WaterfallCanvas    - WebGL-rendered FFT display        │
│  ├── FilterOverlay      - Draggable passband visualization  │
│  ├── FrequencyDisplay   - LED-style segmented readout       │
│  ├── SMeter             - Animated needle gauge             │
│  ├── ControlPanel       - Frequency/mode/bandwidth          │
│  ├── ServerPicker       - Preset + custom server list       │
│  ├── RBNSpotList        - Scrollable spot feed              │
│  └── RBNOverlay         - Callsign markers on waterfall     │
├─────────────────────────────────────────────────────────────┤
│  Connection Layer                                           │
│  ├── WebSDRClient       - Audio + waterfall WebSockets      │
│  ├── RBNClient          - Spot feed via vail-rerbn API      │
│  └── AudioEngine        - WebAudio playback + DSP           │
├─────────────────────────────────────────────────────────────┤
│  State Management (Svelte stores)                           │
│  ├── radioState         - freq, mode, bandwidth, volume     │
│  ├── serverState        - connection status, server list    │
│  └── spotState          - RBN spots, filtered by band       │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
- User tunes → updates `radioState` → sends command over WebSocket → server responds with new audio/waterfall data
- RBN feed streams in → filters by current band → updates waterfall overlay + spot list
- All state persisted to `localStorage` (last frequency, server, favorites)

## Technology Stack

- **Framework:** Svelte with Vite
- **Audio:** WebAudio API
- **Waterfall:** Canvas 2D (Phase 1), WebGL (Phase 3)
- **Styling:** CSS with dark theme, custom LED font (DSEG7)
- **Hosting:** HTTP-only (required due to WebSDR's HTTP/WS protocol)

## Visual Design

### Desktop Layout (≥768px)

```
┌────────────────────────────────────────────────────────────────┐
│ [Server: ▼ Utah SDR #2    ] [● Connected]     SWL         [⚙] │
├──────────────────────────────────────┬─────────────────────────┤
│                                      │ ╔═══════════════════╗   │
│                                      │ ║  14.205.350  kHz  ║   │
│         W A T E R F A L L            │ ╚═══════════════════╝   │
│                                      │    USB   ▸ 2.7 kHz      │
│    [RBN callsign markers overlaid]   │                         │
│    [Filter passband overlay]         │ ┌─────────────────────┐ │
│              ▼ ▼ ▼                   │ │   S  ░░░░░░░▓▓▓│   │ │
│    ════════════════════════════      │ │   1 3 5 7 9 +20+40  │ │
│    10  12  14  14.2  14.4  MHz       │ └─────────────────────┘ │
├──────────────────────────────────────┤   [Vol ════●════════]   │
│ RBN Spots           [Band ▼] [Hide]  │                         │
├──────────────────────────────────────┤ Mode: [LSB|USB|CW|AM]   │
│ ★★★ K3LR  14.023 CW  12dB  K7RA  2m  │ BW:   [◀ 2.70 kHz ▶]   │
│ ★★☆ W1AW  14.070 CW  18dB  VE3EID 30s│ [Narrow|Med|Wide]       │
│ ★☆☆ DL1AB 14.205 USB 15dB  DK3WN 1m  │                         │
└──────────────────────────────────────┴─────────────────────────┘
```

### Mobile Layout (<768px)

- Waterfall fills screen, frequency scale at bottom
- Floating frequency display (LED style) anchored top-center
- Swipe up from bottom reveals control sheet (60% height)
- RBN spots as horizontal ticker at top, or expandable in control sheet

### Filter Width Display

- **On waterfall:** Yellow/amber translucent rectangle showing passband
- **Draggable edges:** Grab left/right edge to adjust bandwidth
- **Numeric readout:** Shows bandwidth next to mode selector
- **Presets + fine control:** Quick buttons (Narrow/Med/Wide) plus drag-to-adjust

### Nostalgic Touches

- **Frequency:** 7-segment LED font, green/amber glow, slight bloom effect
- **S-Meter:** Analog needle with realistic ballistics, backlit scale
- **Tuning:** Click-drag on waterfall or frequency scale, mousewheel steps
- **Optional:** CRT scanline overlay (toggle off by default)

## WebSDR Protocol Integration

### Connection Sequence

1. User selects server → app fetches `/index1a.html` to extract band configs
2. Open audio WebSocket: `ws://{host}/~~stream?v=11`
3. Open waterfall WebSocket: `ws://{host}/~~waterstream{band}?format=9&width=1024&zoom=0&start=0`
4. Send initial tune command: `GET /~~param?freq={kHz}&mode={mode}&lo={lo}&hi={hi}`

### Audio Handling

- Decode u-law compressed audio from binary WebSocket frames
- Resample 8kHz → device sample rate (typically 48kHz) using WebAudio
- Extract embedded S-meter values (0xF0 prefix bytes)
- Apply client-side gain/mute

### Waterfall Handling

- Receive 1024-pixel FFT lines as compressed binary
- Decode delta-encoded amplitude values
- Render to Canvas/WebGL with colormap (configurable)
- Handle zoom/pan by sending `GET /~~waterparam?zoom={z}&start={s}`

### Command Protocol

| Action | Command |
|--------|---------|
| Tune | `GET /~~param?freq=14205` |
| Mode | `GET /~~param?mode=usb` |
| Filter | `GET /~~param?lo=-0.15&hi=2.7` |
| Band | `GET /~~param?band=3` |
| Mute | `GET /~~param?mute=1` |

## RBN Integration

### Data Source

Using the vail-rerbn API to fetch Reverse Beacon Network spots.

### Filtering & Display Logic

```
RBN Feed → Filter by current band (±500kHz of visible waterfall)
        → Deduplicate (same call within 60s)
        → Sort by time (newest first)
        → Limit to 50 most recent
```

### Hearability Scoring

Each spot is scored based on likelihood of being audible on the current WebSDR:

1. Each preset server includes approximate lat/lon
2. RBN spots include spotter callsign → lookup spotter location
3. Calculate great-circle distance between spotter and WebSDR
4. Apply heuristics:
   - Same continent, <1000km: ★★★ (likely audible)
   - Same continent, 1000-3000km: ★★☆ (probably audible)
   - Cross-continental, good path: ★★☆ (check band conditions)
   - Antipodal/unlikely path: ★☆☆ (unlikely)
   - Spotter very close to WebSDR (<500km): ★★★ (high confidence)

### Visual Treatment

- Stars shown as filled/empty (or color gradient)
- Waterfall labels reflect score: bright = likely, dim = unlikely
- Optional toggle: "Show only likely hearable" filter
- Color-coded by mode: CW (amber), FT8 (cyan), RTTY (green)

## Project Structure

```
~/projects/swl/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── App.svelte
│   ├── main.js
│   ├── stores/
│   │   ├── radio.js
│   │   ├── server.js
│   │   └── spots.js
│   ├── lib/
│   │   ├── websdr/
│   │   │   ├── client.js
│   │   │   ├── audio.js
│   │   │   ├── waterfall.js
│   │   │   └── protocol.js
│   │   ├── rbn/
│   │   │   ├── client.js
│   │   │   └── hearability.js
│   │   └── geo/
│   │       └── distance.js
│   ├── components/
│   │   ├── Waterfall.svelte
│   │   ├── FilterOverlay.svelte
│   │   ├── FrequencyDisplay.svelte
│   │   ├── SMeter.svelte
│   │   ├── ControlPanel.svelte
│   │   ├── ControlSheet.svelte
│   │   ├── ServerPicker.svelte
│   │   ├── SpotList.svelte
│   │   └── SpotOverlay.svelte
│   ├── data/
│   │   ├── servers.json
│   │   └── spotters.json
│   └── styles/
│       ├── global.css
│       └── led-font.css
└── public/
    └── fonts/
        └── DSEG7-Classic.woff2
```

## Implementation Phases

### Phase 1 - Core Functionality (MVP)

- [ ] Project scaffolding (Svelte + Vite)
- [ ] WebSDR connection (audio WebSocket + playback)
- [ ] Basic waterfall rendering (Canvas 2D)
- [ ] Frequency display + tuning (click waterfall to tune)
- [ ] Mode selection (USB/LSB/CW/AM/FM)
- [ ] Filter width control + waterfall overlay
- [ ] Server picker with 3-4 presets
- [ ] Mobile-responsive layout with slide-up controls

### Phase 2 - Polish & RBN

- [ ] S-Meter with needle animation
- [ ] LED 7-segment frequency styling
- [ ] RBN spot integration (fetch + display)
- [ ] Hearability scoring
- [ ] Waterfall spot overlays (clickable callsigns)
- [ ] Spot list panel with filtering
- [ ] localStorage persistence (last freq, server, favorites)

### Phase 3 - Enhancements

- [ ] WebGL waterfall (smoother, colormap options)
- [ ] Keyboard shortcuts (arrow keys tune, m=mute, etc.)
- [ ] Custom server entry + favorites management
- [ ] Band presets / memory channels
- [ ] Audio recording (download WAV)
- [ ] Optional CRT scanline effect

## Known Limitations

- **HTTP-only:** Won't work from HTTPS-hosted pages due to mixed content restrictions
- **Third-party dependency:** Relies on WebSDR servers being online and accessible
- **RBN heuristic:** Hearability scoring is based on distance, not actual propagation prediction
- **Protocol:** WebSDR protocol is proprietary (PA3FWM) - we connect as a client only

## Preset Servers

Initial server list:

| Name | URL | Location | Bands |
|------|-----|----------|-------|
| Utah SDR #2 (30-6m Omni) | websdr2.sdrutah.org:8902 | 41.55°N, 112.08°W | 30m-6m |
| Utah SDR #1 (160-40m) | websdr1.sdrutah.org:8901 | 41.55°N, 112.08°W | 160m-40m |
| K3FEF Milford, PA | k3fef.com:8901 | 41.32°N, 74.80°W | 160m-20m |
| KFS Half Moon Bay, CA | kfsdr.com | 37.5°N, 122.5°W | Various |
