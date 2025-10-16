// AI Insights Engine: recommendations, scheduling, compatibility, action items, Q&A
// Works off local db snapshot (clients, venues, shifts, transactions).

import { openDb } from './db';
import { getAllDataSnapshot, getClientPerformance, getVenuePerformance } from './db';

function safeArray(arr) { return Array.isArray(arr) ? arr : []; }

function normalize(value, max) {
  const m = Number(max || 0);
  const v = Math.max(0, Number(value || 0));
  return m > 0 ? Math.min(1, v / m) : 0;
}

function toDowLabel(dow) {
  const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return labels[(Number(dow) || 0) % 7];
}

function adjacentDowScore(a, b) {
  if (a == null || b == null) return 0;
  const diff = Math.abs(Number(a) - Number(b));
  if (diff === 0) return 1;
  if (diff === 1 || diff === 6) return 0.6; // neighboring days (wrap-around)
  return 0.25;
}

function stringIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
}

// Compute aggregate stats needed once for scoring
function computeAggregates(snapshot) {
  const shifts = safeArray(snapshot.shifts);
  const byClientVenue = new Map(); // key: `${clientId}|${venueId}` -> { total, count }
  const byVenue = new Map(); // venueId -> { total, count }
  const byClient = new Map(); // clientId -> { total, count }

  shifts.forEach(s => {
    const earnings = Number(s.earnings || 0);
    const venueId = s.venueId || null;
    const clientId = s.clientId || null;
    if (!venueId) return;
    // Venue aggregates
    const vPrev = byVenue.get(venueId) || { total: 0, count: 0 };
    byVenue.set(venueId, { total: vPrev.total + earnings, count: vPrev.count + 1 });
    // Client aggregates
    if (clientId) {
      const cPrev = byClient.get(clientId) || { total: 0, count: 0 };
      byClient.set(clientId, { total: cPrev.total + earnings, count: cPrev.count + 1 });
      // Client-Venue aggregates
      const key = `${clientId}|${venueId}`;
      const cvPrev = byClientVenue.get(key) || { total: 0, count: 0 };
      byClientVenue.set(key, { total: cvPrev.total + earnings, count: cvPrev.count + 1 });
    }
  });

  const venueMaxAvg = Array.from(byVenue.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);
  const clientMaxAvg = Array.from(byClient.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);
  const clientVenueMaxAvg = Array.from(byClientVenue.values()).reduce((m, v) => Math.max(m, v.count ? (v.total / v.count) : 0), 0);

  return { byClientVenue, byVenue, byClient, venueMaxAvg, clientMaxAvg, clientVenueMaxAvg };
}

// Compatibility score between a client and a venue
async function compatibilityScore(db, client, venue, aggregates, periodDays = 120) {
  const key = `${client.id}|${venue.id}`;
  const cv = aggregates.byClientVenue.get(key) || { total: 0, count: 0 };
  const clientVenueAvg = cv.count ? cv.total / cv.count : 0;

  const vAgg = aggregates.byVenue.get(venue.id) || { total: 0, count: 0 };
  const venueAvg = vAgg.count ? vAgg.total / vAgg.count : 0;

  const cp = await getClientPerformance(db, client.id, periodDays);
  const vp = await getVenuePerformance(db, venue.id, periodDays);
  const dowMatch = adjacentDowScore(cp.bestDay, vp.bestDay);

  // Simple tag/notes bonuses
  const tags = safeArray(client.tags);
  const vipBonus = tags.includes('VIP') ? (venueAvg > (aggregates.venueMaxAvg * 0.7) ? 0.12 : 0.06) : 0;
  const highSpenderBonus = tags.includes('High Spender') ? 0.08 : 0;
  const noteBonus = stringIncludes(client.notes, venue.name) ? 0.1 : 0;

  // Weighted scoring
  const score = (
    0.50 * normalize(clientVenueAvg, aggregates.clientVenueMaxAvg) +
    0.30 * normalize(venueAvg, aggregates.venueMaxAvg) +
    0.20 * dowMatch +
    vipBonus + highSpenderBonus + noteBonus
  );

  const rationale = [
    clientVenueAvg ? `Strong personal earnings at ${venue.name}` : null,
    venueAvg ? `Venue averages ${(venueAvg).toFixed(0)} per shift` : null,
    cp.bestDay != null && vp.bestDay != null ? `Best day alignment: ${toDowLabel(cp.bestDay)} vs ${toDowLabel(vp.bestDay)}` : null,
    vipBonus ? 'VIP preference matched' : null,
    highSpenderBonus ? 'High spender bonus applied' : null,
    noteBonus ? 'Notes indicate preference for this venue' : null,
  ].filter(Boolean);

  return { score, rationale, clientVenueAvg, venueAvg, clientBestDay: cp.bestDay, venueBestDay: vp.bestDay };
}

// Generate top venue recommendations for each client
export async function generateClientAssignments(periodDays = 120, topN = 3) {
  const db = openDb();
  const snapshot = await getAllDataSnapshot(db);
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

  // Sort clients by their top recommendation score descending
  return results.sort((a, b) => (b.recommendations[0]?.score || 0) - (a.recommendations[0]?.score || 0));
}

