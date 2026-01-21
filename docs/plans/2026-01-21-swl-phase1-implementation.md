# SWL Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a functional WebSDR client with audio playback, waterfall display, and basic tuning controls.

**Architecture:** Svelte/Vite SPA connecting to WebSDR servers via WebSocket. Audio decoded from u-law and played via WebAudio API. Waterfall rendered to Canvas 2D. State managed via Svelte stores.

**Tech Stack:** Svelte 4, Vite 5, WebAudio API, Canvas 2D, CSS (no framework)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.svelte`
- Create: `src/styles/global.css`

**Step 1: Initialize npm project and install dependencies**

Run:
```bash
cd ~/projects/swl
npm init -y
npm install svelte@4 @sveltejs/vite-plugin-svelte@3 vite@5
```

**Step 2: Create vite.config.js**

Create `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173
  }
});
```

**Step 3: Create svelte.config.js**

Create `svelte.config.js`:
```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess()
};
```

**Step 4: Create index.html**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWL - Shortwave Listener</title>
  <link rel="stylesheet" href="/src/styles/global.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 5: Create global.css**

Create `src/styles/global.css`:
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-panel: #1f2940;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --accent-green: #00ff88;
  --accent-amber: #ffaa00;
  --accent-red: #ff4444;
  --filter-yellow: rgba(255, 200, 0, 0.3);
  --border-color: #333;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

#app {
  height: 100%;
}

button {
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

button:hover {
  background: var(--bg-panel);
}

button.active {
  background: var(--accent-green);
  color: var(--bg-primary);
}

select, input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem;
  border-radius: 4px;
}
```

**Step 6: Create main.js**

Create `src/main.js`:
```javascript
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
```

**Step 7: Create App.svelte**

Create `src/App.svelte`:
```svelte
<script>
  let serverName = 'Utah SDR #2';
  let connected = false;
</script>

<main>
  <header>
    <div class="server-info">
      <span class="server-name">{serverName}</span>
      <span class="status" class:connected>
        {connected ? '● Connected' : '○ Disconnected'}
      </span>
    </div>
    <h1>SWL</h1>
  </header>

  <div class="content">
    <p>WebSDR Client - Phase 1</p>
  </div>
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .server-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .server-name {
    font-weight: 600;
  }

  .status {
    font-size: 0.875rem;
    color: var(--accent-red);
  }

  .status.connected {
    color: var(--accent-green);
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

**Step 8: Update package.json scripts**

Modify `package.json` to add scripts:
```json
{
  "name": "swl",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "svelte": "^4.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "vite": "^5.0.0"
  }
}
```

**Step 9: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts at http://localhost:5173, shows "SWL" header and placeholder content

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Svelte/Vite project with basic layout"
```

---

### Task 2: Svelte Stores for State Management

**Files:**
- Create: `src/stores/radio.js`
- Create: `src/stores/server.js`

**Step 1: Create radio store**

Create `src/stores/radio.js`:
```javascript
import { writable, derived } from 'svelte/store';

// Frequency in kHz
export const frequency = writable(14200);

// Mode: 'usb', 'lsb', 'cw', 'am', 'fm'
export const mode = writable('usb');

// Filter edges in kHz relative to carrier
export const filterLow = writable(0.15);
export const filterHigh = writable(2.7);

// Volume 0-1
export const volume = writable(0.5);

// Muted state
export const muted = writable(false);

// S-meter value in dBm
export const smeter = writable(-120);

// Derived: bandwidth in kHz
export const bandwidth = derived(
  [filterLow, filterHigh],
  ([$lo, $hi]) => Math.abs($hi - $lo)
);

// Derived: formatted frequency string
export const frequencyDisplay = derived(
  frequency,
  ($freq) => {
    const mhz = Math.floor($freq / 1000);
    const khz = ($freq % 1000).toFixed(3).padStart(7, '0');
    return `${mhz}.${khz}`;
  }
);

// Mode presets for filter widths
export const modePresets = {
  usb: { lo: 0.15, hi: 2.7 },
  lsb: { lo: -2.7, hi: -0.15 },
  cw: { lo: -0.95, hi: -0.55 },
  am: { lo: -4, hi: 4 },
  fm: { lo: -8, hi: 8 }
};

// Set mode with default filter
export function setMode(newMode) {
  mode.set(newMode);
  const preset = modePresets[newMode];
  if (preset) {
    filterLow.set(preset.lo);
    filterHigh.set(preset.hi);
  }
}

// Tune to frequency
export function tune(freqKhz) {
  frequency.set(freqKhz);
}

// Step frequency by delta kHz
export function step(deltaKhz) {
  frequency.update(f => f + deltaKhz);
}
```

**Step 2: Create server store**

