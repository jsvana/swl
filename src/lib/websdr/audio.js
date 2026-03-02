import { ULAW_TABLE } from './protocol.js';

/**
 * WebSDR Audio Decoder
 * Based on PA3FWM's websdr-sound.js
 *
 * Protocol bytes:
 * - 0xF0-0xFF: S-meter (next byte is low 8 bits)
 * - 0x80: Raw u-law block (128 bytes follow)
 * - 0x81: Sample rate (2 bytes: high, low)
 * - 0x82: Scaling factor (2 bytes)
 * - 0x83: Mode byte (1 byte)
 * - 0x84: Silence block (128 zero samples)
 * - 0x85: True frequency (6 bytes)
 * - 0x86: Band switch
 * - 0x87: Time info (6 bytes)
 * - 0x90-0xDF: Compressed audio block (G = 14 - high_nibble)
 * - 0x00-0x7F: Compressed audio block (flag bit = 0)
 */
class WebSDRAudioDecoder {
  constructor() {
    // Sample buffer - matches original: k = new Int16Array(le), le = 32768
    this.buffer = new Int16Array(32768);
    this.writePos = 0;  // B in original
    this.readPos = 0;   // For AudioEngine consumption
    this.bufferSize = 32768;  // le in original

    // Prediction filter state - matches original: $ and se arrays
    // These are regular JS arrays (not typed) to allow any numeric value
    this.N = [];  // $ in original - prediction coefficients
    this.O = [];  // se in original - sample history
    for (let i = 0; i < 20; i++) {
      this.N[i] = 0;
      this.O[i] = 0;
    }
    this.fa = 0;  // ie in original - feedback accumulator

    // Protocol state
    this.sampleRate = 8000;  // D in original
    this.Oa = 0;   // oe in original - scaling factor from 0x82
    this.Aa = 0;   // ae in original - mode byte from 0x83
    this.G = 7;    // re in original - bits per sample

    // Debug
    this.stats = { messages: 0, raw: 0, compressed: 0 };
    this.lastStatsLog = 0;

    // Callbacks
    this.onSmeter = null;
  }

