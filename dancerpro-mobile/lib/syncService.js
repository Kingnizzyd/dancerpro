import { BACKEND_URL } from './config';
import { openDb, getAllDataSnapshot, importAllDataSnapshot } from './db';

async function request(path, method = 'GET', token, body) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = data.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function pushToCloud(token) {
  const db = openDb();
  const snapshot = await getAllDataSnapshot(db);
  const data = await request('/api/sync/import', 'POST', token, { snapshot });
  return data;
}

export async function restoreFromCloud(token) {
  const db = openDb();
  const data = await request('/api/sync/export', 'GET', token);
  const snapshot = data?.snapshot || { venues: [], shifts: [], transactions: [], clients: [], outfits: [], events: [] };
  await importAllDataSnapshot(db, snapshot);
  return data;
}

export async function getSyncStatus(token) {
  const data = await request('/api/sync/status', 'GET', token);
  return data?.meta || { updatedAt: null };
}