import {
  formatSettingsCommand,
  formatMuteCommand
} from './protocol.js';

// Check if we're in development mode (Vite dev server)
const isDev = import.meta.env.DEV;

// Standalone proxy server port (run proxy-server.js alongside dev server)
const PROXY_PORT = 8080;

export class WebSDRClient {
  constructor() {
    this.audioSocket = null;
    this.waterfallSocket = null;
    this.server = null;
    this.onAudioData = null;
    this.onWaterfallData = null;
    this.onSmeterUpdate = null;
    this.onStatusChange = null;
    this.onError = null;
    this.onReady = null; // Called when socket is open and ready for commands

    // Current receiver state - WebSDR requires all params sent together
    this._settings = {
      freq: 14200,
      band: 1,  // 20m band on Utah SDR (band 0 = 30m, band 1 = 20m)
      lo: 0.15,
      hi: 2.7,
      mode: 'usb',
      name: ''
    };
  }

  // Build WebSocket URL - use proxy to avoid CORS/mixed-content issues
  _buildWsUrl(path) {
    if (!this.server.proxyId) {
      return `ws://${this.server.url}${path}`;
    }
    if (isDev) {
      // Dev: standalone proxy server on port 8080
      return `ws://localhost:${PROXY_PORT}/${this.server.proxyId}${path}`;
    }
    // Production: proxy through nginx at /proxy/
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/proxy/${this.server.proxyId}${path}`;
  }

  connect(server) {
    // Accept either a server object or URL string for backwards compatibility
    if (typeof server === 'string') {
      this.server = { url: server, proxyPath: null };
    } else {
      this.server = server;
    }

    this.disconnect();
    this._notifyStatus('connecting');

    // Connect audio WebSocket
    try {
      const wsUrl = this._buildWsUrl('/~~stream?v=11');
      console.log('Connecting to:', wsUrl);
      this.audioSocket = new WebSocket(wsUrl);
      this.audioSocket.binaryType = 'arraybuffer';

      this.audioSocket.onopen = () => {
        console.log('Audio WebSocket connected');
        this._notifyStatus('connected');
        // Call onReady callback if set
        if (this.onReady) {
          this.onReady();
        }
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
    if (!this.server) return;

    if (this.waterfallSocket) {
      this.waterfallSocket.close();
    }

    try {
      // format=0 gives uncompressed data (1 byte per pixel)
      const path = `/~~waterstream${band}?format=0&width=${width}&zoom=${zoom}&start=${start}`;
      const wsUrl = this._buildWsUrl(path);
      console.log('Connecting waterfall to:', wsUrl);
      this.waterfallSocket = new WebSocket(wsUrl);
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
      console.log('Sending command:', command);
      console.log('Socket state:', this.audioSocket.readyState, 'bufferedAmount:', this.audioSocket.bufferedAmount);
      this.audioSocket.send(command);
    } else {
      console.warn('Cannot send command, socket not open. State:', this.audioSocket?.readyState, 'Command:', command);
    }
  }

  // Send all current settings to the server
  // WebSDR requires all parameters in a single command
  _sendSettings() {
    const cmd = formatSettingsCommand(this._settings);
    console.log('Settings state:', JSON.stringify(this._settings));
    this.send(cmd);
  }

  tune(freqKhz) {
    console.log(`tune() called with freq=${freqKhz}`);
    this._settings.freq = freqKhz;
    this._sendSettings();
  }

  setMode(mode) {
    this._settings.mode = mode;
    this._sendSettings();
  }

  setFilter(lo, hi) {
    this._settings.lo = lo;
    this._settings.hi = hi;
    this._sendSettings();
  }

  setBand(band) {
    this._settings.band = band;
    this._sendSettings();
  }

  setMute(muted) {
    this.send(formatMuteCommand(muted));
  }

  _handleAudioMessage(data) {
    // Pass raw message to audio engine - it handles protocol decoding internally
    // including S-meter extraction, sample rate, and audio decompression
    if (this.onAudioData) {
      this.onAudioData(new Uint8Array(data));
    }
  }

  _handleWaterfallMessage(data) {
    const bytes = new Uint8Array(data);

    // With format=0, we get raw FFT data (1 byte per pixel)
    // Values are typically 0-255 representing signal strength
    if (this.onWaterfallData && bytes.length > 0) {
      this.onWaterfallData(bytes);
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
