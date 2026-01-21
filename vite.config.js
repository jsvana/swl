import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      // Proxy for Utah SDR #2 (default server)
      '/websdr/utah2': {
        target: 'http://websdr2.sdrutah.org:8902',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/websdr\/utah2/, ''),
      },
      // Proxy for Utah SDR #1
      '/websdr/utah1': {
        target: 'http://websdr1.sdrutah.org:8901',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/websdr\/utah1/, ''),
      },
      // Proxy for K3FEF
      '/websdr/k3fef': {
        target: 'http://k3fef.com:8901',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/websdr\/k3fef/, ''),
      },
      // Proxy for KFS
      '/websdr/kfs': {
        target: 'http://kfsdr.com:8901',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/websdr\/kfs/, ''),
      },
    }
  }
});
