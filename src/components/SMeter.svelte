<script>
  import { smeter } from '../stores/radio.js';

  // S-meter scale: S0=-127dBm, S9=-73dBm, each S-unit is 6dB
  // Above S9: +10dB steps

  function dbmToPercent(dbm) {
    // Range: -130 dBm (0%) to -33 dBm (100%)
    const min = -130;
    const max = -33;
    return Math.max(0, Math.min(100, ((dbm - min) / (max - min)) * 100));
  }

  function dbmToSUnit(dbm) {
    if (dbm < -127) return 'S0';
    if (dbm >= -73) {
      const over = Math.round(dbm + 73);
      return `S9+${Math.max(0, over)}`;
    }
    const sUnit = Math.round((dbm + 127) / 6);
    return `S${Math.min(9, sUnit)}`;
  }

  $: percent = dbmToPercent($smeter);
  $: sUnit = dbmToSUnit($smeter);
  $: needleRotation = -45 + (percent * 0.9); // -45 to +45 degrees
</script>

<div class="smeter">
  <div class="scale">
    <span>1</span>
    <span>3</span>
    <span>5</span>
    <span>7</span>
    <span>9</span>
    <span class="over">+20</span>
    <span class="over">+40</span>
  </div>

  <div class="meter-body">
    <div class="bar" style="width: {percent}%"></div>
    <div class="needle" style="transform: rotate({needleRotation}deg)"></div>
  </div>

  <div class="reading">
    <span class="sunit">{sUnit}</span>
    <span class="dbm">{$smeter.toFixed(0)} dBm</span>
  </div>
</div>

<style>
  .smeter {
    background: #111;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 0.5rem;
  }

  .scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.625rem;
    color: var(--text-secondary);
    padding: 0 0.25rem;
    margin-bottom: 0.25rem;
  }

  .scale .over {
    color: var(--accent-red);
  }

  .meter-body {
    position: relative;
    height: 12px;
    background: #222;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    background: linear-gradient(to right, var(--accent-green), var(--accent-amber), var(--accent-red));
    transition: width 0.1s ease-out;
  }

  .needle {
    position: absolute;
    top: 50%;
    left: 0;
    width: 50%;
    height: 2px;
    background: white;
    transform-origin: left center;
    transition: transform 0.1s ease-out;
    display: none; /* Hidden for bar style, enable for needle style */
  }

  .reading {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .sunit {
    color: var(--accent-green);
    font-weight: 600;
  }

  .dbm {
    color: var(--text-secondary);
  }
</style>
