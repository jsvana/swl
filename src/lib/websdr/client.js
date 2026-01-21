import {
  formatTuneCommand,
  formatModeCommand,
  formatFilterCommand,
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
  }

  // Build WebSocket URL - use proxy in dev mode to avoid CORS issues
  _buildWsUrl(path) {
    if (isDev && this.server.proxyId) {
      // In dev mode, use standalone proxy server on port 8080
      // URL format: ws://localhost:8080/{proxyId}/path
      return `ws://localhost:${PROXY_PORT}/${this.server.proxyId}${path}`;
    } else {
      // In production, connect directly (requires same-origin hosting or CORS proxy)
      return `ws://${this.server.url}${path}`;
    }
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

    // WebSDR audio protocol:
    // - Bytes 0xF0-0xFF: S-meter (next byte is low part of value)
    // - Byte 0x80: Raw u-law block follows (128 bytes)
    // - Other bytes: Compressed audio data
    // For now, just pass all data as audio and extract S-meter when found

    // Look for S-meter at start of message (common location)
    let offset = 0;
    if (bytes.length >= 2 && (bytes[0] & 0xF0) === 0xF0) {
      const smeterValue = ((bytes[0] & 0x0F) << 8) | bytes[1];
      if (this.onSmeterUpdate) {
        // Convert to dBm (raw value * 0.1)
        const dbm = -140 + (smeterValue / 10);
        this.onSmeterUpdate(dbm);
      }
      offset = 2;
    }

    // Pass remaining data as audio
    // Note: WebSDR uses compression, so this won't sound right without decompression
    // For now, pass it through and let the audio engine try to play it
    if (this.onAudioData && offset < bytes.length) {
      this.onAudioData(bytes.subarray(offset));
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
