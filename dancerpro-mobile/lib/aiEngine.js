// AI Insights Engine for mobile project
import { openDb, getAllDataSnapshot, getClientPerformance, getVenuePerformance } from './db';
import { fetchCloudSnapshot } from './api';

function safeArray(arr) { return Array.isArray(arr) ? arr : []; }
function normalize(value, max) { const m = Number(max || 0); const v = Math.max(0, Number(value || 0)); return m > 0 ? Math.min(1, v / m) : 0; }
function toDowLabel(dow) { const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; return labels[(Number(dow) || 0) % 7]; }
function adjacentDowScore(a, b) { if (a == null || b == null) return 0; const diff = Math.abs(Number(a) - Number(b)); if (diff === 0) return 1; if (diff === 1 || diff === 6) return 0.6; return 0.25; }
function stringIncludes(haystack, needle) { if (!haystack || !needle) return false; return String(haystack).toLowerCase().includes(String(needle).toLowerCase()); }

// ----- Scoring Weights (refinable) -----
const defaultWeights = {
  base_client_venue_weight: 0.35,
  base_venue_avg_weight: 0.20,
  base_dow_weight: 0.15,
  tag_weight: 0.15,
  city_match_weight: 0.10,
  capacity_weight: 0.10,
  event_weight: 0.15,
};

let scoringWeights = { ...defaultWeights };

export function setScoringWeights(newWeights = {}) {
  const keys = Object.keys(defaultWeights);
  const next = { ...scoringWeights };
  keys.forEach(k => {
    if (newWeights[k] != null) next[k] = Number(newWeights[k]);
  });
  scoringWeights = next;
}

export function getScoringWeights() { return { ...scoringWeights }; }

function computeAggregates(snapshot) {
  const shifts = safeArray(snapshot.shifts);
  const byClientVenue = new Map();
  const byVenue = new Map();
  const byClient = new Map();
  const eventFlagByVenue = new Map();
  shifts.forEach(s => {
    const earnings = Number(s.earnings || 0);
    const venueId = s.venueId || null;
    const clientId = s.clientId || null;
    if (!venueId) return;
    const vPrev = byVenue.get(venueId) || { total: 0, count: 0 };
    byVenue.set(venueId, { total: vPrev.total + earnings, count: vPrev.count + 1 });
    if (stringIncludes(s.notes, 'event')) {
      eventFlagByVenue.set(venueId, true);
    }
    if (clientId) {
      const cPrev = byClient.get(clientId) || { total: 0, count: 0 };
      byClient.set(clientId, { total: cPrev.total + earnings, count: cPrev.count + 1 });
      const key = `${clientId}|${venueId}`;
      const cvPrev = byClientVenue.get(key) || { total: 0, count: 0 };
      byClientVenue.set(key, { total: cvPrev.total + earnings, count: cvPrev.count + 1 });
    }
  });
  // Merge any explicit upcoming events if present
  safeArray(snapshot.events).forEach(e => {
    const vid = e.venueId || e.venue || null;
    if (vid) eventFlagByVenue.set(vid, true);
  });
  const venueMaxAvg = Array.from(byVenue.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);
  const clientMaxAvg = Array.from(byClient.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);
  const clientVenueMaxAvg = Array.from(byClientVenue.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);
  const maxCapacity = safeArray(snapshot.venues).reduce((acc, v) => Math.max(acc, Number(v.capacity || 0)), 0);
  return { byClientVenue, byVenue, byClient, venueMaxAvg, clientMaxAvg, clientVenueMaxAvg, maxCapacity, eventFlagByVenue };
}

// ----- Cloud Snapshot Merge & Caching -----
let cloudCache = { snapshot: null, fetchedAt: 0 };

function mergeLists(localArr, cloudArr, idKey = 'id') {
  const map = new Map();
  safeArray(localArr).forEach(it => { const k = it[idKey] ?? `${idKey}:${Math.random()}`; if (!map.has(k)) map.set(k, it); });
  safeArray(cloudArr).forEach(it => { const k = it[idKey] ?? `${idKey}:${Math.random()}`; map.set(k, { ...(map.get(k) || {}), ...it }); });
  return Array.from(map.values());
}