Create `src/stores/server.js`:
```javascript
import { writable, derived } from 'svelte/store';

// Preset servers
export const presetServers = [
  {
    id: 'utah-sdr2',
    name: 'Utah SDR #2 (30-6m Omni)',
    url: 'websdr2.sdrutah.org:8902',
    location: { lat: 41.55, lon: -112.08 },
    bands: ['30m', '20m', '17m', '15m', '12m', '10m', '6m']
  },
  {
    id: 'utah-sdr1',
    name: 'Utah SDR #1 (160-40m)',
    url: 'websdr1.sdrutah.org:8901',
    location: { lat: 41.55, lon: -112.08 },
    bands: ['160m', '80m', '60m', '40m']
  },
  {
    id: 'k3fef',
    name: 'K3FEF Milford, PA',
    url: 'k3fef.com:8901',
    location: { lat: 41.32, lon: -74.80 },
    bands: ['160m', '80m', '40m', '20m']
  },
  {
    id: 'kfs',
    name: 'KFS Half Moon Bay, CA',
    url: 'kfsdr.com:8901',
    location: { lat: 37.5, lon: -122.5 },
    bands: ['Various']
  }
];

// Currently selected server
export const currentServer = writable(presetServers[0]);

// Connection status: 'disconnected', 'connecting', 'connected', 'error'
export const connectionStatus = writable('disconnected');

// Error message if any
export const connectionError = writable(null);

// Derived: is connected
export const isConnected = derived(
  connectionStatus,
  $status => $status === 'connected'
);

// Select a server by id
export function selectServer(serverId) {
  const server = presetServers.find(s => s.id === serverId);
  if (server) {
    currentServer.set(server);
    connectionStatus.set('disconnected');
    connectionError.set(null);
  }
}
```

**Step 3: Commit**

```bash
git add src/stores/
git commit -m "feat: add Svelte stores for radio and server state"
```

---

### Task 3: WebSDR Protocol Layer

**Files:**
- Create: `src/lib/websdr/protocol.js`
- Create: `src/lib/websdr/client.js`

**Step 1: Create protocol helper**

Create `src/lib/websdr/protocol.js`:
```javascript
// Format commands for WebSDR server

export function formatTuneCommand(freqKhz) {
  return `GET /~~param?freq=${freqKhz}`;
}

export function formatModeCommand(mode) {
  return `GET /~~param?mode=${mode}`;
}

export function formatFilterCommand(lo, hi) {
  return `GET /~~param?lo=${lo}&hi=${hi}`;
}

export function formatBandCommand(band) {
  return `GET /~~param?band=${band}`;
}

export function formatMuteCommand(muted) {
  return `GET /~~param?mute=${muted ? 1 : 0}`;
}

export function formatWaterfallParamCommand(params) {
  const parts = [];
  if (params.zoom !== undefined) parts.push(`zoom=${params.zoom}`);
  if (params.start !== undefined) parts.push(`start=${params.start}`);
  if (params.width !== undefined) parts.push(`width=${params.width}`);
  if (params.band !== undefined) parts.push(`band=${params.band}`);
  return `GET /~~waterparam?${parts.join('&')}`;
}

// U-law decoding table (256 entries)
export const ULAW_TABLE = new Int16Array([
  -5504, -5248, -6016, -5760, -4480, -4224, -4992, -4736,
  -7552, -7296, -8064, -7808, -6528, -6272, -7040, -6784,
  -2752, -2624, -3008, -2880, -2240, -2112, -2496, -2368,
  -3776, -3648, -4032, -3904, -3264, -3136, -3520, -3392,
  -22016, -20992, -24064, -23040, -17920, -16896, -19968, -18944,
  -30208, -29184, -32256, -31232, -26112, -25088, -28160, -27136,
  -11008, -10496, -12032, -11520, -8960, -8448, -9984, -9472,
  -15104, -14592, -16128, -15616, -13056, -12544, -14080, -13568,
  -344, -328, -376, -360, -280, -264, -312, -296,
  -472, -456, -504, -488, -408, -392, -440, -424,
  -88, -72, -120, -104, -24, -8, -56, -40,
  -216, -200, -248, -232, -152, -136, -184, -168,
  -1376, -1312, -1504, -1440, -1120, -1056, -1248, -1184,
  -1888, -1824, -2016, -1952, -1632, -1568, -1760, -1696,
  -688, -656, -752, -720, -560, -528, -624, -592,
  -944, -912, -1008, -976, -816, -784, -880, -848,
  5504, 5248, 6016, 5760, 4480, 4224, 4992, 4736,
  7552, 7296, 8064, 7808, 6528, 6272, 7040, 6784,
  2752, 2624, 3008, 2880, 2240, 2112, 2496, 2368,
  3776, 3648, 4032, 3904, 3264, 3136, 3520, 3392,
  22016, 20992, 24064, 23040, 17920, 16896, 19968, 18944,
  30208, 29184, 32256, 31232, 26112, 25088, 28160, 27136,
  11008, 10496, 12032, 11520, 8960, 8448, 9984, 9472,
  15104, 14592, 16128, 15616, 13056, 12544, 14080, 13568,
  344, 328, 376, 360, 280, 264, 312, 296,
  472, 456, 504, 488, 408, 392, 440, 424,
  88, 72, 120, 104, 24, 8, 56, 40,
  216, 200, 248, 232, 152, 136, 184, 168,
  1376, 1312, 1504, 1440, 1120, 1056, 1248, 1184,
  1888, 1824, 2016, 1952, 1632, 1568, 1760, 1696,
  688, 656, 752, 720, 560, 528, 624, 592,
  944, 912, 1008, 976, 816, 784, 880, 848
]);
```

