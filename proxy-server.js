#!/usr/bin/env node
/**
 * WebSocket proxy server for WebSDR connections.
 * Run this alongside `npm run dev` to proxy WebSocket connections.
 *
 * Usage: node proxy-server.js
 *
 * The proxy listens on port 8080 and forwards to WebSDR servers.
 */

import http from 'http';
import httpProxy from 'http-proxy';

const PROXY_PORT = 8080;

// Server mappings
const servers = {
  'utah2': 'http://websdr2.sdrutah.org:8902',
  'utah1': 'http://websdr1.sdrutah.org:8901',
  'k3fef': 'http://k3fef.com:8901',
  'kfs': 'http://kfsdr.com:8901',
};

// Create proxy
const proxy = httpProxy.createProxyServer({});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error');
  }
});

// Set headers for proxied requests
proxy.on('proxyReq', (proxyReq, req, res, options) => {
  const target = options.target.href;
  const url = new URL(target);
  proxyReq.setHeader('Origin', target.replace(/\/$/, ''));
  proxyReq.setHeader('Host', url.host);
  console.log(`HTTP: ${req.method} ${req.url} -> ${target}`);
});

// Set headers for WebSocket upgrades
proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
  const target = options.target.href;
  const url = new URL(target);
  proxyReq.setHeader('Origin', target.replace(/\/$/, ''));
  proxyReq.setHeader('Host', url.host);
  console.log(`WS: ${req.url} -> ${target}`);
});

// Create HTTP server
const server = http.createServer((req, res) => {
  // Extract server ID from path: /utah2/~~stream -> utah2
  const match = req.url.match(/^\/([^/]+)(\/.*)/);
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid path. Use /{server-id}/path');
    return;
  }

  const [, serverId, path] = match;
  const target = servers[serverId];

  if (!target) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Unknown server: ${serverId}. Available: ${Object.keys(servers).join(', ')}`);
    return;
  }

  // Rewrite URL to remove server prefix
  req.url = path;

  proxy.web(req, res, { target });
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  const match = req.url.match(/^\/([^/]+)(\/.*)/);
  if (!match) {
    socket.destroy();
    return;
  }

  const [, serverId, path] = match;
  const target = servers[serverId];

  if (!target) {
    socket.destroy();
    return;
  }

  // Rewrite URL to remove server prefix
  req.url = path;

  proxy.ws(req, socket, head, { target });
});

server.listen(PROXY_PORT, () => {
  console.log(`WebSDR proxy server running on http://localhost:${PROXY_PORT}`);
  console.log('Available servers:');
  for (const [id, url] of Object.entries(servers)) {
    console.log(`  /${id}/* -> ${url}`);
  }
  console.log('\nExample WebSocket URL: ws://localhost:8080/utah2/~~stream?v=11');
});
