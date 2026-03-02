// Format commands for WebSDR server
// Based on PA3FWM's WebSDR protocol - all parameters must be sent together

// Mode mapping: WebSDR uses numeric mode values
const MODE_MAP = {
  'usb': 0,
  'lsb': 0,
  'cw': 0,
  'am': 1,
  'fm': 4
};

// Tuning step in kHz per band (from bandinfo.js)
const TUNING_STEPS = {
  0: 0.03125,  // 30m
  1: 0.03125,  // 20m
  2: 0.03125,  // 17m
  3: 0.03125,  // 15m
  4: 0.03125,  // 12m
  5: 0.03125,  // 10m
  6: 0.03125,  // 10m (cont)
  7: 0.03125,  // 6m
};

// Format a complete settings command with all parameters
// WebSDR expects all settings in a single command
export function formatSettingsCommand({ freq, band = 0, lo, hi, mode, name = '' }) {
  const modeNum = typeof mode === 'string' ? (MODE_MAP[mode.toLowerCase()] ?? 0) : mode;

  // Round frequency to tuning step (server may require this)
  const step = TUNING_STEPS[band] || 0.03125;
  const roundedFreq = Math.round(freq / step) * step;

  const params = [
    `f=${roundedFreq}`,
    `band=${band}`,
    `lo=${lo}`,
    `hi=${hi}`,
    `mode=${modeNum}`,
    `name=${encodeURIComponent(name)}`
  ];
  return `GET /~~param?${params.join('&')}`;
}

// Legacy functions for backwards compatibility - but prefer formatSettingsCommand
export function formatTuneCommand(freqKhz) {
  // Note: This may not work alone - server expects all params together
  return `GET /~~param?f=${freqKhz}`;
}

export function formatModeCommand(mode) {
  const modeNum = MODE_MAP[mode.toLowerCase()] ?? 0;
  return `GET /~~param?mode=${modeNum}`;
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
