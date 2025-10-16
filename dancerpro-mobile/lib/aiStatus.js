// Integration status utilities for mobile project
import { buildApiEndpoint, fetchWithTimeout } from './http';
import { fetchCloudSnapshot } from './api';
import WebSocketService from '../services/WebSocketService';

export async function checkBackendHealth(timeoutMs = 3500) {
  try {
    const url = buildApiEndpoint('/health');
    const res = await fetchWithTimeout(url, { method: 'GET' }, timeoutMs);
    if (!res.ok) return { ok: false, status: res.status, message: 'Unhealthy or not reachable' };
    const data = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function checkCloudSnapshot(timeoutMs = 5000) {
  try {
    const data = await fetchCloudSnapshot(timeoutMs);
    if (!data) return { ok: false, message: 'No snapshot returned' };
    return { ok: true, count: Array.isArray(data) ? data.length : 1 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function getWebSocketStatus() {
  const connected = WebSocketService.isConnected();
  const readyState = WebSocketService.getReadyState?.();
  return { connected, readyState };
}

export async function getIntegrationStatuses() {
  const [backend, cloud] = await Promise.all([ checkBackendHealth(), checkCloudSnapshot() ]);
  const websocket = getWebSocketStatus();
  return { backend, cloud, websocket };
}

export default { checkBackendHealth, checkCloudSnapshot, getWebSocketStatus, getIntegrationStatuses };