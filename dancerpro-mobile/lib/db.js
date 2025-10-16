// Minimal web-safe DB module to satisfy imports and provide localStorage-backed data.
// On web, `openDb()` returns null and callers use sample data or localStorage fallbacks.
// Functions accept a `db` argument for signature compatibility but ignore it on web.

function isWeb() {
  return typeof window !== 'undefined';
}

export function openDb() {
  // Native apps can wire SQLite; web returns null to trigger fallbacks in screens.
  return null;
}

export async function initDb(_db) {
  // No-op on web; keep signature for native.
  return;
}

// Get current user ID for user-specific data storage
function getCurrentUserId() {
  if (!isWeb() || !window.localStorage) return null;
  try {
    const userData = window.localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.id || parsed.email || null;
    }
  } catch {}
  return null;
}

// Create user-specific key for data storage
function getUserKey(baseKey) {
  const userId = getCurrentUserId();
  return userId ? `${baseKey}_${userId}` : baseKey;
}

// In-memory cache to reduce localStorage parse/serialize overhead
const memCache = new Map();

function readLocal(key, fallback = []) {
  if (!isWeb() || !window.localStorage) return Array.isArray(fallback) ? fallback : fallback || [];
  try {
    const userKey = getUserKey(key);
    if (memCache.has(userKey)) {
      const cached = memCache.get(userKey);
      return Array.isArray(cached) ? cached : (cached ?? (Array.isArray(fallback) ? fallback : fallback || []));
    }
    const raw = window.localStorage.getItem(userKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const value = Array.isArray(parsed) ? parsed : (parsed || fallback || []);
    memCache.set(userKey, value);
    return value;
  } catch {
    return Array.isArray(fallback) ? fallback : fallback || [];
  }
}

function writeLocal(key, value) {
  if (!isWeb() || !window.localStorage) return;
  try { 
    const userKey = getUserKey(key);
    memCache.set(userKey, value);
    window.localStorage.setItem(userKey, JSON.stringify(value)); 
  } catch {}
}

function lastNDaysDateRange(days) {
  const now = new Date();
  const start = new Date(now.getTime() - (Number(days || 0) * 24 * 60 * 60 * 1000));
  return { start, end: now };
}

// Initialize user data with sample data if empty
export async function initializeUserData(_db) {
  const userId = getCurrentUserId();
  if (!userId) return;

  // Check if user already has data
  const existingClients = readLocal('clients');
  if (existingClients.length > 0) return; // User already has data

  // Initialize with empty data structures
  writeLocal('venues', []);
  writeLocal('shifts', []);
  writeLocal('clients', []);
  writeLocal('outfits', []);
  writeLocal('transactions', []);
  
  console.log(`[DB] Initialized empty data structures for user: ${userId}`);
}

// Transactions
export function computeTransactionTotals(rows = []) {
  try {
    const totals = rows.reduce((acc, r) => {
      const amt = Number(r.amount || 0);
      if (r.type === 'income') acc.income += amt;
      else if (r.type === 'expense') acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
    return { income: totals.income, expense: totals.expense, net: (totals.income || 0) - (totals.expense || 0) };
  } catch {
    return { income: 0, expense: 0, net: 0 };
  }
}

export async function getRecentTransactions(_db, days = 30) {
  const tx = readLocal('transactions');
  const { start, end } = lastNDaysDateRange(days);
  return tx.filter(t => {
    const dStr = t.date || t.createdAt || t.timestamp || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    return d >= start && d <= end;
  }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
}

export async function insertTransaction(_db, payload) {
  const list = readLocal('transactions');
  const id = payload.id || `tx_${Date.now()}`;
  const row = { id, ...payload };
  writeLocal('transactions', [row, ...list]);
  return row;
}

export async function deleteTransaction(_db, id) {
  const list = readLocal('transactions');
  writeLocal('transactions', list.filter(t => t.id !== id));
  return true;
}

// Clients
export async function getAllClients(_db) { return readLocal('clients'); }
export async function insertClient(_db, payload) {
  const list = readLocal('clients');
  const id = payload.id || `c_${Date.now()}`;
  const row = { id, ...payload };
  writeLocal('clients', [row, ...list]);
  return row;
}
export async function updateClient(_db, payload) {
  const list = readLocal('clients');
  const next = list.map(c => c.id === payload.id ? { ...c, ...payload } : c);
  writeLocal('clients', next);
  return payload;
}
export async function deleteClient(_db, id) {
  const list = readLocal('clients');
  writeLocal('clients', list.filter(c => c.id !== id));
  return true;
}

// Venues
export async function getAllVenues(_db) { return readLocal('venues'); }
export async function insertVenue(_db, payload) {
  const list = readLocal('venues');
  const id = payload.id || `v_${Date.now()}`;
  const row = { id, ...payload };
  writeLocal('venues', [row, ...list]);
  return row;
}
export async function updateVenue(_db, payload) {
  const list = readLocal('venues');
  const next = list.map(v => v.id === payload.id ? { ...v, ...payload } : v);
  writeLocal('venues', next);
  return payload;
}
export async function deleteVenue(_db, id) {
  const list = readLocal('venues');
  writeLocal('venues', list.filter(v => v.id !== id));
  return true;
}

// Shifts
export async function getShiftsWithVenues(_db) {
  const shifts = readLocal('shifts');
  const venues = readLocal('venues');
  const byId = new Map(venues.map(v => [v.id, v]));
  return shifts.map(s => ({
    ...s,
    venueName: byId.get(s.venueId)?.name || s.venueName || '—',
  }));
}

export async function getShiftTransactionTotals(_db) {
  const tx = readLocal('transactions');
  const map = new Map();
  tx.forEach(t => {
    const id = t.shiftId || null;
    if (!id) return;
    const prev = map.get(id) || { income: 0, expense: 0, net: 0 };
    const amt = Number(t.amount || 0);
    if (t.type === 'income') prev.income += amt; else if (t.type === 'expense') prev.expense += amt;
    prev.net = (prev.income || 0) - (prev.expense || 0);
    map.set(id, prev);
  });
  return map;
}

export async function insertShift(_db, payload) {
  const list = readLocal('shifts');
  const id = payload.id || `s_${Date.now()}`;
  const row = { id, ...payload };
  writeLocal('shifts', [row, ...list]);
  return row;
}
export async function updateShift(_db, payload) {
  const list = readLocal('shifts');
  const next = list.map(s => s.id === payload.id ? { ...s, ...payload } : s);
  writeLocal('shifts', next);
  return payload;
}
export async function deleteShift(_db, id) {
  const list = readLocal('shifts');
  writeLocal('shifts', list.filter(s => s.id !== id));
  return true;
}

export async function getRecentShifts(_db, days = 7) {
  const shifts = readLocal('shifts');
  const { start, end } = lastNDaysDateRange(days);
  return shifts.filter(s => {
    const dStr = s.start || s.end || s.date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    return d >= start && d <= end;
  }).sort((a, b) => new Date(b.start || b.date || 0) - new Date(a.start || a.date || 0));
}

export async function getTopVenue(_db, days = 7) {
  const shifts = await getRecentShifts(_db, days);
  const totals = new Map();
  shifts.forEach(s => {
    const key = s.venueId || s.venueName || '—';
    totals.set(key, (totals.get(key) || 0) + Number(s.earnings || 0));
  });
  let best = null; let bestTotal = 0;
  totals.forEach((t, k) => { if (t > bestTotal) { bestTotal = t; best = k; } });
  if (!best) return null;
  const bestVenueName = readLocal('venues').find(v => v.id === best)?.name || (typeof best === 'string' ? best : '—');
  return { venue: bestVenueName, total: bestTotal };
}

// Outfits
export async function getAllOutfits(_db) { return readLocal('outfits'); }

export async function getAllOutfitsWithEarnings(_db) {
  const outfits = readLocal('outfits');
  const tx = readLocal('transactions');
  const byOutfit = new Map();
  tx.forEach(t => {
    const id = t.outfitId || null;
    if (!id) return;
    const prev = byOutfit.get(id) || { income: 0, expense: 0 };
    const amt = Number(t.amount || 0);
    if (t.type === 'income') prev.income += amt; else if (t.type === 'expense') prev.expense += amt;
    byOutfit.set(id, prev);
  });
  return outfits.map(o => {
    const totals = byOutfit.get(o.id) || { income: 0, expense: 0 };
    const net = (totals.income || 0) - (totals.expense || 0);
    return { ...o, net };
  });
}

export async function getTopEarningOutfits(_db, count = 5) {
  const rows = await getAllOutfitsWithEarnings(_db);
  return rows.slice().sort((a, b) => (b.net || 0) - (a.net || 0)).slice(0, count);
}

export async function insertOutfit(_db, payload) {
  const list = readLocal('outfits');
  const id = payload.id || `o_${Date.now()}`;
  const row = { id, ...payload };
  writeLocal('outfits', [row, ...list]);
  return row;
}
export async function updateOutfit(_db, payload) {
  const list = readLocal('outfits');
  const next = list.map(o => o.id === payload.id ? { ...o, ...payload } : o);
  writeLocal('outfits', next);
  return payload;
}
export async function deleteOutfit(_db, id) {
  const list = readLocal('outfits');
  writeLocal('outfits', list.filter(o => o.id !== id));
  return true;
}
export async function incrementWearCount(_db, id) {
  const list = readLocal('outfits');
  const next = list.map(o => o.id === id ? { ...o, wearCount: Number(o.wearCount || 0) + 1 } : o);
  writeLocal('outfits', next);
  return next.find(o => o.id === id);
}

// Performance helpers
export async function getClientShifts(_db, clientId, days = 120, limit = 10) {
  const shifts = readLocal('shifts');
  const { start, end } = lastNDaysDateRange(days);
  return shifts.filter(s => {
    const dStr = s.start || s.end || s.date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    const within = d >= start && d <= end;
    return within && (s.clientId === clientId);
  }).sort((a, b) => new Date(b.start || b.date || 0) - new Date(a.start || a.date || 0)).slice(0, limit);
}

export async function getClientPerformance(_db, clientId, days = 120) {
  // Compute performance based on shifts tied to this client within the range
  const shifts = readLocal('shifts');
  const { start, end } = lastNDaysDateRange(days);
  const clientShifts = shifts.filter(s => {
    const dStr = s.start || s.end || s.date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    const within = d >= start && d <= end;
    return within && (s.clientId === clientId);
  });

  const shiftCount = clientShifts.length;
  const totalEarnings = clientShifts.reduce((acc, s) => acc + Number(s.earnings || 0), 0);
  const avgEarnings = shiftCount ? totalEarnings / shiftCount : 0;

  // Best day-of-week by average earnings
  const byDow = new Map();
  clientShifts.forEach(s => {
    const d = new Date(s.start || s.date || Date.now());
    const dow = d.getDay();
    const list = byDow.get(dow) || [];
    list.push(Number(s.earnings || 0));
    byDow.set(dow, list);
  });
  let bestDay = null; let bestDayAvg = 0;
  byDow.forEach((list, dow) => {
    const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = dow; }
  });

  // Build simple earnings history by day for small chart in UI
  const daily = new Map();
  clientShifts.forEach(s => {
    const d = new Date(s.start || s.date || Date.now());
    const key = d.toISOString().slice(0, 10);
    daily.set(key, (daily.get(key) || 0) + Number(s.earnings || 0));
  });
  const earningsHistory = Array.from(daily.entries())
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, value]) => {
      const d = new Date(date);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      return { label, value };
    });

  return { clientId, days, shiftCount, totalEarnings, avgEarnings, bestDay, bestDayAvg, earningsHistory };
}