// Suggest schedules focusing on the best aligned venues and days
export async function generateScheduleSuggestions(periodDays = 120, weeks = 4) {
  const db = openDb();
  const snapshot = await getAllDataSnapshot(db);
  const clients = safeArray(snapshot.clients);
  const venues = safeArray(snapshot.venues);
  const aggregates = computeAggregates(snapshot);

  const suggestions = [];
  for (const client of clients) {
    // Pick top venue
    const ranks = [];
    for (const venue of venues) {
      const comp = await compatibilityScore(db, client, venue, aggregates, periodDays);
      ranks.push({ venue, comp });
    }
    const best = ranks.sort((a, b) => (b.comp.score || 0) - (a.comp.score || 0))[0];
    if (!best) continue;

    const dow = best.comp.clientBestDay ?? best.comp.venueBestDay ?? 5; // default Friday
    const label = toDowLabel(dow);
    suggestions.push({
      client,
      venue: best.venue,
      bestDay: dow,
      text: `Schedule ${client.name} at ${best.venue.name} on ${label} for the next ${weeks} weeks`,
    });
  }
  return suggestions;
}

// Prioritized action items from performance data
export async function generateActionItems(periodDays = 120) {
  const db = openDb();
  const snapshot = await getAllDataSnapshot(db);
  const clients = safeArray(snapshot.clients);
  const venues = safeArray(snapshot.venues);
  const aggregates = computeAggregates(snapshot);

  const items = [];
  for (const client of clients) {
    const cp = await getClientPerformance(db, client.id, periodDays);
    const shiftsLow = (cp.shiftCount || 0) < 3;
    const highValue = Number(client.valueScore || 0) >= 8 || safeArray(client.tags).includes('VIP');

    if (highValue && shiftsLow) {
      // Assign their top venue
      const ranks = [];
      for (const venue of venues) {
        const comp = await compatibilityScore(db, client, venue, aggregates, periodDays);
        ranks.push({ venue, comp });
      }
      const best = ranks.sort((a, b) => (b.comp.score || 0) - (a.comp.score || 0))[0];
      const label = toDowLabel(best?.comp?.clientBestDay ?? best?.comp?.venueBestDay ?? 5);
      items.push({
        priority: 'high',
        title: `Book ${client.name} on ${label} at ${best?.venue?.name || 'top venue'}`,
        description: 'High-value client with low recent shifts. Boost retention and revenue.',
      });
    }
  }

  // Venue utilization prompts
  for (const venue of venues) {
    const vAgg = aggregates.byVenue.get(venue.id) || { total: 0, count: 0 };
    const avg = vAgg.count ? vAgg.total / vAgg.count : 0;
    if (avg > (aggregates.venueMaxAvg * 0.75) && vAgg.count < 3) {
      items.push({
        priority: 'medium',
        title: `Underutilized high-earning venue: ${venue.name}`,
        description: 'Increase scheduling at this venue to capitalize on strong averages.',
      });
    }
  }

  return items;
}

// Combined insights for UI consumption
export async function buildAiInsights(periodDays = 120) {
  const assignments = await generateClientAssignments(periodDays, 3);
  const schedule = await generateScheduleSuggestions(periodDays, 4);
  const actions = await generateActionItems(periodDays);

  // Prepare a compact compatibility list (top 10 pairs)
  const pairs = [];
  assignments.forEach(row => {
    row.recommendations.forEach(r => {
      pairs.push({ client: row.client, venue: r.venue, score: r.score, rationale: r.rationale });
    });
  });
  const compatibilityTop = pairs.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);

  return { assignments, schedule, actions, compatibilityTop };
}

// Simple natural-language Q&A powered by engine context
export async function answerQuery(question, opts = {}) {
  const db = openDb();
  const q = String(question || '').toLowerCase();
  const periodDays = Number(opts.periodDays || 120);
  const { assignments, schedule } = await buildAiInsights(periodDays);

  if (q.includes('best club') || q.includes('best venue')) {
    const topPair = assignments[0]?.recommendations[0];
    if (topPair) {
      const day = toDowLabel(topPair.clientBestDay ?? topPair.venueBestDay ?? 5);
      return `Top venue is ${topPair.venue.name} for ${assignments[0].client.name}. Book on ${day}.`;
    }
  }

  if (q.includes('schedule') || q.includes('when should i work') || q.includes('what day')) {
    const s = schedule[0];
    if (s) return s.text;
  }

  if (q.includes('compatibility')) {
    const nameMatch = q.match(/compatibility\s+(?:for\s+)?([a-zA-Z ]+)/);
    if (nameMatch) {
      const target = String(nameMatch[1]).trim().toLowerCase();
      const row = assignments.find(a => String(a.client.name || '').toLowerCase().includes(target));
      if (row) {
        const tops = row.recommendations.map(r => `${r.venue.name} (${(r.score*100).toFixed(0)}%)`).join(', ');
        return `Top matches for ${row.client.name}: ${tops}.`;
      }
    }
  }

  // Fallback: provide a concise summary
  const summary = assignments.slice(0, 3).map(a => {
    const best = a.recommendations[0];
    const day = toDowLabel(best?.clientBestDay ?? best?.venueBestDay ?? 5);
    return `${a.client.name}: ${best?.venue?.name || '—'} on ${day}`;
  }).join(' | ');
  return `Here’s the quick plan: ${summary}. Ask “best venue”, “schedule”, or “compatibility for <client>”.`;
}

export default {
  buildAiInsights,
  generateClientAssignments,
  generateScheduleSuggestions,
  generateActionItems,
  answerQuery,
};