**Step 2: Create WebSDR client**

Create `src/lib/websdr/client.js`:
```javascript
import {
  formatTuneCommand,
  formatModeCommand,
  formatFilterCommand,
  formatMuteCommand
} from './protocol.js';

export class WebSDRClient {
  constructor() {
    this.audioSocket = null;
    this.waterfallSocket = null;
    this.serverUrl = null;
    this.onAudioData = null;
    this.onWaterfallData = null;
    this.onSmeterUpdate = null;
    this.onStatusChange = null;
    this.onError = null;
  }

  connect(serverUrl) {
    this.serverUrl = serverUrl;
    this.disconnect();

    this._notifyStatus('connecting');

    // Connect audio WebSocket
    try {
      this.audioSocket = new WebSocket(`ws://${serverUrl}/~~stream?v=11`);
      this.audioSocket.binaryType = 'arraybuffer';

      this.audioSocket.onopen = () => {
        this._notifyStatus('connected');
      };

      this.audioSocket.onmessage = (event) => {
        this._handleAudioMessage(event.data);
      };

      this.audioSocket.onerror = (error) => {
        this._notifyError('Audio connection error');
      };

      this.audioSocket.onclose = () => {
        this._notifyStatus('disconnected');
      };
    } catch (e) {
      this._notifyError(`Failed to connect: ${e.message}`);
    }
  }

  connectWaterfall(band = 0, width = 1024, zoom = 0, start = 0) {
    if (!this.serverUrl) return;

    if (this.waterfallSocket) {
      this.waterfallSocket.close();
    }

    try {
      const url = `ws://${this.serverUrl}/~~waterstream${band}?format=9&width=${width}&zoom=${zoom}&start=${start}`;
      this.waterfallSocket = new WebSocket(url);
      this.waterfallSocket.binaryType = 'arraybuffer';

      this.waterfallSocket.onmessage = (event) => {
        this._handleWaterfallMessage(event.data);
      };

      this.waterfallSocket.onerror = () => {
        // Waterfall errors are non-fatal
        console.warn('Waterfall connection error');
      };
    } catch (e) {
      console.warn('Failed to connect waterfall:', e);
    }
  }

  disconnect() {
    if (this.audioSocket) {
      this.audioSocket.close();
      this.audioSocket = null;
    }
    if (this.waterfallSocket) {
      this.waterfallSocket.close();
      this.waterfallSocket = null;
    }
    this._notifyStatus('disconnected');
  }

  // Send command over audio socket
  send(command) {
    if (this.audioSocket && this.audioSocket.readyState === WebSocket.OPEN) {
      this.audioSocket.send(command);
    }
  }

  tune(freqKhz) {
    this.send(formatTuneCommand(freqKhz));
  }

  setMode(mode) {
    this.send(formatModeCommand(mode));
  }

  setFilter(lo, hi) {
    this.send(formatFilterCommand(lo, hi));
  }

  setMute(muted) {
    this.send(formatMuteCommand(muted));
  }

  _handleAudioMessage(data) {
    const bytes = new Uint8Array(data);

    // Parse message - look for control bytes
    let audioStart = 0;
    let smeterValue = null;

    for (let i = 0; i < bytes.length; i++) {
      // S-meter: 0xF0 prefix
      if ((bytes[i] & 0xF0) === 0xF0 && i + 1 < bytes.length) {
        smeterValue = ((bytes[i] & 0x0F) << 8) | bytes[i + 1];
        i++; // Skip next byte
        audioStart = i + 1;
      }
      // Sample rate: 0x81
      else if (bytes[i] === 0x81 && i + 2 < bytes.length) {
        const sampleRate = (bytes[i + 1] << 8) | bytes[i + 2];
        i += 2;
        audioStart = i + 1;
      }
    }

    if (smeterValue !== null && this.onSmeterUpdate) {
      // Convert to dBm (rough approximation)
      const dbm = -140 + (smeterValue / 10);
      this.onSmeterUpdate(dbm);
    }

    if (this.onAudioData && audioStart < bytes.length) {
      this.onAudioData(bytes.subarray(audioStart));
    }
  }

  _handleWaterfallMessage(data) {
    const bytes = new Uint8Array(data);

    // Check for control message (255, 255 prefix)
    if (bytes[0] === 255 && bytes[1] !== 255) {
      // Control message, skip
      return;
    }

    // Skip any control prefix
    let dataStart = 0;
    if (bytes[0] === 255 && bytes[1] === 255) {
      dataStart = 2;
    }

    if (this.onWaterfallData) {
      this.onWaterfallData(bytes.subarray(dataStart));
    }
  }

  _notifyStatus(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  _notifyError(message) {
    this._notifyStatus('error');
    if (this.onError) {
      this.onError(message);
    }
  }
}

