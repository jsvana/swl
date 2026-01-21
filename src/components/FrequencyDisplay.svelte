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