async function getMergedSnapshot(db, useCloud = true) {
  const local = await getAllDataSnapshot(db);
  if (!useCloud) return local;
  let cloud = null;
  try {
    if (cloudCache.snapshot && (Date.now() - cloudCache.fetchedAt) < 5 * 60 * 1000) {
      cloud = cloudCache.snapshot;
    } else {
      const res = await fetchCloudSnapshot();
      cloud = res?.snapshot || res || {};
      cloudCache = { snapshot: cloud, fetchedAt: Date.now() };
    }
  } catch {
    cloud = null;
  }
  return {
    clients: mergeLists(local.clients, cloud?.clients),
    venues: mergeLists(local.venues, cloud?.venues),
    shifts: mergeLists(local.shifts, cloud?.shifts),
    outfits: mergeLists(local.outfits, cloud?.outfits),
    transactions: mergeLists(local.transactions, cloud?.transactions),
    events: safeArray(cloud?.events),
  };
}

function tagRelevanceScore(client, venue) {
  const cTags = safeArray(client.tags);
  const vTags = safeArray(venue.tags);
  if (cTags.length && vTags.length) {
    const setC = new Set(cTags.map(t => String(t).toLowerCase()));
    const setV = new Set(vTags.map(t => String(t).toLowerCase()));
    let inter = 0;
    setC.forEach(t => { if (setV.has(t)) inter += 1; });
    const denom = Math.max(1, Math.min(setC.size, setV.size));
    return inter / denom;
  }
  const loc = venue.location || venue.city || '';
  return (stringIncludes(client.notes, venue.name) || stringIncludes(client.notes, loc)) ? 1 : 0;
}

function cityProximityScore(client, venue) {
  const cCity = client.city || client.location || null;
  const vCity = venue.city || venue.location || null;
  if (cCity && vCity) {
    return (stringIncludes(cCity, vCity) || stringIncludes(vCity, cCity)) ? 1 : 0;
  }
  if (vCity) return stringIncludes(client.notes, vCity) ? 1 : 0;
  return 0;
}

async function compatibilityScore(db, client, venue, aggregates, periodDays = 120) {
  const key = `${client.id}|${venue.id}`;
  const cv = aggregates.byClientVenue.get(key) || { total: 0, count: 0 };
  const clientVenueAvg = cv.count ? cv.total / cv.count : 0;
  const vAgg = aggregates.byVenue.get(venue.id) || { total: 0, count: 0 };
  const venueAvg = vAgg.count ? vAgg.total / vAgg.count : 0;
  const cp = await getClientPerformance(db, client.id, periodDays);
  const vp = await getVenuePerformance(db, venue.id, periodDays);
  const dowMatch = adjacentDowScore(cp.bestDay, vp.bestDay);
  const w = scoringWeights;
  const capacityNorm = normalize(Number(venue.capacity || 0), aggregates.maxCapacity || 0);
  const tagScore = tagRelevanceScore(client, venue);
  const cityScore = cityProximityScore(client, venue);
  const eventScore = aggregates.eventFlagByVenue.get(venue.id) ? 1 : 0;
  const score = (
    w.base_client_venue_weight * normalize(clientVenueAvg, aggregates.clientVenueMaxAvg) +
    w.base_venue_avg_weight * normalize(venueAvg, aggregates.venueMaxAvg) +
    w.base_dow_weight * dowMatch +
    w.tag_weight * tagScore +
    w.city_match_weight * cityScore +
    w.capacity_weight * capacityNorm +
    w.event_weight * eventScore
  );
  const rationale = [
    clientVenueAvg ? `Strong personal earnings at ${venue.name}` : null,
    venueAvg ? `Venue averages ${(venueAvg).toFixed(0)} per shift` : null,
    cp.bestDay != null && vp.bestDay != null ? `Best day alignment: ${toDowLabel(cp.bestDay)} vs ${toDowLabel(vp.bestDay)}` : null,
    tagScore ? 'Tag relevance matched' : null,
    cityScore ? `City proximity: ${venue.city || venue.location || 'local'}` : null,
    capacityNorm ? `Capacity factor considered` : null,
    eventScore ? 'Special event impact detected' : null,
  ].filter(Boolean);
  return { score, rationale, clientVenueAvg, venueAvg, clientBestDay: cp.bestDay, venueBestDay: vp.bestDay };
}