// Singleton instance
export const websdrClient = new WebSDRClient();
```

**Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: add WebSDR protocol and client layer"
```

---

### Task 4: Audio Engine

**Files:**
- Create: `src/lib/websdr/audio.js`

**Step 1: Create audio engine**

Create `src/lib/websdr/audio.js`:
```javascript
import { ULAW_TABLE } from './protocol.js';

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.scriptProcessor = null;
    this.sampleBuffer = new Int16Array(32768);
    this.writePos = 0;
    this.readPos = 0;
    this.sourceSampleRate = 8000;
    this.started = false;
    this.volume = 0.5;
    this.muted = false;
  }

  async start() {
    if (this.started) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Create script processor for audio output
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 0, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        this._processAudio(event);
      };

      this.scriptProcessor.connect(this.gainNode);
      this.started = true;
    } catch (e) {
      console.error('Failed to start audio:', e);
      throw e;
    }
  }

  stop() {
    if (!this.started) return;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.started = false;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && !this.muted) {
      this.gainNode.gain.value = this.volume;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : this.volume;
    }
  }

  // Feed encoded audio data from WebSocket
  feedData(data) {
    // Decode u-law to PCM
    for (let i = 0; i < data.length; i++) {
      const sample = ULAW_TABLE[data[i]];
      this.sampleBuffer[this.writePos] = sample;
      this.writePos = (this.writePos + 1) % this.sampleBuffer.length;
    }
  }

  _processAudio(event) {
    const output = event.outputBuffer.getChannelData(0);
    const outputRate = this.audioContext.sampleRate;
    const ratio = this.sourceSampleRate / outputRate;

    for (let i = 0; i < output.length; i++) {
      // Simple linear interpolation resampling
      const srcPos = this.readPos + (i * ratio);
      const srcIndex = Math.floor(srcPos) % this.sampleBuffer.length;
      const nextIndex = (srcIndex + 1) % this.sampleBuffer.length;
      const frac = srcPos - Math.floor(srcPos);

      const sample1 = this.sampleBuffer[srcIndex];
      const sample2 = this.sampleBuffer[nextIndex];
      const interpolated = sample1 + (sample2 - sample1) * frac;

      // Convert to float (-1 to 1)
      output[i] = interpolated / 32768;
    }

    // Advance read position
    this.readPos = (this.readPos + Math.floor(output.length * ratio)) % this.sampleBuffer.length;
  }

  // Get buffer fill level (0-1)
  getBufferLevel() {
    const used = (this.writePos - this.readPos + this.sampleBuffer.length) % this.sampleBuffer.length;
    return used / this.sampleBuffer.length;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
```

**Step 2: Commit**

```bash
git add src/lib/websdr/audio.js
git commit -m "feat: add WebAudio engine with u-law decoding"
```

---

### Task 5: Basic Waterfall Component

**Files:**
- Create: `src/components/Waterfall.svelte`

**Step 1: Create Waterfall component**

