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
