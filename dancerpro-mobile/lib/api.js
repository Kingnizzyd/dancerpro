import { BACKEND_URL } from './config';

function getAuthToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('authToken');
      return raw || null;
    }
  } catch {}
  return null;
}

export async function fetchCloudSnapshot(token) {
  const authToken = token || getAuthToken();
  if (!authToken) throw new Error('Missing auth token');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => controller?.abort(), 8000);
  const res = await fetch(`${BACKEND_URL}/api/sync/import`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
    signal: controller?.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sync fetch failed (${res.status}): ${body.slice(0, 100)}`);
  }
  const json = await res.json();
  if (!json?.success) throw new Error(json?.error || 'Sync import failed');
  return json.snapshot || {};
}

export default { fetchCloudSnapshot };