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