Create `src/components/Waterfall.svelte`:
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { frequency, filterLow, filterHigh } from '../stores/radio.js';

  export let width = 1024;
  export let height = 200;
  export let minFreq = 14000; // kHz
  export let maxFreq = 14350; // kHz

  let canvas;
  let ctx;
  let imageData;
  let waterfallData = new Uint8Array(width);

  // Color map: intensity (0-255) to RGB
  function getColor(intensity) {
    // Blue -> Cyan -> Yellow -> White
    if (intensity < 64) {
      return [0, 0, intensity * 2];
    } else if (intensity < 128) {
      const t = intensity - 64;
      return [0, t * 4, 128 + t * 2];
    } else if (intensity < 192) {
      const t = intensity - 128;
      return [t * 4, 255, 255 - t * 4];
    } else {
      const t = intensity - 192;
      return [255, 255, t * 4];
    }
  }

  // Convert frequency to x position
  function freqToX(freqKhz) {
    return ((freqKhz - minFreq) / (maxFreq - minFreq)) * width;
  }

  // Convert x position to frequency
  function xToFreq(x) {
    return minFreq + (x / width) * (maxFreq - minFreq);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    imageData = ctx.createImageData(width, 1);
  });

  // Receive new waterfall line
  export function pushLine(data) {
    if (!ctx || !imageData) return;

    // Scroll existing content down
    const existing = ctx.getImageData(0, 0, width, height - 1);
    ctx.putImageData(existing, 0, 1);

    // Draw new line at top
    for (let i = 0; i < Math.min(data.length, width); i++) {
      const [r, g, b] = getColor(data[i]);
      imageData.data[i * 4] = r;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = b;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Handle click to tune
  function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const newFreq = xToFreq(x);
    frequency.set(Math.round(newFreq * 10) / 10);
  }

  // Draw filter overlay
  $: filterX1 = freqToX($frequency + $filterLow);
  $: filterX2 = freqToX($frequency + $filterHigh);
  $: filterWidth = Math.abs(filterX2 - filterX1);
  $: filterLeft = Math.min(filterX1, filterX2);
  $: carrierX = freqToX($frequency);
</script>

<div class="waterfall-container" style="width: {width}px; height: {height}px;">
  <canvas
    bind:this={canvas}
    {width}
    {height}
    on:click={handleClick}
  />

  <!-- Filter overlay -->
  <div
    class="filter-overlay"
    style="left: {filterLeft}px; width: {filterWidth}px;"
  />

  <!-- Carrier line -->
  <div
    class="carrier-line"
    style="left: {carrierX}px;"
  />
</div>

<style>
  .waterfall-container {
    position: relative;
    background: #000;
    cursor: crosshair;
  }

  canvas {
    display: block;
  }

  .filter-overlay {
    position: absolute;
    top: 0;
    height: 100%;
    background: var(--filter-yellow);
    pointer-events: none;
  }

  .carrier-line {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: var(--accent-amber);
    pointer-events: none;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/Waterfall.svelte
git commit -m "feat: add Canvas-based Waterfall component with filter overlay"
```

---

### Task 6: Frequency Display Component

**Files:**
- Create: `src/components/FrequencyDisplay.svelte`
- Create: `src/styles/led-font.css`

**Step 1: Create LED font CSS**

Create `src/styles/led-font.css`:
```css
/* Using CSS for 7-segment style - fallback if no font loaded */
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.led-display {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  letter-spacing: 0.05em;
}
```

**Step 2: Create FrequencyDisplay component**

Create `src/components/FrequencyDisplay.svelte`:
```svelte
<script>
  import { frequency, mode, bandwidth } from '../stores/radio.js';
  import '../styles/led-font.css';

  // Format frequency for display: 14.205.350
  $: freqMhz = Math.floor($frequency / 1000);
  $: freqKhz = Math.floor($frequency % 1000);
  $: freqHz = Math.round(($frequency % 1) * 1000);

  $: displayFreq = `${freqMhz}.${String(freqKhz).padStart(3, '0')}.${String(freqHz).padStart(3, '0')}`;
</script>

<div class="frequency-display">
  <div class="freq-value led-display">
    <span class="freq-digits">{displayFreq}</span>
    <span class="freq-unit">kHz</span>
  </div>
  <div class="mode-info">
    <span class="mode">{$mode.toUpperCase()}</span>
    <span class="bandwidth">{$bandwidth.toFixed(2)} kHz</span>
  </div>
</div>

<style>
  .frequency-display {
    background: #111;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    text-align: center;
  }

  .freq-value {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.5rem;
  }

  .freq-digits {
    font-size: 2rem;
    color: var(--accent-green);
    text-shadow: 0 0 10px var(--accent-green);
  }

  .freq-unit {
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .mode-info {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }

  .mode {
    color: var(--accent-amber);
    font-weight: 600;
  }

  .bandwidth {
    color: var(--text-secondary);
  }
</style>
```

**Step 3: Commit**

```bash
git add src/components/FrequencyDisplay.svelte src/styles/led-font.css
git commit -m "feat: add LED-style FrequencyDisplay component"
```

---

### Task 7: Control Panel Component

**Files:**
- Create: `src/components/ControlPanel.svelte`

**Step 1: Create ControlPanel component**

Create `src/components/ControlPanel.svelte`:
```svelte
<script>
  import { frequency, mode, filterLow, filterHigh, volume, muted, setMode, step } from '../stores/radio.js';
  import { websdrClient } from '../lib/websdr/client.js';
  import { audioEngine } from '../lib/websdr/audio.js';

  const modes = ['lsb', 'usb', 'cw', 'am', 'fm'];
  const stepSizes = [0.01, 0.1, 1, 5, 10];
  let currentStep = 1; // kHz

  function handleModeChange(newMode) {
    setMode(newMode);
    websdrClient.setMode(newMode);
    websdrClient.setFilter($filterLow, $filterHigh);
  }

  function handleTuneStep(delta) {
    step(delta * currentStep);
    websdrClient.tune($frequency);
  }

  function handleVolumeChange(event) {
    const newVolume = parseFloat(event.target.value);
    volume.set(newVolume);
    audioEngine.setVolume(newVolume);
  }

  function handleMuteToggle() {
    muted.update(m => !m);
    audioEngine.setMuted($muted);
    websdrClient.setMute($muted);
  }

  function handleFreqInput(event) {
    if (event.key === 'Enter') {
      const val = parseFloat(event.target.value);
      if (!isNaN(val)) {
        frequency.set(val);
        websdrClient.tune(val);
      }
    }
  }
</script>

<div class="control-panel">
  <!-- Frequency Entry -->
  <div class="control-group">
    <label>Frequency (kHz)</label>
    <input
      type="number"
      value={$frequency}
      step={currentStep}
      on:keydown={handleFreqInput}
    />
  </div>

  <!-- Tune Buttons -->
  <div class="control-group">
    <label>Tune</label>
    <div class="button-row">
      <button on:click={() => handleTuneStep(-1)}>◀</button>
      <select bind:value={currentStep}>
        {#each stepSizes as size}
          <option value={size}>{size} kHz</option>
        {/each}
      </select>
      <button on:click={() => handleTuneStep(1)}>▶</button>
    </div>
  </div>

  <!-- Mode Selection -->
  <div class="control-group">
    <label>Mode</label>
    <div class="button-row mode-buttons">
      {#each modes as m}
        <button
          class:active={$mode === m}
          on:click={() => handleModeChange(m)}
        >
          {m.toUpperCase()}
        </button>
      {/each}
    </div>
  </div>

  <!-- Volume -->
  <div class="control-group">
    <label>Volume</label>
    <div class="volume-row">
      <button class:active={$muted} on:click={handleMuteToggle}>
        {$muted ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={$volume}
        on:input={handleVolumeChange}
        disabled={$muted}
      />
    </div>
  </div>
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-panel);
    border-radius: 8px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-group label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .mode-buttons {
    flex-wrap: wrap;
  }

  .mode-buttons button {
    flex: 1;
    min-width: 3rem;
  }

  .volume-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .volume-row input[type="range"] {
    flex: 1;
  }

  input[type="number"] {
    width: 100%;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/ControlPanel.svelte
git commit -m "feat: add ControlPanel with mode, tuning, and volume controls"
```

---

### Task 8: Server Picker Component

**Files:**
- Create: `src/components/ServerPicker.svelte`

**Step 1: Create ServerPicker component**

Create `src/components/ServerPicker.svelte`:
```svelte
<script>
  import { presetServers, currentServer, connectionStatus, selectServer } from '../stores/server.js';

  function handleServerChange(event) {
    selectServer(event.target.value);
  }
</script>

<div class="server-picker">
  <select value={$currentServer.id} on:change={handleServerChange}>
    {#each presetServers as server}
      <option value={server.id}>{server.name}</option>
    {/each}
  </select>

  <span class="status" class:connected={$connectionStatus === 'connected'} class:error={$connectionStatus === 'error'}>
    {#if $connectionStatus === 'connected'}
      ● Connected
    {:else if $connectionStatus === 'connecting'}
      ○ Connecting...
    {:else if $connectionStatus === 'error'}
      ✕ Error
    {:else}
      ○ Disconnected
    {/if}
  </span>
</div>

<style>
  .server-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  select {
    min-width: 200px;
  }

  .status {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .status.connected {
    color: var(--accent-green);
  }

  .status.error {
    color: var(--accent-red);
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/ServerPicker.svelte
git commit -m "feat: add ServerPicker component with preset servers"
```

---

### Task 9: S-Meter Component

**Files:**
- Create: `src/components/SMeter.svelte`

**Step 1: Create SMeter component**

Create `src/components/SMeter.svelte`:
```svelte
<script>
  import { smeter } from '../stores/radio.js';

  // S-meter scale: S0=-127dBm, S9=-73dBm, each S-unit is 6dB
  // Above S9: +10dB steps

  function dbmToPercent(dbm) {
    // Range: -130 dBm (0%) to -33 dBm (100%)
    const min = -130;
    const max = -33;
    return Math.max(0, Math.min(100, ((dbm - min) / (max - min)) * 100));
  }

  function dbmToSUnit(dbm) {
    if (dbm < -127) return 'S0';
    if (dbm >= -73) {
      const over = Math.round(dbm + 73);
      return `S9+${Math.max(0, over)}`;
    }
    const sUnit = Math.round((dbm + 127) / 6);
    return `S${Math.min(9, sUnit)}`;
  }

  $: percent = dbmToPercent($smeter);
  $: sUnit = dbmToSUnit($smeter);
  $: needleRotation = -45 + (percent * 0.9); // -45 to +45 degrees
</script>

<div class="smeter">
  <div class="scale">
    <span>1</span>
    <span>3</span>
    <span>5</span>
    <span>7</span>
    <span>9</span>
    <span class="over">+20</span>
    <span class="over">+40</span>
  </div>

  <div class="meter-body">
    <div class="bar" style="width: {percent}%"></div>
    <div class="needle" style="transform: rotate({needleRotation}deg)"></div>
  </div>

  <div class="reading">
    <span class="sunit">{sUnit}</span>
    <span class="dbm">{$smeter.toFixed(0)} dBm</span>
  </div>
</div>

<style>
  .smeter {
    background: #111;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 0.5rem;
  }

  .scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.625rem;
    color: var(--text-secondary);
    padding: 0 0.25rem;
    margin-bottom: 0.25rem;
  }

  .scale .over {
    color: var(--accent-red);
  }

  .meter-body {
    position: relative;
    height: 12px;
    background: #222;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    background: linear-gradient(to right, var(--accent-green), var(--accent-amber), var(--accent-red));
    transition: width 0.1s ease-out;
  }

  .needle {
    position: absolute;
    top: 50%;
    left: 0;
    width: 50%;
    height: 2px;
    background: white;
    transform-origin: left center;
    transition: transform 0.1s ease-out;
    display: none; /* Hidden for bar style, enable for needle style */
  }

  .reading {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .sunit {
    color: var(--accent-green);
    font-weight: 600;
  }

  .dbm {
    color: var(--text-secondary);
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/SMeter.svelte
git commit -m "feat: add S-Meter component with bar display"
```

---

### Task 10: Mobile Control Sheet

**Files:**
- Create: `src/components/ControlSheet.svelte`

**Step 1: Create ControlSheet component**

Create `src/components/ControlSheet.svelte`:
```svelte
<script>
  import { spring } from 'svelte/motion';
  import ControlPanel from './ControlPanel.svelte';
  import FrequencyDisplay from './FrequencyDisplay.svelte';
  import SMeter from './SMeter.svelte';

  let isOpen = false;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const sheetY = spring(0, { stiffness: 0.2, damping: 0.8 });

  function toggleSheet() {
    isOpen = !isOpen;
    sheetY.set(isOpen ? -60 : 0); // -60vh when open
  }

  function handleTouchStart(event) {
    startY = event.touches[0].clientY;
    isDragging = true;
  }

  function handleTouchMove(event) {
    if (!isDragging) return;
    currentY = event.touches[0].clientY;
    const delta = ((startY - currentY) / window.innerHeight) * 100;
    const newY = isOpen ? Math.min(0, -60 + delta) : Math.max(-60, -delta);
    sheetY.set(newY);
  }

  function handleTouchEnd() {
    isDragging = false;
    // Snap to open or closed
    if ($sheetY < -30) {
      isOpen = true;
      sheetY.set(-60);
    } else {
      isOpen = false;
      sheetY.set(0);
    }
  }
</script>

<div
  class="control-sheet"
  style="transform: translateY({$sheetY}vh)"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
>
  <div class="handle" on:click={toggleSheet}>
    <div class="handle-bar"></div>
  </div>

  <div class="sheet-content">
    <div class="quick-info">
      <FrequencyDisplay />
      <SMeter />
    </div>

    <div class="full-controls" class:visible={isOpen}>
      <ControlPanel />
    </div>
  </div>
</div>

<style>
  .control-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70vh;
    background: var(--bg-secondary);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    transform: translateY(0);
    transition: transform 0.1s;
    z-index: 100;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  }

  .handle {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    cursor: grab;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: var(--text-secondary);
    border-radius: 2px;
  }

  .sheet-content {
    padding: 0 1rem 1rem;
    height: calc(100% - 2rem);
    overflow-y: auto;
  }

  .quick-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .full-controls {
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.2s, transform 0.2s;
  }

  .full-controls.visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/ControlSheet.svelte
git commit -m "feat: add mobile ControlSheet with swipe gesture"
```

---

### Task 11: Integrate All Components in App

**Files:**
- Modify: `src/App.svelte`

**Step 1: Update App.svelte with full layout**

Replace `src/App.svelte`:
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentServer, connectionStatus } from './stores/server.js';
  import { frequency, mode, filterLow, filterHigh, smeter } from './stores/radio.js';
  import { websdrClient } from './lib/websdr/client.js';
  import { audioEngine } from './lib/websdr/audio.js';

  import ServerPicker from './components/ServerPicker.svelte';
  import Waterfall from './components/Waterfall.svelte';
  import FrequencyDisplay from './components/FrequencyDisplay.svelte';
  import SMeter from './components/SMeter.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import ControlSheet from './components/ControlSheet.svelte';

  let waterfall;
  let isMobile = false;

  // Check if mobile
  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Set up WebSDR client callbacks
    websdrClient.onStatusChange = (status) => {
      connectionStatus.set(status);
    };

    websdrClient.onError = (error) => {
      console.error('WebSDR error:', error);
    };

    websdrClient.onAudioData = (data) => {
      audioEngine.feedData(data);
    };

    websdrClient.onWaterfallData = (data) => {
      if (waterfall) {
        waterfall.pushLine(data);
      }
    };

    websdrClient.onSmeterUpdate = (value) => {
      smeter.set(value);
    };
  });

  onDestroy(() => {
    window.removeEventListener('resize', checkMobile);
    websdrClient.disconnect();
    audioEngine.stop();
  });

  // Connect when server changes
  async function handleConnect() {
    try {
      await audioEngine.start();
      websdrClient.connect($currentServer.url);
      websdrClient.connectWaterfall(0, 1024, 0, 0);

      // Send initial settings
      setTimeout(() => {
        websdrClient.tune($frequency);
        websdrClient.setMode($mode);
        websdrClient.setFilter($filterLow, $filterHigh);
      }, 500);
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }

  function handleDisconnect() {
    websdrClient.disconnect();
    audioEngine.stop();
  }

  $: isConnected = $connectionStatus === 'connected';
</script>

<main class:mobile={isMobile}>
  <header>
    <ServerPicker />
    <div class="header-actions">
      {#if isConnected}
        <button on:click={handleDisconnect}>Disconnect</button>
      {:else}
        <button class="connect-btn" on:click={handleConnect}>Connect</button>
      {/if}
      <h1>SWL</h1>
    </div>
  </header>

  <div class="content">
    <div class="waterfall-section">
      <Waterfall bind:this={waterfall} width={1024} height={isMobile ? 300 : 200} />

      <div class="freq-scale">
        <!-- Frequency scale would go here -->
      </div>
    </div>

    {#if !isMobile}
      <aside class="controls-sidebar">
        <FrequencyDisplay />
        <SMeter />
        <ControlPanel />
      </aside>
    {/if}
  </div>

  {#if isMobile}
    <ControlSheet />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .connect-btn {
    background: var(--accent-green);
    color: var(--bg-primary);
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .waterfall-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #000;
  }

  .freq-scale {
    height: 24px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }

  .controls-sidebar {
    width: 280px;
    padding: 1rem;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  /* Mobile styles */
  main.mobile .content {
    flex-direction: column;
  }

  main.mobile .waterfall-section {
    flex: 1;
  }

  main.mobile header {
    padding: 0.5rem;
  }

  main.mobile h1 {
    font-size: 1rem;
  }
</style>
```

**Step 2: Test the application**

Run: `npm run dev`
Expected: Application loads with header, waterfall placeholder, and control panel. Mobile view shows swipe-up control sheet.

**Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat: integrate all components into main App layout"
```

---

### Task 12: Add Frequency Scale Component

**Files:**
- Create: `src/components/FrequencyScale.svelte`
- Modify: `src/App.svelte`

**Step 1: Create FrequencyScale component**

Create `src/components/FrequencyScale.svelte`:
```svelte
<script>
  export let minFreq = 14000; // kHz
  export let maxFreq = 14350; // kHz
  export let width = 1024;

  // Generate tick marks
  $: range = maxFreq - minFreq;
  $: majorStep = range > 500 ? 100 : range > 100 ? 50 : 10;
  $: ticks = [];
  $: {
    ticks = [];
    const start = Math.ceil(minFreq / majorStep) * majorStep;
    for (let f = start; f <= maxFreq; f += majorStep) {
      const x = ((f - minFreq) / range) * width;
      ticks.push({ freq: f, x, label: (f / 1000).toFixed(3) });
    }
  }
</script>

<div class="freq-scale" style="width: {width}px;">
  <svg {width} height="24">
    {#each ticks as tick}
      <line
        x1={tick.x}
        y1="0"
        x2={tick.x}
        y2="8"
        stroke="var(--text-secondary)"
        stroke-width="1"
      />
      <text
        x={tick.x}
        y="20"
        text-anchor="middle"
        fill="var(--text-secondary)"
        font-size="10"
      >
        {tick.label}
      </text>
    {/each}
  </svg>
</div>

<style>
  .freq-scale {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }

  svg {
    display: block;
  }
</style>
```

**Step 2: Add FrequencyScale to App.svelte**

In `src/App.svelte`, add import and use:
```svelte
import FrequencyScale from './components/FrequencyScale.svelte';
```

Replace the `.freq-scale` div with:
```svelte
<FrequencyScale minFreq={14000} maxFreq={14350} width={1024} />
```

**Step 3: Commit**

```bash
git add src/components/FrequencyScale.svelte src/App.svelte
git commit -m "feat: add FrequencyScale component with tick marks"
```

---

### Task 13: Final Integration Test and Polish

**Step 1: Test full application flow**

Run: `npm run dev`

Test checklist:
- [ ] App loads without errors
- [ ] Server picker shows preset servers
- [ ] Connect button starts connection attempt
- [ ] Waterfall displays (may show noise if server unreachable)
- [ ] Frequency display shows current frequency
- [ ] Mode buttons switch modes
- [ ] Volume slider works
- [ ] Mobile view shows control sheet
- [ ] Swipe up reveals full controls

**Step 2: Build production bundle**

Run: `npm run build`
Expected: `dist/` folder created with optimized bundle

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 MVP of SWL WebSDR client"
```

---

## Summary

Phase 1 delivers:
- Svelte/Vite project structure
- WebSDR WebSocket connection (audio + waterfall)
- u-law audio decoding with WebAudio playback
- Canvas-based waterfall display with filter overlay
- LED-style frequency display
- S-Meter component
- Mode/tune/volume controls
- Server picker with presets
- Responsive layout with mobile control sheet

**Next Phase (Phase 2)** will add:
- RBN spot integration
- Hearability scoring
- Waterfall spot overlays
- localStorage persistence
- Visual polish (needle S-meter, better LED font)
