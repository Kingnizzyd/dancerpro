// Sample data and helpers for web fallback usage across screens
// Used by: Dashboard, Shifts, Venues, Clients, Money, Outfits

export const venues = [
  { id: 'v1', name: 'Velvet Lounge', location: 'Downtown', avgEarnings: 650 },
  { id: 'v2', name: 'Gold Room', location: 'Midtown', avgEarnings: 780 },
  { id: 'v3', name: 'Neon Palace', location: 'Uptown', avgEarnings: 520 },
];

export const shifts = [
  {
    id: 's1',
    start: '2025-10-03T20:00:00Z',
    end: '2025-10-04T02:00:00Z',
    venueId: 'v2',
    earnings: 850,
    notes: 'Busy crowd, high tips.',
  },
  {
    id: 's2',
    start: '2025-10-04T21:00:00Z',
    end: '2025-10-05T01:30:00Z',
    venueId: 'v1',
    earnings: 610,
    notes: 'VIP group.',
  },
  {
    id: 's3',
    start: '2025-10-06T22:00:00Z',
    end: '2025-10-07T02:15:00Z',
    venueId: 'v3',
    earnings: 470,
    notes: 'Slow start, picked up.',
  },
  {
    id: 's4',
    start: '2025-10-07T21:30:00Z',
    end: '2025-10-08T02:00:00Z',
    venueId: 'v2',
    earnings: 920,
    notes: 'Event night.',
  },
];

export const clients = [
  { id: 'c1', name: 'Alex', contact: '+1-555-1001', valueScore: 8, tags: ['VIP'], notes: 'Prefers Gold Room.' },
  { id: 'c2', name: 'Jamie', contact: '+1-555-1002', valueScore: 6, tags: ['Regular'], notes: 'Weekend only.' },
  { id: 'c3', name: 'Morgan', contact: '+1-555-1003', valueScore: 9, tags: ['VIP', 'High Spender'], notes: 'Loves exclusive outfits.' },
];

export const outfits = [
  { id: 'o1', name: 'Pink Diamond', cost: 250, wearCount: 8, photos: [], favorites: ['v2'], createdAt: '2025-01-15T10:00:00Z' },
  { id: 'o2', name: 'Gold Silk', cost: 300, wearCount: 6, photos: [], favorites: ['v1'], createdAt: '2025-02-01T10:00:00Z' },
  { id: 'o3', name: 'Midnight Velvet', cost: 180, wearCount: 12, photos: [], favorites: ['v3'], createdAt: '2025-01-20T10:00:00Z' },
  { id: 'o4', name: 'Crystal Dreams', cost: 420, wearCount: 4, photos: [], favorites: ['v2', 'v1'], createdAt: '2025-02-10T10:00:00Z' },
  { id: 'o5', name: 'Ruby Red', cost: 200, wearCount: 10, photos: [], favorites: ['v1'], createdAt: '2025-01-25T10:00:00Z' },
  { id: 'o6', name: 'Silver Storm', cost: 350, wearCount: 3, photos: [], favorites: ['v2'], createdAt: '2025-02-15T10:00:00Z' },
];

export const transactions = [
  { id: 't1', type: 'income', amount: 450, category: 'Tips', date: '2025-01-15', note: 'Great night with Pink Diamond', outfitId: 'o1', clientId: 'c1' },
  { id: 't2', type: 'income', amount: 320, category: 'Dance', date: '2025-01-16', note: 'VIP room performance', outfitId: 'o2', clientId: 'c2' },
  { id: 't3', type: 'income', amount: 280, category: 'Tips', date: '2025-01-17', note: 'Midnight Velvet was a hit', outfitId: 'o3' },
  { id: 't4', type: 'income', amount: 650, category: 'VIP', date: '2025-01-18', note: 'Crystal Dreams premium night', outfitId: 'o4', clientId: 'c3' },
  { id: 't5', type: 'income', amount: 380, category: 'Tips', date: '2025-01-19', note: 'Ruby Red classic', outfitId: 'o5' },
  { id: 't6', type: 'income', amount: 520, category: 'Dance', date: '2025-01-20', note: 'Silver Storm debut', outfitId: 'o6', clientId: 'c1' },
  { id: 't7', type: 'income', amount: 420, category: 'Tips', date: '2025-01-22', note: 'Pink Diamond encore', outfitId: 'o1', clientId: 'c2' },
  { id: 't8', type: 'income', amount: 350, category: 'VIP', date: '2025-01-23', note: 'Gold Silk elegance', outfitId: 'o2', clientId: 'c3' },
  { id: 't9', type: 'income', amount: 290, category: 'Tips', date: '2025-01-24', note: 'Midnight Velvet repeat', outfitId: 'o3' },
  { id: 't10', type: 'income', amount: 580, category: 'VIP', date: '2025-01-25', note: 'Crystal Dreams luxury', outfitId: 'o4', clientId: 'c3' },
  { id: 't11', type: 'expense', amount: 45, category: 'Outfit Care', date: '2025-01-16', note: 'Pink Diamond dry cleaning', outfitId: 'o1' },
  { id: 't12', type: 'expense', amount: 60, category: 'Accessories', date: '2025-01-17', note: 'Gold Silk matching jewelry', outfitId: 'o2' },
  { id: 't13', type: 'expense', amount: 25, category: 'Outfit Care', date: '2025-01-18', note: 'Midnight Velvet repairs', outfitId: 'o3' },
  { id: 't14', type: 'expense', amount: 80, category: 'Accessories', date: '2025-01-19', note: 'Crystal Dreams shoes', outfitId: 'o4' },
  { id: 't15', type: 'expense', amount: 35, category: 'Outfit Care', date: '2025-01-20', note: 'Ruby Red alterations', outfitId: 'o5' },
  { id: 't16', type: 'expense', amount: 70, category: 'Accessories', date: '2025-01-21', note: 'Silver Storm accessories', outfitId: 'o6' },
  { id: 't17', type: 'expense', amount: 80, category: 'Transport', date: '2025-01-22', note: 'Uber to venue' },
  { id: 't18', type: 'expense', amount: 120, category: 'Beauty', date: '2025-01-23', note: 'Hair and makeup' },
  { id: 't19', type: 'income', amount: 200, category: 'Tips', date: '2025-01-24', note: 'Casual night earnings' },
  { id: 't20', type: 'expense', amount: 50, category: 'Food', date: '2025-01-25', note: 'Post-shift meal' },
];

export function getVenueById(id) {
  return venues.find(v => v.id === id);
}

export function lastNDaysShifts(days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return shifts.filter(s => new Date(s.start) >= cutoff);
}

export function sumEarnings(items) {
  return items.reduce((acc, it) => acc + (it.earnings || 0), 0);
}

export function topVenueByEarnings(items) {
  const totals = new Map();
  for (const s of items) {
    totals.set(s.venueId, (totals.get(s.venueId) || 0) + (s.earnings || 0));
  }
  let best = null;
  for (const [venueId, total] of totals.entries()) {
    if (!best || total > best.total) {
      best = { venueId, total };
    }
  }
  return best ? { venue: getVenueById(best.venueId), total: best.total } : null;
}