  /**
   * Decode a WebSocket message
   * Follows the original ue.onmessage handler structure
   */
  decode(data) {
    const t = new Uint8Array(data);  // t in original
    this.stats.messages++;

    let n = 0;  // byte position

    while (n < t.length) {
      let o = 0;  // flag: 2 = process compressed block
      let r = 0;  // bit offset within current byte

      const b = t[n];

      // S-meter: 0xF0-0xFF
      if ((b & 0xF0) === 0xF0) {
        const smeter = ((b & 0x0F) << 8) | t[n + 1];
        if (this.onSmeter) {
          this.onSmeter(smeter * 10);
        }
        n += 2;
        continue;
      }

      // Raw u-law block: 0x80
      if (b === 0x80) {
        this.stats.raw++;
        for (let s = 0; s < 128 && (n + 1 + s) < t.length; s++) {
          this.buffer[this.writePos] = ULAW_TABLE[t[n + 1 + s]];
          this.writePos = (this.writePos + 1) % this.bufferSize;
        }
        n += 129;
        // Reset prediction state
        for (let i = 0; i < 20; i++) {
          this.N[i] = 0;
          this.O[i] = 0;
        }
        this.fa = 0;
        continue;
      }

      // Compressed audio: 0x90-0xDF (explicit header with G value)
      if (b >= 0x90 && b <= 0xDF) {
        r = 4;  // Skip high nibble, start at bit 4
        o = 2;  // Flag to process compressed block
        this.G = 14 - (b >> 4);  // re = 14 - high_nibble
      }
      // Compressed audio: 0x00-0x7F (continuation block - uses previous G)
      // DISABLED for now - this causes issues when misaligned
      // else if ((b & 0x80) === 0) {
      //   r = 1;  // Skip flag bit, start at bit 1
      //   o = 2;  // Flag to process compressed block
      // }
      // Sample rate: 0x81
      else if (b === 0x81 && n + 2 < t.length) {
        const rate = (t[n + 1] << 8) | t[n + 2];
        // Only accept valid WebSDR sample rates (typically 8000-8192)
        if (rate >= 7000 && rate <= 12000) {
          this.sampleRate = rate;
        }
        n += 3;
        continue;
      }
      // Scaling factor: 0x82
      else if (b === 0x82 && n + 2 < t.length) {
        this.Oa = (t[n + 1] << 8) | t[n + 2];
        n += 3;
        continue;
      }
      // Mode byte: 0x83
      else if (b === 0x83 && n + 1 < t.length) {
        this.Aa = t[n + 1];
        n += 2;
        continue;
      }
      // Silence block: 0x84
      else if (b === 0x84) {
        for (let s = 0; s < 128; s++) {
          this.buffer[this.writePos] = 0;
          this.writePos = (this.writePos + 1) % this.bufferSize;
        }
        for (let i = 0; i < 20; i++) {
          this.N[i] = 0;
          this.O[i] = 0;
        }
        this.fa = 0;
        n++;
        continue;
      }
      // True frequency: 0x85 (6 bytes payload)
      else if (b === 0x85 && n + 6 < t.length) {
        n += 7;
        continue;
      }
      // Band switch: 0x86
      else if (b === 0x86) {
        n++;
        continue;
      }
      // Time info: 0x87 (6 bytes payload)
      else if (b === 0x87 && n + 6 < t.length) {
        n += 7;
        continue;
      }
      // Unknown byte in 0x88-0x8F range
      else {
        n++;
        continue;
      }

      // Process compressed audio block (128 samples)
      if (o === 2) {
        this.stats.compressed++;
        const startN = n;
        const startR = r;

        // j value based on mode bit 4: a = (ae & 0x10) ? 12 : 14
        const a = (this.Aa & 0x10) ? 12 : 14;

        // z_table: c = [999, 999, 8, 4, 2, 1, 99, 99]
        const c_table = [999, 999, 8, 4, 2, 1, 99, 99];

        let samplesDecoded = 0;
        for (let sampleIdx = 0; sampleIdx < 128; sampleIdx++) {
          if (n + 4 > t.length) break;
          samplesDecoded++;

          // Read 32-bit big-endian: i = t[n]<<24 | t[n+1]<<16 | t[n+2]<<8 | t[n+3]
          let i = ((t[n] & 0xFF) << 24) | ((t[n+1] & 0xFF) << 16) |
                  ((t[n+2] & 0xFF) << 8) | (t[n+3] & 0xFF);

          const u = 15 - this.G;  // max leading zeros
          let d = this.Oa;        // scaling factor

          // Shift by bit offset: i <<= r
          // In JS, << on large values can give unexpected results, handle carefully
          i = (i << r) | 0;  // Keep as 32-bit signed

          // Count leading zeros: s = 0; while (!(i & 0x80000000) && s < u) { i <<= 1; s++; }
          let s = 0;
          if (i !== 0) {
            while ((i & 0x80000000) === 0 && s < u) {
              i = (i << 1) | 0;
              s++;
            }
          }

          // Determine r_value (stored in u_val) and total bits consumed (stored in s)
          let u_val;
          if (s < u) {
            // Found marker bit before max
            u_val = s;      // r_value = number of leading zeros
            s++;            // consumed s zeros + 1 marker bit
            i = (i << 1) | 0;  // skip marker bit
          } else {
            // Max zeros reached, read 8-bit escape value
            u_val = (i >>> 24) & 0xFF;  // r_value = next byte
            s += 8;         // consumed s zeros + 8 escape bits
            i = (i << 8) | 0;  // skip escape byte
          }

          // Calculate extra bits S (stored in f)
          let f = 0;
          if (u_val >= c_table[this.G]) f++;
          if (u_val >= c_table[this.G - 1]) f++;
          if (f > this.G - 1) f = this.G - 1;

          // Extract value: c = ((i >> 16) & 65535) >> (17 - G) & (-1 << f)
          let c = ((i >> 16) & 0xFFFF) >> (17 - this.G);
          c = c & (-1 << f);  // Clear low f bits
          c += u_val << (this.G - 1);  // Add r_value contribution

          // Sign extend if sign bit is set
          if ((i & (1 << (32 - this.G + f))) !== 0) {
            c |= (1 << f) - 1;  // Set low f bits
            c = ~c;             // Invert to get negative value
          }

          // Debug: track decoded value distribution
          if (sampleIdx === 0 && this.stats.compressed % 50 === 1) {
            console.log(`Decode: G=${this.G}, u_val=${u_val}, f=${f}, c=${c}, Oa=${this.Oa}`);
          }

          // Bounds check: prevent explosive values
          // Typical decoded values should be small (-20 to +20)
          if (c > 50) c = 50;
          if (c < -50) c = -50;

          // Advance bit/byte position: r += s + G - f
          r += s + this.G - f;
          while (r >= 8) {
            n++;
            r -= 8;
          }

          // Prediction filter: sum N[k] * O[k]
          // Original: for(s=i=0;s<20;s++)i+=$[s]*se[s];
          let pred = 0;
          for (let k = 0; k < 20; k++) {
            pred += this.N[k] * this.O[k];
          }
          // Convert to 32-bit and round toward zero
          pred = pred | 0;
          pred = pred >= 0 ? (pred >> 12) : ((pred + 4095) >> 12);

          // Scale decoded value: d = c * d + d / 2
          d = c * d + d / 2;
          const zScaled = d >> 4;

          // Update coefficients (backwards): N[k] += -(N[k]>>7) + (O[k]*zScaled>>a)
          for (let k = 19; k >= 0; k--) {
            this.N[k] += -(this.N[k] >> 7) + ((this.O[k] * zScaled) >> a);
            // Clamp N[k] to prevent explosion
            if (this.N[k] > 500000) this.N[k] = 500000;
            if (this.N[k] < -500000) this.N[k] = -500000;
            if (k > 0) {
              this.O[k] = this.O[k - 1];
            }
          }

          // Set O[0] = prediction + scaled (note: d, not zScaled)
          this.O[0] = pred + d;
          // Clamp O[0] to prevent explosion
          if (this.O[0] > 500000) this.O[0] = 500000;
          if (this.O[0] < -500000) this.O[0] = -500000;

          // Calculate sample: s = O[0] + (fa >> 4)
          let sample = this.O[0] + (this.fa >> 4);

          // Update feedback accumulator
          if ((this.Aa & 0x10) !== 0) {
            this.fa = 0;
          } else {
            this.fa += (this.O[0] << 4) >> 3;
          }

          // Store sample (Int16Array handles clamping)
          this.buffer[this.writePos] = sample;
          this.writePos = (this.writePos + 1) % this.bufferSize;
        }

        // Post-block adjustment: if (r === 0) n--
        if (r === 0) n--;

        // Debug: log if we decoded fewer than 128 samples or ended at unexpected position
        const bytesConsumed = n - startN;
        if (samplesDecoded < 128 || bytesConsumed < 10 || bytesConsumed > 200) {
          console.log(`CompBlock: start=${startN}, end=${n}, r=${r}, samples=${samplesDecoded}, bytes=${bytesConsumed}`);
        }
      }

      n++;
    }

    // Debug logging every 2 seconds
    const now = Date.now();
    if (now - this.lastStatsLog > 2000) {
      const predMax = Math.max(...this.N.map(Math.abs), ...this.O.map(Math.abs));
      console.log(`Audio: ${this.stats.messages} msgs, ${this.stats.raw} raw, ${this.stats.compressed} comp, rate=${this.sampleRate}, Oa=${this.Oa}, G=${this.G}, predMax=${predMax}`);
      this.lastStatsLog = now;
    }
  }
}

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.scriptProcessor = null;
    this.sampleBuffer = new Int16Array(65536);
    this.writePos = 0;
    this.readPos = 0;
    this.sourceSampleRate = 8000;
    this.started = false;
    this.volume = 0.5;
    this.muted = false;
    this.onSmeter = null;

    this.decoder = new WebSDRAudioDecoder();
  }

  async start() {
    if (this.started) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
      this.gainNode.connect(this.audioContext.destination);

      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 0, 1);
      this.scriptProcessor.onaudioprocess = (event) => this._processAudio(event);
      this.scriptProcessor.connect(this.gainNode);

      this.started = true;
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

  feedData(data) {
    this.decoder.decode(data);

    if (this.decoder.sampleRate !== this.sourceSampleRate) {
      this.sourceSampleRate = this.decoder.sampleRate;
      console.log('Sample rate:', this.sourceSampleRate);
    }

    // Copy decoded samples to playback buffer
    const decoderBuf = this.decoder.buffer;
    const H = this.decoder.bufferSize;
    let rp = this.decoder.readPos;
    const wp = this.decoder.writePos;

    while (rp !== wp) {
      this.sampleBuffer[this.writePos] = decoderBuf[rp];
      this.writePos = (this.writePos + 1) % this.sampleBuffer.length;
      rp = (rp + 1) % H;
    }
    this.decoder.readPos = rp;
  }

  _processAudio(event) {
    const output = event.outputBuffer.getChannelData(0);
    const outputRate = this.audioContext.sampleRate;
    const ratio = this.sourceSampleRate / outputRate;

    const bufLen = this.sampleBuffer.length;
    const available = (this.writePos - this.readPos + bufLen) % bufLen;
    const needed = Math.ceil(output.length * ratio) + 2;

    if (available < needed) {
      // Underrun - output silence
      for (let i = 0; i < output.length; i++) {
        output[i] = 0;
      }
      return;
    }

    // Resample with linear interpolation
    for (let i = 0; i < output.length; i++) {
      const srcPos = this.readPos + (i * ratio);
      const srcIndex = Math.floor(srcPos) % bufLen;
      const nextIndex = (srcIndex + 1) % bufLen;
      const frac = srcPos - Math.floor(srcPos);

      const s1 = this.sampleBuffer[srcIndex];
      const s2 = this.sampleBuffer[nextIndex];
      output[i] = (s1 + (s2 - s1) * frac) / 32768;
    }

    this.readPos = (this.readPos + Math.floor(output.length * ratio)) % bufLen;
  }

  getBufferLevel() {
    const used = (this.writePos - this.readPos + this.sampleBuffer.length) % this.sampleBuffer.length;
    return used / this.sampleBuffer.length;
  }
}

export const audioEngine = new AudioEngine();