export async function generateClientAssignments(periodDays = 120, topN = 3) {
  const db = openDb();
  const snapshot = await getMergedSnapshot(db, true);
  const clients = safeArray(snapshot.clients);
  const venues = safeArray(snapshot.venues);
  const aggregates = computeAggregates(snapshot);
  const results = [];
  for (const client of clients) {
    const rows = [];
    for (const venue of venues) {
      const comp = await compatibilityScore(db, client, venue, aggregates, periodDays);
      rows.push({ client, venue, ...comp });
    }
    const ranked = rows.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, topN);
    results.push({ client, recommendations: ranked });
  }
  return results.sort((a, b) => (b.recommendations[0]?.score || 0) - (a.recommendations[0]?.score || 0));
}

export async function generateScheduleSuggestions(periodDays = 120, weeks = 4) {
  const db = openDb();
  const snapshot = await getMergedSnapshot(db, true);
  const clients = safeArray(snapshot.clients);
  const venues = safeArray(snapshot.venues);
  const aggregates = computeAggregates(snapshot);
  const suggestions = [];
  for (const client of clients) {
    const ranks = [];
    for (const venue of venues) {
      const comp = await compatibilityScore(db, client, venue, aggregates, periodDays);
      ranks.push({ venue, comp });
    }
    const best = ranks.sort((a, b) => (b.comp.score || 0) - (a.comp.score || 0))[0];
    if (!best) continue;
    const dow = best.comp.clientBestDay ?? best.comp.venueBestDay ?? 5;
    const label = toDowLabel(dow);
    suggestions.push({ client, venue: best.venue, bestDay: dow, text: `Schedule ${client.name} at ${best.venue.name} on ${label} for the next ${weeks} weeks` });
  }
  return suggestions;
}

export async function generateActionItems(periodDays = 120) {
  const db = openDb();
  const snapshot = await getMergedSnapshot(db, true);
  const clients = safeArray(snapshot.clients);
  const venues = safeArray(snapshot.venues);
  const aggregates = computeAggregates(snapshot);
  const items = [];
  for (const client of clients) {
    const cp = await getClientPerformance(db, client.id, periodDays);
    const shiftsLow = (cp.shiftCount || 0) < 3;
    const highValue = Number(client.valueScore || 0) >= 8 || safeArray(client.tags).includes('VIP');
    if (highValue && shiftsLow) {
      const ranks = [];
      for (const venue of venues) {
        const comp = await compatibilityScore(db, client, venue, aggregates, periodDays);
        ranks.push({ venue, comp });
      }
      const best = ranks.sort((a, b) => (b.comp.score || 0) - (a.comp.score || 0))[0];
      const label = toDowLabel(best?.comp?.clientBestDay ?? best?.comp?.venueBestDay ?? 5);
      items.push({ priority: 'high', title: `Book ${client.name} on ${label} at ${best?.venue?.name || 'top venue'}`, description: 'High-value client with low recent shifts. Boost retention and revenue.' });
    }
  }
  for (const venue of venues) {
    const vAgg = aggregates.byVenue.get(venue.id) || { total: 0, count: 0 };
    const avg = vAgg.count ? vAgg.total / vAgg.count : 0;
    if (avg > (aggregates.venueMaxAvg * 0.75) && vAgg.count < 3) {
      items.push({ priority: 'medium', title: `Underutilized high-earning venue: ${venue.name}`, description: 'Increase scheduling at this venue to capitalize on strong averages.' });
    }
  }
  return items;
}

export async function buildAiInsights(periodDays = 120, weightsOverride = null) {
  if (weightsOverride) setScoringWeights(weightsOverride);
  const assignments = await generateClientAssignments(periodDays, 3);
  const schedule = await generateScheduleSuggestions(periodDays, 4);
  const actions = await generateActionItems(periodDays);
  const pairs = [];
  assignments.forEach(row => { row.recommendations.forEach(r => { pairs.push({ client: row.client, venue: r.venue, score: r.score, rationale: r.rationale }); }); });
  const compatibilityTop = pairs.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  return { assignments, schedule, actions, compatibilityTop };
}

