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
