import { ULAW_TABLE } from './protocol.js';

/**
 * WebSDR Audio Decoder
 *
 * Handles the WebSDR audio protocol:
 * - 0x81: Sample rate (2 bytes follow: high, low)
 * - 0x82: Settings (2 bytes follow)
 * - 0x83: Mode (1 byte follows)
 * - 0xF0-0xFF: S-meter (1 byte follows with low 8 bits)
 * - 0x80: Raw u-law block (128 bytes follow)
 * - Other: Compressed audio data
 */
class WebSDRAudioDecoder {
  constructor() {
    // Decoded PCM sample buffer (circular)
    this.pcmBuffer = new Int16Array(32768);
    this.writePos = 0;

    // State for delta decoding
    this.lastSample = new Int16Array(20);  // History for prediction
    this.historyIndex = 0;

    // Sample rate from server
    this.sampleRate = 8000;

    // S-meter callback
    this.onSmeter = null;
  }

  // Decode a WebSocket message
  decode(data) {
    const bytes = new Uint8Array(data);
    let i = 0;

    while (i < bytes.length) {
      const b = bytes[i];

      // S-meter: 0xF0-0xFF (upper nibble is 0xF)
      if ((b & 0xF0) === 0xF0 && i + 1 < bytes.length) {
        const smeterValue = ((b & 0x0F) << 8) | bytes[i + 1];
        if (this.onSmeter) {
          this.onSmeter(smeterValue / 10);  // Raw value / 10 gives dB
        }
        i += 2;
        continue;
      }

      // Sample rate: 0x81
      if (b === 0x81 && i + 2 < bytes.length) {
        this.sampleRate = (bytes[i + 1] << 8) | bytes[i + 2];
        i += 3;
        continue;
      }

      // Settings: 0x82
      if (b === 0x82 && i + 2 < bytes.length) {
        // Skip settings bytes
        i += 3;
        continue;
      }

      // Mode: 0x83
      if (b === 0x83 && i + 1 < bytes.length) {
        // Skip mode byte
        i += 2;
        continue;
      }

      // Raw u-law block: 0x80
      if (b === 0x80 && i + 128 < bytes.length) {
        // Next 128 bytes are raw u-law samples
        for (let j = 0; j < 128; j++) {
          const sample = ULAW_TABLE[bytes[i + 1 + j]];
          this.pcmBuffer[this.writePos] = sample;
          this.writePos = (this.writePos + 1) % this.pcmBuffer.length;
        }
        // Reset prediction state
        for (let j = 0; j < this.lastSample.length; j++) {
          this.lastSample[j] = 0;
        }
        this.historyIndex = 0;
        i += 129;
        continue;
      }

      // Compressed audio data
      // For bytes < 0x80, treat as u-law samples
      // For bytes 0x90-0xDF, they involve prediction/delta encoding
      // For simplicity, just decode as u-law for now
      if (b < 0x80) {
        // Lower 7 bits reference u-law table
        const sample = ULAW_TABLE[b];
        this.pcmBuffer[this.writePos] = sample;
        this.writePos = (this.writePos + 1) % this.pcmBuffer.length;
        i++;
        continue;
      }

      // Handle 0x90-0xDF range (compressed with prediction)
      if (b >= 0x90 && b <= 0xDF) {
        // This is compressed data that requires delta decoding
        // The algorithm uses prediction and variable-length encoding
        // For now, skip these as they require more analysis
        i++;
        continue;
      }

      // Unknown control byte, skip
      i++;
    }
  }

  // Get samples from the buffer
  getSamples(count) {
    const samples = new Int16Array(count);
    const available = (this.writePos - this.readPos + this.pcmBuffer.length) % this.pcmBuffer.length;
    const toRead = Math.min(count, available);

    for (let i = 0; i < toRead; i++) {
      samples[i] = this.pcmBuffer[(this.readPos + i) % this.pcmBuffer.length];
    }

    return samples;
  }

  readPos = 0;
}

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.scriptProcessor = null;
    this.sampleBuffer = new Int16Array(65536);  // Larger buffer
    this.writePos = 0;
    this.readPos = 0;
    this.sourceSampleRate = 8000;
    this.started = false;
    this.volume = 0.5;
    this.muted = false;
    this.onSmeter = null;

    // Use WebSDR decoder
    this.decoder = new WebSDRAudioDecoder();
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

      // Pass S-meter callback to decoder
      this.decoder.onSmeter = this.onSmeter;
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

  // Feed raw WebSocket data
  feedData(data) {
    // Decode WebSDR protocol
    this.decoder.decode(data);

    // Update sample rate if changed
    if (this.decoder.sampleRate !== this.sourceSampleRate) {
      this.sourceSampleRate = this.decoder.sampleRate;
      console.log('Audio sample rate:', this.sourceSampleRate);
    }

    // Copy decoded samples to our buffer
    const available = (this.decoder.writePos - this.decoder.readPos + this.decoder.pcmBuffer.length) % this.decoder.pcmBuffer.length;

    for (let i = 0; i < available; i++) {
      const sample = this.decoder.pcmBuffer[(this.decoder.readPos + i) % this.decoder.pcmBuffer.length];
      this.sampleBuffer[this.writePos] = sample;
      this.writePos = (this.writePos + 1) % this.sampleBuffer.length;
    }

    this.decoder.readPos = this.decoder.writePos;
  }

  _processAudio(event) {
    const output = event.outputBuffer.getChannelData(0);
    const outputRate = this.audioContext.sampleRate;
    const ratio = this.sourceSampleRate / outputRate;

    // Calculate available samples
    const available = (this.writePos - this.readPos + this.sampleBuffer.length) % this.sampleBuffer.length;
    const needed = Math.ceil(output.length * ratio);

    if (available < needed) {
      // Buffer underrun - output silence
      for (let i = 0; i < output.length; i++) {
        output[i] = 0;
      }
      return;
    }

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
