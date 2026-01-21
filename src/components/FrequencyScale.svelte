<script>
  export let minFreq = 14000; // kHz
  export let maxFreq = 14350; // kHz
  export let width = 1024;

  // Generate tick marks
  $: range = maxFreq - minFreq;
  $: majorStep = range > 500 ? 100 : range > 100 ? 50 : 10;
  $: ticks = [];
  $: {
    ticks = [];
    const start = Math.ceil(minFreq / majorStep) * majorStep;
    for (let f = start; f <= maxFreq; f += majorStep) {
      const x = ((f - minFreq) / range) * width;
      ticks.push({ freq: f, x, label: (f / 1000).toFixed(3) });
    }
  }
</script>

<div class="freq-scale" style="width: {width}px;">
  <svg {width} height="24">
    {#each ticks as tick}
      <line
        x1={tick.x}
        y1="0"
        x2={tick.x}
        y2="8"
        stroke="var(--text-secondary)"
        stroke-width="1"
      />
      <text
        x={tick.x}
        y="20"
        text-anchor="middle"
        fill="var(--text-secondary)"
        font-size="10"
      >
        {tick.label}
      </text>
    {/each}
  </svg>
</div>

<style>
  .freq-scale {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }

  svg {
    display: block;
  }
</style>
