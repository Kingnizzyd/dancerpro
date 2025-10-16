// Mock data generator for localStorage-backed web DB
import { openDb, importAllDataSnapshot } from './db';
import { getAllDataSnapshot } from './db';

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function dateWithinPastMonths(months) {
  const now = new Date();
  const start = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
  const t = randomInt(start.getTime(), now.getTime());
  return new Date(t).toISOString();
}

export async function seedMockDataForUser(userId = '1', cfg = {}) {
  const config = {
    clients: 24,
    venues: 5,
    outfits: 10,
    transactions: 120,
    shifts: 120,
    months: 6,
    ...cfg,
  };

  // Ensure user context for user-specific localStorage keys
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const currentUserRaw = window.localStorage.getItem('userData');
      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      if (!currentUser || String(currentUser.id) !== String(userId)) {
        const seedUser = {
          id: String(userId),
          email: `seed-user-${userId}@example.com`,
          name: 'Seed User',
          createdAt: new Date().toISOString(),
        };
        window.localStorage.setItem('userData', JSON.stringify(seedUser));
      }
    } catch {}
  }

  // Build venues
  const venueNames = [
    'Neon Lounge',
    'Velvet Room',
    'Skyline Club',
    'Aurora Hall',
    'Pulse Stage',
    'Sapphire Bar',
    'Crimson House',
    'Golden Garden',
    'Echo Pavilion',
    'Midnight Terrace',
  ];
  const venues = Array.from({ length: config.venues }, (_, i) => {
    const name = venueNames[i % venueNames.length];
    return {
      id: `v_${String(i + 1).padStart(3, '0')}`,
      name,
      city: randomChoice(['Seattle', 'Austin', 'Miami', 'New York', 'Los Angeles', 'Chicago']),
      capacity: randomInt(80, 300),
    };
  });

  // Build outfits
  const outfitBase = [
    'Classic Black',
    'Electric Blue',
    'Ruby Red',
    'Emerald Glow',
    'Golden Spark',
    'Silver Wave',
    'Midnight Haze',
    'Sunset Rose',
    'Ice Quartz',
    'Violet Dream',
  ];
  const outfits = Array.from({ length: config.outfits }, (_, i) => ({
    id: `o_${String(i + 1).padStart(3, '0')}`,
    name: outfitBase[i % outfitBase.length],
    wearCount: randomInt(0, 25),
    color: randomChoice(['black', 'blue', 'red', 'green', 'gold', 'silver', 'purple']),
  }));

  // Clients
  const firstNames = ['Alex','Jordan','Taylor','Morgan','Casey','Riley','Jamie','Avery','Quinn','Cameron','Harper','Skyler'];
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Martinez','Hernandez'];
  const clients = Array.from({ length: config.clients }, (_, i) => {
    const fn = randomChoice(firstNames);
    const ln = randomChoice(lastNames);
    const name = `${fn} ${ln}`;
    const createdAt = dateWithinPastMonths(config.months);
    return {
      id: `c_${String(i + 1).padStart(3, '0')}`,
      name,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      phone: `+1-555-${String(randomInt(1000,9999)).padStart(4,'0')}`,
      preferredVenueId: randomChoice(venues).id,
      createdAt,
      notes: randomChoice(['VIP', 'Regular', 'New', 'Occasional']),
    };
  });

  // Shifts across requested months
  const shifts = Array.from({ length: config.shifts }, (_, i) => {
    const start = dateWithinPastMonths(config.months);
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + randomInt(2,6) * 60 * 60 * 1000);
    const venue = randomChoice(venues);
    const maybeClient = Math.random() < 0.6 ? randomChoice(clients) : null;
    const earnings = randomAmount(120, 450);
    return {
      id: `s_${String(i + 1).padStart(4, '0')}`,
      title: `Shift ${i + 1} at ${venue.name}`,
      venueId: venue.id,
      clientId: maybeClient ? maybeClient.id : null,
      start: startDate.toISOString(),
      startTime: startDate.toISOString(),
      end: endDate.toISOString(),
      earnings,
      notes: randomChoice(['Busy night', 'Steady crowd', 'Private event', 'Promo night']),
    };
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  // Transactions across requested months
  const types = ['income', 'expense'];
  const transactions = Array.from({ length: config.transactions }, (_, i) => {
    const type = Math.random() < 0.74 ? 'income' : 'expense'; // ~74% income
    const dateStr = dateWithinPastMonths(config.months);
    const venue = randomChoice(venues);
    const outfit = randomChoice(outfits);
    const shift = Math.random() < 0.7 ? randomChoice(shifts) : null; // link majority to a shift
    const client = Math.random() < 0.6 ? randomChoice(clients) : null;
    const baseIncome = randomAmount(80, 320);
    const baseExpense = randomAmount(8, 80);
    const amount = type === 'income' ? baseIncome : baseExpense;
    return {
      id: `tx_${String(i + 1).padStart(4, '0')}`,
      type,
      amount,
      date: dateStr,
      note: type === 'income' ? `Performance at ${shift ? 'shift ' + shift.id : venue.name}` : `Supplies for ${outfit.name}`,
      clientId: client ? client.id : null,
      venueId: shift ? (shift.venueId || venue.id) : venue.id,
      outfitId: outfit.id,
      shiftId: shift ? shift.id : null,
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Derive outfit wear counts from linked transactions (light-touch)
  const wearCounts = new Map();
  transactions.forEach(t => {
    if (t.type === 'income' && t.outfitId) {
      wearCounts.set(t.outfitId, (wearCounts.get(t.outfitId) || 0) + 1);
    }
  });
  const outfitsFinal = outfits.map(o => ({ ...o, wearCount: (o.wearCount || 0) + (wearCounts.get(o.id) || 0) }));

  // Optionally smooth shift earnings by summing linked income transactions
  const earningsByShift = new Map();
  transactions.forEach(t => {
    if (t.type === 'income' && t.shiftId) {
      earningsByShift.set(t.shiftId, (earningsByShift.get(t.shiftId) || 0) + Number(t.amount || 0));
    }
  });
  const shiftsFinal = shifts.map(s => ({
    ...s,
    earnings: Number((earningsByShift.get(s.id) ?? s.earnings) || 0),
  }));

  // Events for testing timelines
  const eventKinds = ['note','sync','alert'];
  const events = Array.from({ length: Math.max(12, Math.floor(config.months * 4)) }, (_, i) => ({
    id: `ev_${String(i + 1).padStart(4,'0')}`,
    type: randomChoice(eventKinds),
    date: dateWithinPastMonths(config.months),
    title: randomChoice(['Schedule published','Client milestone','Outfit maintenance','Venue booking','Cloud sync']),
    metadata: { severity: randomChoice(['low','medium','high']) },
  })).sort((a,b)=> new Date(a.date) - new Date(b.date));

  const snapshot = {
    venues,
    shifts: shiftsFinal,
    transactions,
    clients,
    outfits: outfitsFinal,
    events,
  };

  const db = openDb();
  await importAllDataSnapshot(db, snapshot);
  return snapshot;
}

// Seed performance data for existing clients without replacing them.
// Appends shifts/transactions (and venues/outfits if missing) linked to current clients.
export async function seedPerformanceForExistingClients(cfg = {}) {
  const config = {
    months: 4,
    additionalShifts: 60,
    additionalTransactions: 90,
    venuesIfMissing: 4,
    outfitsIfMissing: 6,
    ...cfg,
  };

  const db = openDb();
  const current = await getAllDataSnapshot(db);
  const clients = Array.isArray(current.clients) ? current.clients : [];
  let venues = Array.isArray(current.venues) ? current.venues : [];
  let outfits = Array.isArray(current.outfits) ? current.outfits : [];
  const shifts = Array.isArray(current.shifts) ? current.shifts : [];
  const transactions = Array.isArray(current.transactions) ? current.transactions : [];

  // If there are no venues or outfits, create a small set
  const ts = Date.now();
  if (venues.length === 0) {
    const names = ['Neon Lounge','Velvet Room','Skyline Club','Aurora Hall','Pulse Stage'];
    venues = Array.from({ length: config.venuesIfMissing }, (_, i) => ({
      id: `v_seed_${ts}_${i+1}`,
      name: names[i % names.length],
      city: randomChoice(['Seattle','Austin','Miami','New York','Los Angeles']),
      capacity: randomInt(80, 300),
    }));
  }
  if (outfits.length === 0) {
    const names = ['Classic Black','Electric Blue','Ruby Red','Emerald Glow','Silver Wave','Violet Dream'];
    outfits = Array.from({ length: config.outfitsIfMissing }, (_, i) => ({
      id: `o_seed_${ts}_${i+1}`,
      name: names[i % names.length],
      wearCount: randomInt(0, 10),
      color: randomChoice(['black','blue','red','green','silver','purple']),
    }));
  }

  // Generate shifts linked to existing clients
  const newShifts = Array.from({ length: Math.max(config.additionalShifts, clients.length * 2) }, (_, i) => {
    const start = dateWithinPastMonths(config.months);
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + randomInt(2, 6) * 60 * 60 * 1000);
    const venue = randomChoice(venues);
    const client = clients.length ? randomChoice(clients) : null;
    const earnings = randomAmount(120, 450);
    return {
      id: `s_seed_${ts}_${String(i + 1).padStart(3, '0')}`,
      title: `Shift ${i + 1} at ${venue.name}`,
      venueId: venue.id,
      clientId: client ? client.id : null,
      start: startDate.toISOString(),
      startTime: startDate.toISOString(),
      end: endDate.toISOString(),
      earnings,
      notes: randomChoice(['Busy night','Steady crowd','Private event','Promo night']),
    };
  }).sort((a, b) => new Date(a.start) - new Date(b.start));

  // Generate transactions, linking many to shifts
  const types = ['income','expense'];
  const allShifts = [...shifts, ...newShifts];
  const newTx = Array.from({ length: Math.max(config.additionalTransactions, clients.length * 3) }, (_, i) => {
    const type = Math.random() < 0.75 ? 'income' : 'expense';
    const dateStr = dateWithinPastMonths(config.months);
    const venue = randomChoice(venues);
    const outfit = randomChoice(outfits);
    const shift = Math.random() < 0.7 ? randomChoice(allShifts) : null;
    const client = clients.length ? randomChoice(clients) : null;
    const baseIncome = randomAmount(80, 320);
    const baseExpense = randomAmount(8, 80);
    const amount = type === 'income' ? baseIncome : baseExpense;
    return {
      id: `tx_seed_${ts}_${String(i + 1).padStart(3, '0')}`,
      type,
      amount,
      date: dateStr,
      note: type === 'income' ? `Performance at ${shift ? 'shift ' + shift.id : venue.name}` : `Supplies for ${outfit.name}`,
      clientId: client ? client.id : null,
      venueId: shift ? (shift.venueId || venue.id) : venue.id,
      outfitId: outfit.id,
      shiftId: shift ? shift.id : null,
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Smooth shift earnings by linked income transactions
  const earningsByShift = new Map();
  [...transactions, ...newTx].forEach(t => {
    if (t.type === 'income' && t.shiftId) {
      earningsByShift.set(t.shiftId, (earningsByShift.get(t.shiftId) || 0) + Number(t.amount || 0));
    }
  });
  const newShiftsFinal = newShifts.map(s => ({
    ...s,
    earnings: Number((earningsByShift.get(s.id) ?? s.earnings) || 0),
  }));

  const snapshot = {
    venues,
    shifts: [...shifts, ...newShiftsFinal],
    transactions: [...transactions, ...newTx],
    clients, // unchanged
    outfits,
    events: Array.isArray(current.events) ? current.events : [],
  };

  await importAllDataSnapshot(db, snapshot);
  return snapshot;
}