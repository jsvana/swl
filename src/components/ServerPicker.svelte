<script>
  import { presetServers, currentServer, connectionStatus, selectServer } from '../stores/server.js';

  function handleServerChange(event) {
    selectServer(event.target.value);
  }
</script>

<div class="server-picker">
  <select value={$currentServer.id} on:change={handleServerChange}>
    {#each presetServers as server}
      <option value={server.id}>{server.name}</option>
    {/each}
  </select>

  <span class="status" class:connected={$connectionStatus === 'connected'} class:error={$connectionStatus === 'error'}>
    {#if $connectionStatus === 'connected'}
      ● Connected
    {:else if $connectionStatus === 'connecting'}
      ○ Connecting...
    {:else if $connectionStatus === 'error'}
      ✕ Error
    {:else}
      ○ Disconnected
    {/if}
  </span>
</div>

<style>
  .server-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  select {
    min-width: 200px;
  }

  .status {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .status.connected {
    color: var(--accent-green);
  }

  .status.error {
    color: var(--accent-red);
  }
</style>
