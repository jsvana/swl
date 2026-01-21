<script>
  import { frequency, mode, filterLow, filterHigh, volume, muted, setMode, step } from '../stores/radio.js';
  import { websdrClient } from '../lib/websdr/client.js';
  import { audioEngine } from '../lib/websdr/audio.js';

  const modes = ['lsb', 'usb', 'cw', 'am', 'fm'];
  const stepSizes = [0.01, 0.1, 1, 5, 10];
  let currentStep = 1; // kHz

  function handleModeChange(newMode) {
    setMode(newMode);
    websdrClient.setMode(newMode);
    websdrClient.setFilter($filterLow, $filterHigh);
  }

  function handleTuneStep(delta) {
    step(delta * currentStep);
    websdrClient.tune($frequency);
  }

  function handleVolumeChange(event) {
    const newVolume = parseFloat(event.target.value);
    volume.set(newVolume);
    audioEngine.setVolume(newVolume);
  }

  function handleMuteToggle() {
    muted.update(m => !m);
    audioEngine.setMuted($muted);
    websdrClient.setMute($muted);
  }

  function handleFreqInput(event) {
    if (event.key === 'Enter') {
      const val = parseFloat(event.target.value);
      if (!isNaN(val)) {
        frequency.set(val);
        websdrClient.tune(val);
      }
    }
  }
</script>

<div class="control-panel">
  <!-- Frequency Entry -->
  <div class="control-group">
    <label>Frequency (kHz)</label>
    <input
      type="number"
      value={$frequency}
      step={currentStep}
      on:keydown={handleFreqInput}
    />
  </div>

  <!-- Tune Buttons -->
  <div class="control-group">
    <label>Tune</label>
    <div class="button-row">
      <button on:click={() => handleTuneStep(-1)}>◀</button>
      <select bind:value={currentStep}>
        {#each stepSizes as size}
          <option value={size}>{size} kHz</option>
        {/each}
      </select>
      <button on:click={() => handleTuneStep(1)}>▶</button>
    </div>
  </div>

  <!-- Mode Selection -->
  <div class="control-group">
    <label>Mode</label>
    <div class="button-row mode-buttons">
      {#each modes as m}
        <button
          class:active={$mode === m}
          on:click={() => handleModeChange(m)}
        >
          {m.toUpperCase()}
        </button>
      {/each}
    </div>
  </div>

  <!-- Volume -->
  <div class="control-group">
    <label>Volume</label>
    <div class="volume-row">
      <button class:active={$muted} on:click={handleMuteToggle}>
        {$muted ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={$volume}
        on:input={handleVolumeChange}
        disabled={$muted}
      />
    </div>
  </div>
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-panel);
    border-radius: 8px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-group label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .mode-buttons {
    flex-wrap: wrap;
  }

  .mode-buttons button {
    flex: 1;
    min-width: 3rem;
  }

  .volume-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .volume-row input[type="range"] {
    flex: 1;
  }

  input[type="number"] {
    width: 100%;
  }
</style>