export async function answerQuery(question, opts = {}) {
  const periodDays = Number(opts.periodDays || 120);
  const { assignments } = await buildAiInsights(periodDays);
  const db = openDb();
  const snapshot = await getMergedSnapshot(db, true);
  const aggregates = computeAggregates(snapshot);
  const q = String(question || '').toLowerCase();
  // Intent: Top 3 venues ranked by criteria
  if (q.includes('top') && q.includes('venues')) {
    const critMatch = q.match(/ranked\s+by\s+([a-zA-Z ]+)/);
    const criteria = String(critMatch?.[1] || '').trim().toLowerCase();
    let topVenues = [];
    if (criteria.includes('earning') || criteria.includes('revenue')) {
      topVenues = Array.from(aggregates.byVenue.entries())
        .map(([id, v]) => ({ id, avg: v.count ? v.total / v.count : 0 }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map(v => snapshot.venues.find(x => x.id === v.id)?.name || v.id);
    } else {
      // default to compatibility-based ranking
      const pairs = [];
      assignments.forEach(row => row.recommendations.forEach(r => pairs.push({ venue: r.venue.name, score: r.score })));
      const grouped = pairs.reduce((acc, p) => { acc[p.venue] = Math.max(acc[p.venue] || 0, p.score); return acc; }, {});
      topVenues = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
    }
    return `Top 3 venues: ${topVenues.join(', ')}`;
  }

  // Intent: Weekly plan for <time_period>
  if (q.includes('weekly plan')) {
    const tpMatch = q.match(/for\s+(this week|next week|\d+\s*days)/);
    const tpStr = tpMatch?.[1] || 'this week';
    const days = tpStr.includes('days') ? Number(tpStr.replace(/[^0-9]/g, '')) : 7;
    const plan = await generateScheduleSuggestions(days, 1);
    const summary = plan.slice(0, 5).map(p => `${p.client.name}: ${p.venue.name} on ${toDowLabel(p.bestDay)}`).join(' | ');
    return `Weekly plan (${tpStr}): ${summary}`;
  }

  // Intent: Clients to focus based on metrics
  if (q.includes('clients to focus') || q.includes('focus clients')) {
    const focus = [];
    for (const a of assignments) {
      const valueScore = Number(a.client.valueScore || 0);
      const top = a.recommendations[0];
      if (valueScore >= 8 && (top?.score || 0) >= 0.5) {
        focus.push(`${a.client.name} → ${top?.venue?.name || '—'}`);
      }
    }
    return focus.length ? `Focus clients: ${focus.join(', ')}` : 'No high-priority clients identified.';
  }

  // Intent: Underperforming venues below threshold
  if (q.includes('underperforming venues')) {
    const m = q.match(/(below|under)\s*\$?(\d+)/);
    const thr = m ? Number(m[2]) : Math.round((aggregates.venueMaxAvg || 0) * 0.4);
    const list = Array.from(aggregates.byVenue.entries())
      .map(([id, v]) => ({ id, avg: v.count ? v.total / v.count : 0 }))
      .filter(v => v.avg < thr)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5)
      .map(v => `${snapshot.venues.find(x => x.id === v.id)?.name || v.id} ($${Math.round(v.avg)})`);
    return list.length ? `Underperforming venues (avg < $${thr}): ${list.join(', ')}` : 'No venues under the performance threshold.';
  }

  // Fallback quick plan
  const summary = assignments.slice(0, 3).map(a => {
    const best = a.recommendations[0];
    const day = toDowLabel(best?.clientBestDay ?? best?.venueBestDay ?? 5);
    return `${a.client.name}: ${best?.venue?.name || '—'} on ${day}`;
  }).join(' | ');
  return `Here’s the quick plan: ${summary}. Ask “top 3 venues ranked by <compatibility|earnings>”, “weekly plan for <this week|next week|7 days>”, “clients to focus”, or “underperforming venues under <amount>”.`;
}

export default { buildAiInsights, generateClientAssignments, generateScheduleSuggestions, generateActionItems, answerQuery, setScoringWeights, getScoringWeights };