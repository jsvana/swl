<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentServer, connectionStatus } from './stores/server.js';
  import { frequency, mode, filterLow, filterHigh, smeter } from './stores/radio.js';
  import { websdrClient } from './lib/websdr/client.js';
  import { audioEngine } from './lib/websdr/audio.js';

  import ServerPicker from './components/ServerPicker.svelte';
  import Waterfall from './components/Waterfall.svelte';
  import FrequencyDisplay from './components/FrequencyDisplay.svelte';
  import SMeter from './components/SMeter.svelte';
  import ControlPanel from './components/ControlPanel.svelte';
  import ControlSheet from './components/ControlSheet.svelte';
  import FrequencyScale from './components/FrequencyScale.svelte';

  let waterfall;
  let isMobile = false;

  // Check if mobile
  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Set up WebSDR client callbacks
    websdrClient.onStatusChange = (status) => {
      connectionStatus.set(status);
    };

    websdrClient.onError = (error) => {
      console.error('WebSDR error:', error);
    };

    websdrClient.onAudioData = (data) => {
      audioEngine.feedData(data);
    };

    websdrClient.onWaterfallData = (data) => {
      if (waterfall) {
        waterfall.pushLine(data);
      }
    };

    websdrClient.onSmeterUpdate = (value) => {
      smeter.set(value);
    };
  });

  onDestroy(() => {
    window.removeEventListener('resize', checkMobile);
    websdrClient.disconnect();
    audioEngine.stop();
  });

  // Connect when server changes
  async function handleConnect() {
    try {
      await audioEngine.start();
      websdrClient.connect($currentServer.url);
      websdrClient.connectWaterfall(0, 1024, 0, 0);

      // Send initial settings
      setTimeout(() => {
        websdrClient.tune($frequency);
        websdrClient.setMode($mode);
        websdrClient.setFilter($filterLow, $filterHigh);
      }, 500);
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }

  function handleDisconnect() {
    websdrClient.disconnect();
    audioEngine.stop();
  }

  $: isConnected = $connectionStatus === 'connected';
</script>

<main class:mobile={isMobile}>
  <header>
    <ServerPicker />
    <div class="header-actions">
      {#if isConnected}
        <button on:click={handleDisconnect}>Disconnect</button>
      {:else}
        <button class="connect-btn" on:click={handleConnect}>Connect</button>
      {/if}
      <h1>SWL</h1>
    </div>
  </header>

  <div class="content">
    <div class="waterfall-section">
      <Waterfall bind:this={waterfall} width={1024} height={isMobile ? 300 : 200} />
      <FrequencyScale minFreq={14000} maxFreq={14350} width={1024} />
    </div>

    {#if !isMobile}
      <aside class="controls-sidebar">
        <FrequencyDisplay />
        <SMeter />
        <ControlPanel />
      </aside>
    {/if}
  </div>

  {#if isMobile}
    <ControlSheet />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .connect-btn {
    background: var(--accent-green);
    color: var(--bg-primary);
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .waterfall-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #000;
  }

  .controls-sidebar {
    width: 280px;
    padding: 1rem;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  /* Mobile styles */
  main.mobile .content {
    flex-direction: column;
  }

  main.mobile .waterfall-section {
    flex: 1;
  }

  main.mobile header {
    padding: 0.5rem;
  }

  main.mobile h1 {
    font-size: 1rem;
  }
</style>
