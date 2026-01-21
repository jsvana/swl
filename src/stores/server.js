import { writable, derived } from 'svelte/store';

// Preset servers with proxy paths for dev mode
export const presetServers = [
  {
    id: 'utah-sdr2',
    name: 'Utah SDR #2 (30-6m Omni)',
    url: 'websdr2.sdrutah.org:8902',
    proxyPath: '/websdr/utah2',
    location: { lat: 41.55, lon: -112.08 },
    bands: ['30m', '20m', '17m', '15m', '12m', '10m', '6m']
  },
  {
    id: 'utah-sdr1',
    name: 'Utah SDR #1 (160-40m)',
    url: 'websdr1.sdrutah.org:8901',
    proxyPath: '/websdr/utah1',
    location: { lat: 41.55, lon: -112.08 },
    bands: ['160m', '80m', '60m', '40m']
  },
  {
    id: 'k3fef',
    name: 'K3FEF Milford, PA',
    url: 'k3fef.com:8901',
    proxyPath: '/websdr/k3fef',
    location: { lat: 41.32, lon: -74.80 },
    bands: ['160m', '80m', '40m', '20m']
  },
  {
    id: 'kfs',
    name: 'KFS Half Moon Bay, CA',
    url: 'kfsdr.com:8901',
    proxyPath: '/websdr/kfs',
    location: { lat: 37.5, lon: -122.5 },
    bands: ['Various']
  }
];

// Currently selected server
export const currentServer = writable(presetServers[0]);

// Connection status: 'disconnected', 'connecting', 'connected', 'error'
export const connectionStatus = writable('disconnected');

// Error message if any
export const connectionError = writable(null);

// Derived: is connected
export const isConnected = derived(
  connectionStatus,
  $status => $status === 'connected'
);

// Select a server by id
export function selectServer(serverId) {
  const server = presetServers.find(s => s.id === serverId);
  if (server) {
    currentServer.set(server);
    connectionStatus.set('disconnected');
    connectionError.set(null);
  }
}
