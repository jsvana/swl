<script>
  import { spring } from 'svelte/motion';
  import ControlPanel from './ControlPanel.svelte';
  import FrequencyDisplay from './FrequencyDisplay.svelte';
  import SMeter from './SMeter.svelte';

  let isOpen = false;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const sheetY = spring(0, { stiffness: 0.2, damping: 0.8 });

  function toggleSheet() {
    isOpen = !isOpen;
    sheetY.set(isOpen ? -60 : 0); // -60vh when open
  }

  function handleTouchStart(event) {
    startY = event.touches[0].clientY;
    isDragging = true;
  }

  function handleTouchMove(event) {
    if (!isDragging) return;
    currentY = event.touches[0].clientY;
    const delta = ((startY - currentY) / window.innerHeight) * 100;
    const newY = isOpen ? Math.min(0, -60 + delta) : Math.max(-60, -delta);
    sheetY.set(newY);
  }

  function handleTouchEnd() {
    isDragging = false;
    // Snap to open or closed
    if ($sheetY < -30) {
      isOpen = true;
      sheetY.set(-60);
    } else {
      isOpen = false;
      sheetY.set(0);
    }
  }
</script>

<div
  class="control-sheet"
  style="transform: translateY({$sheetY}vh)"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
>
  <div class="handle" on:click={toggleSheet}>
    <div class="handle-bar"></div>
  </div>

  <div class="sheet-content">
    <div class="quick-info">
      <FrequencyDisplay />
      <SMeter />
    </div>

    <div class="full-controls" class:visible={isOpen}>
      <ControlPanel />
    </div>
  </div>
</div>

<style>
  .control-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70vh;
    background: var(--bg-secondary);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    transform: translateY(0);
    transition: transform 0.1s;
    z-index: 100;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  }

  .handle {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    cursor: grab;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: var(--text-secondary);
    border-radius: 2px;
  }

  .sheet-content {
    padding: 0 1rem 1rem;
    height: calc(100% - 2rem);
    overflow-y: auto;
  }

  .quick-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .full-controls {
    margin-top: 1rem;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.2s, transform 0.2s;
  }

  .full-controls.visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>
