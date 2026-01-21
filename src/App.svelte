<script>
  let serverName = 'Utah SDR #2';
  let connected = false;
</script>

<main>
  <header>
    <div class="server-info">
      <span class="server-name">{serverName}</span>
      <span class="status" class:connected>
        {connected ? '● Connected' : '○ Disconnected'}
      </span>
    </div>
    <h1>SWL</h1>
  </header>

  <div class="content">
    <p>WebSDR Client - Phase 1</p>
  </div>
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
  }

  .server-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .server-name {
    font-weight: 600;
  }

  .status {
    font-size: 0.875rem;
    color: var(--accent-red);
  }

  .status.connected {
    color: var(--accent-green);
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