export async function getClientTransactions(_db, clientId, days = 30) {
  const tx = readLocal('transactions');
  const { start, end } = lastNDaysDateRange(days);
  return tx.filter(t => {
    const dStr = t.date || t.createdAt || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    const within = d >= start && d <= end;
    return within && (t.clientId === clientId);
  }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
}

export async function getVenueShifts(_db, venueId, days = 120, limit = 10) {
  const shifts = readLocal('shifts');
  const { start, end } = lastNDaysDateRange(days);
  return shifts.filter(s => {
    const dStr = s.start || s.end || s.date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return false;
    const within = d >= start && d <= end;
    return within && (s.venueId === venueId);
  }).sort((a, b) => new Date(b.start || b.date || 0) - new Date(a.start || a.date || 0)).slice(0, limit);
}

export async function getVenuePerformance(_db, venueId, days = 120) {
  const shifts = await getVenueShifts(_db, venueId, days, 100000);
  const totalEarnings = shifts.reduce((acc, s) => acc + Number(s.earnings || 0), 0);
  const avgEarnings = shifts.length ? totalEarnings / shifts.length : 0;
  const byDow = new Map();
  const daily = new Map();
  shifts.forEach(s => {
    const d = new Date(s.start || s.date || Date.now());
    const dow = d.getDay();
    const key = d.toISOString().slice(0,10);
    const list = byDow.get(dow) || [];
    list.push(Number(s.earnings || 0));
    byDow.set(dow, list);
    daily.set(key, (daily.get(key) || 0) + Number(s.earnings || 0));
  });
  let bestDay = null; let bestDayAvg = 0;
  byDow.forEach((list, dow) => {
    const avg = list.length ? list.reduce((a,b)=>a+b,0)/list.length : 0;
    if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = dow; }
  });
  const earningsHistory = Array.from(daily.entries()).map(([date, earnings]) => ({ date, earnings }))
    .sort((a,b)=> new Date(a.date) - new Date(b.date));
  return { venueId, days, shiftCount: shifts.length, totalEarnings, avgEarnings, bestDay, bestDayAvg, earningsHistory };
}

