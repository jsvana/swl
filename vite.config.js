import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Common proxy configuration for WebSDR servers
function createWebSDRProxy(target) {
  const url = new URL(target);
  return {
    target,
    ws: true,
    changeOrigin: true,
    headers: {
      'Origin': target,
    },
    // Handle WebSocket upgrade
    configure: (proxy, options) => {
      // For HTTP requests
      proxy.on('proxyReq', (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', target);
        proxyReq.setHeader('Host', url.host);
      });
      // For WebSocket upgrade requests
      proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
        proxyReq.setHeader('Origin', target);
        proxyReq.setHeader('Host', url.host);
      });
      proxy.on('error', (err, req, res) => {
        console.error('Proxy error:', err.message);
      });
    },
  };
}

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    proxy: {
      // Proxy for Utah SDR #2 (default server)
      '/websdr/utah2': {
        ...createWebSDRProxy('http://websdr2.sdrutah.org:8902'),
        rewrite: (path) => path.replace(/^\/websdr\/utah2/, ''),
      },
      // Proxy for Utah SDR #1
      '/websdr/utah1': {
        ...createWebSDRProxy('http://websdr1.sdrutah.org:8901'),
        rewrite: (path) => path.replace(/^\/websdr\/utah1/, ''),
      },
      // Proxy for K3FEF
      '/websdr/k3fef': {
        ...createWebSDRProxy('http://k3fef.com:8901'),
        rewrite: (path) => path.replace(/^\/websdr\/k3fef/, ''),
      },
      // Proxy for KFS
      '/websdr/kfs': {
        ...createWebSDRProxy('http://kfsdr.com:8901'),
        rewrite: (path) => path.replace(/^\/websdr\/kfs/, ''),
      },
    }
  }
});
