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