// KPI snapshot & backup
export async function getKpiSnapshot(_db) {
  const clients = readLocal('clients');
  const venues = readLocal('venues');
  const outfits = readLocal('outfits');
  const shifts = readLocal('shifts');
  const tx = readLocal('transactions');
  const totals = computeTransactionTotals(tx);
  const byClientMap = new Map();
  tx.forEach(t => {
    const id = t.clientId || null;
    if (!id) return;
    const prev = byClientMap.get(id) || { income: 0, expense: 0, net: 0 };
    const amt = Number(t.amount || 0);
    if (t.type === 'income') prev.income += amt; else if (t.type === 'expense') prev.expense += amt;
    prev.net = (prev.income || 0) - (prev.expense || 0);
    byClientMap.set(id, prev);
  });
  const byClient = Array.from(byClientMap.entries()).map(([clientId, totals]) => ({ clientId, net: (totals.income || 0) - (totals.expense || 0) }))
    .sort((a, b) => (b.net || 0) - (a.net || 0));
  const topClient = byClient[0] || null;
  return {
    totals: { income: totals.income, expense: totals.expense, net: totals.net },
    counts: { clients: clients.length, venues: venues.length, outfits: outfits.length, shifts: shifts.length, transactions: tx.length },
    byClient,
    topClient,
  };
}

