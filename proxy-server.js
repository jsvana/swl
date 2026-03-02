#!/usr/bin/env node
/**
 * WebSocket proxy server for WebSDR connections.
 * Run this alongside `npm run dev` to proxy WebSocket connections.
 *
 * Usage: node proxy-server.js
 *
 * The proxy listens on port 8080 and forwards WebSocket connections to WebSDR servers.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { URL } from 'url';

const PROXY_PORT = 8080;

// Server mappings
const servers = {
  'utah2': { host: 'websdr2.sdrutah.org', port: 8902 },
  'utah1': { host: 'websdr1.sdrutah.org', port: 8901 },
  'k3fef': { host: 'k3fef.com', port: 8901 },
  'kfs': { host: 'kfsdr.com', port: 8901 },
};

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSDR Proxy Server\n\nConnect via WebSocket to /{server-id}/path\n\nAvailable servers: ' + Object.keys(servers).join(', '));
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (clientWs, req) => {
  // Parse URL to extract server ID and path
  // Format: /utah2/~~stream?v=11
  const match = req.url.match(/^\/([^/]+)(\/.*)/);
  if (!match) {
    console.error('Invalid URL format:', req.url);
    clientWs.close(1008, 'Invalid URL format');
    return;
  }

  const [, serverId, path] = match;
  const serverConfig = servers[serverId];

  if (!serverConfig) {
    console.error('Unknown server:', serverId);
    clientWs.close(1008, `Unknown server: ${serverId}`);
    return;
  }

  const { host, port } = serverConfig;
  const targetUrl = `ws://${host}:${port}${path}`;
  const origin = `http://${host}:${port}`;

  console.log(`[${serverId}] Connecting to ${targetUrl}`);

  // Buffer for messages received before upstream connection is ready
  let pendingMessages = [];
  let upstreamReady = false;

  // Connect to the target WebSDR server with proper headers
  const targetWs = new WebSocket(targetUrl, {
    headers: {
      'Origin': origin,
      'Host': `${host}:${port}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  targetWs.on('open', () => {
    console.log(`[${serverId}] Connected to WebSDR`);
    upstreamReady = true;

    // Send any buffered messages
    if (pendingMessages.length > 0) {
      console.log(`[${serverId}] Sending ${pendingMessages.length} buffered messages`);
      for (const { data, isBinary } of pendingMessages) {
        targetWs.send(data, { binary: isBinary });
      }
      pendingMessages = [];
    }
  });

  // Forward messages from WebSDR to client
  targetWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });

  // Forward messages from client to WebSDR
  clientWs.on('message', (data, isBinary) => {
    // Log all client messages for debugging
    const text = data.toString();
    if (text.startsWith('GET ')) {
      console.log(`[${serverId}] Client -> Server: ${text}`);
    } else {
      console.log(`[${serverId}] Client -> Server: [${isBinary ? 'binary' : 'text'}] ${data.length} bytes`);
    }

    if (upstreamReady && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(data, { binary: isBinary });
    } else {
      // Buffer messages until upstream is ready
      console.log(`[${serverId}] Buffering message (upstream not ready)`);
      pendingMessages.push({ data, isBinary });
    }
  });

  // Handle target WebSocket errors
  targetWs.on('error', (err) => {
    console.error(`[${serverId}] Target error:`, err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Target connection error');
    }
  });

  // Handle client WebSocket errors
  clientWs.on('error', (err) => {
    console.error(`[${serverId}] Client error:`, err.message);
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });

  // Handle target close
  targetWs.on('close', (code, reason) => {
    console.log(`[${serverId}] Target closed: ${code} ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason);
    }
  });

  // Handle client close
  clientWs.on('close', (code, reason) => {
    console.log(`[${serverId}] Client disconnected: ${code}`);
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });
});

httpServer.listen(PROXY_PORT, () => {
  console.log(`WebSDR proxy server running on http://localhost:${PROXY_PORT}`);
  console.log('Available servers:');
  for (const [id, config] of Object.entries(servers)) {
    console.log(`  /${id}/* -> ws://${config.host}:${config.port}`);
  }
  console.log('\nExample: ws://localhost:8080/utah2/~~stream?v=11');
});