export async function getAllDataSnapshot(_db) {
  return {
    venues: readLocal('venues'),
    shifts: readLocal('shifts'),
    transactions: readLocal('transactions'),
    clients: readLocal('clients'),
    outfits: readLocal('outfits'),
    events: readLocal('events'),
  };
}

export async function importAllDataSnapshot(_db, snapshot) {
  const safe = snapshot || {};
  writeLocal('venues', Array.isArray(safe.venues) ? safe.venues : []);
  writeLocal('shifts', Array.isArray(safe.shifts) ? safe.shifts : []);
  writeLocal('transactions', Array.isArray(safe.transactions) ? safe.transactions : []);
  writeLocal('clients', Array.isArray(safe.clients) ? safe.clients : []);
  writeLocal('outfits', Array.isArray(safe.outfits) ? safe.outfits : []);
  writeLocal('events', Array.isArray(safe.events) ? safe.events : []);
  return true;
}
// Update an existing transaction by id
export async function updateTransaction(_db, payload) {
  const list = readLocal('transactions');
  if (!payload || !payload.id) return null;
  const next = list.map(t => t.id === payload.id ? { ...t, ...payload } : t);
  writeLocal('transactions', next);
  return next.find(t => t.id === payload.id) || null;
}

// AI Reports
// Get all AI reports, sorted by most recent first
export async function getAiReports(_db) {
  const reports = readLocal('aiReports');
  return reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// Insert a new AI report
export async function insertAiReport(_db, payload) {
  const list = readLocal('aiReports');
  const id = payload.id || `air_${Date.now()}`;
  const row = { 
    id, 
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload 
  };
  writeLocal('aiReports', [row, ...list]);
  return row;
}

// Update an existing AI report
export async function updateAiReport(_db, payload) {
  const list = readLocal('aiReports');
  const next = list.map(r => r.id === payload.id ? { 
    ...r, 
    ...payload,
    updatedAt: new Date().toISOString()
  } : r);
  writeLocal('aiReports', next);
  return next.find(r => r.id === payload.id) || null;
}

// Delete an AI report by id
export async function deleteAiReport(_db, id) {
  const list = readLocal('aiReports');
  writeLocal('aiReports', list.filter(r => r.id !== id));
  return true;
}

// Get a specific AI report by id
export async function getAiReportById(_db, id) {
  const list = readLocal('aiReports');
  return list.find(r => r.id === id) || null;
}
