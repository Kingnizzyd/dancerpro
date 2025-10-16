import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Animated, Platform, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { openDb, getRecentTransactions, computeTransactionTotals, insertTransaction, getShiftsWithVenues, deleteTransaction, getAllClients, getAllOutfits, getAllVenues, getKpiSnapshot } from '../lib/db';
import { GradientCard, GradientButton, ModernInput, Toast, Segmented, Button, Input } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';
import { clients as sampleClients } from '../data/sampleData';

const { width } = Dimensions.get('window');

export default function Money({ route }) {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(computeTotalsLocal([]));
  const [txDays, setTxDays] = useState(30); // 30, 90, or 'all'
  const [sortAsc, setSortAsc] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Tips');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [shiftId, setShiftId] = useState(null);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [clientOptions, setClientOptions] = useState([]);
  const [outfitId, setOutfitId] = useState(null);
  const [outfitOptions, setOutfitOptions] = useState([]);
  const [venueOptions, setVenueOptions] = useState([]);
  const [filterVenueId, setFilterVenueId] = useState('');
  const [venueFilterOpen, setVenueFilterOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  const [recentCats, setRecentCats] = useState([]);
  const [lastAdded, setLastAdded] = useState(null);
  const categoryTotals = useMemo(() => {
    try {
      const map = new Map();
      const filtered = applyFilters(items);
      for (const r of filtered) {
        const key = (r.category || '—').trim();
        const prev = map.get(key) || { income: 0, expense: 0 };
        if (r.type === 'income') prev.income += r.amount || 0;
        else if (r.type === 'expense') prev.expense += r.amount || 0;
        map.set(key, prev);
      }
      const arr = Array.from(map.entries()).map(([category, totals]) => ({
        category,
        income: totals.income,
        expense: totals.expense,
        net: (totals.income || 0) - (totals.expense || 0),
      }));
      arr.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
      return arr;
    } catch {
      return [];
    }
  }, [items, fromDate, toDate, filterCategory]);
  const allCategories = useMemo(() => {
    const set = new Set((items || []).map(i => (i.category || '').trim()).filter(Boolean));
    return Array.from(set);
  }, [items]);
  const suggestions = useMemo(() => {
    const s = new Set([...(allCategories || []), ...(recentCats || [])]);
    return Array.from(s);
  }, [allCategories, recentCats]);

  const clientsById = useMemo(() => {
    const map = new Map();
    for (const c of clientOptions) map.set(c.id, c);
    return map;
  }, [clientOptions]);
  const [snapshot, setSnapshot] = useState({ byClient: [], topClient: null, counts: {}, totals: { income: 0, expense: 0, net: 0 } });
  // Type-specific quick category defaults
  const incomeDefaults = useMemo(() => [
    'VIP Dance',
    'Lapdance',
    'Private Dance',
    'Champagne Room',
    'Stage Tips',
    'Bottle',
    'Drink',
    'Room',
    'Merch',
  ], []);
  const expenseDefaults = useMemo(() => [
    'House Fee',
    'Club Fee',
    'DJ Tip',
    'Shoes',
    'Outfit',
    'Parking',
    'Makeup',
    'Nails',
    'Costume Repair',
    'Rideshare',
    'Food',
  ], []);
  const commonCategories = useMemo(() => [
    'VIP Dance',
    'Lapdance',
    'Private Dance',
    'Champagne Room',
    'Stage Tips',
    'Bottle',
    'Drink',
    'Room',
    'House Fee',
    'Parking',
    'Merch',
  ], []);

  // Type-aware suggestions: defaults + categories from same-type history + recent picks
  const typeSuggestions = useMemo(() => {
    const base = type === 'income' ? incomeDefaults : expenseDefaults;
    const fromHistory = Array.from(new Set((items || [])
      .filter(i => i.type === type)
      .map(i => (i.category || '').trim())
      .filter(Boolean)));
    const s = new Set([...(base || []), ...(fromHistory || []), ...(recentCats || [])]);
    return Array.from(s);
  }, [type, items, recentCats, incomeDefaults, expenseDefaults]);

  // Set sensible default when switching type
  useEffect(() => {
    setCategory(type === 'income' ? 'Tips' : 'House Fee');
  }, [type]);

  useEffect(() => {
    const db = openDb();
    if (!db) return; // web fallback uses sample data
    (async () => {
      try {
        const daysValue = txDays === 'all' ? 50000 : txDays;
        const rows = await getRecentTransactions(db, daysValue);
        setItems(rows);
        setTotals(computeTransactionTotals(rows));

        const shiftsWithVenues = await getShiftsWithVenues(db);
        setShiftOptions(shiftsWithVenues);

        const clients = await getAllClients(db);
        setClientOptions(clients);

        const outfits = await getAllOutfits(db);
        setOutfitOptions(outfits);

        const venues = await getAllVenues(db);
        setVenueOptions(venues);

        const s = await getKpiSnapshot(db);
        setSnapshot(s);
      } catch (e) {
        console.warn('Money DB load failed, using sample data', e);
      }
    })();
  }, [txDays]);

  // Persist selected Money range (web) and restore on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = (() => {
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `moneyDays_${userId}` : 'moneyDays';
            return window.localStorage.getItem(key);
          } catch {
            return window.localStorage.getItem('moneyDays');
          }
        })();
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed === 30 || parsed === 90 || parsed === 'all') setTxDays(parsed);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const userRaw = window.localStorage.getItem('userData');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || null;
        const key = userId ? `moneyDays_${userId}` : 'moneyDays';
        window.localStorage.setItem(key, JSON.stringify(txDays));
      } catch {
        try { window.localStorage.setItem('moneyDays', JSON.stringify(txDays)); } catch {}
      }
    }
  }, [txDays]);

  // Web fallback for KPI snapshot and clients
  useEffect(() => {
    const db = openDb();
    if (db) return;
    (async () => {
      try {
        const s = await getKpiSnapshot(db);
        setSnapshot(s);
      } catch {}
    })();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = (() => {
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `clients_${userId}` : 'clients';
            return window.localStorage.getItem(key);
          } catch {
            return window.localStorage.getItem('clients');
          }
        })();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setClientOptions(parsed);
          else setClientOptions(sampleClients || []);
        } else {
          setClientOptions(sampleClients || []);
        }
      } else {
        setClientOptions(sampleClients || []);
      }
    } catch {
      setClientOptions(sampleClients || []);
    }
  }, []);

  // Load persisted filters and recent categories (web, user-scoped)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = (() => {
        try {
          const userRaw = window.localStorage.getItem('userData');
          const user = userRaw ? JSON.parse(userRaw) : null;
          const userId = user?.id || user?.email || null;
          const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
          return window.localStorage.getItem(key);
        } catch {
          return window.localStorage.getItem('moneyFilters');
        }
      })();
      if (raw) {
        try {
          const f = JSON.parse(raw);
          setFromDate(f.fromDate || '');
          setToDate(f.toDate || '');
          setFilterCategory(f.filterCategory || '');
          setFilterClientId(f.filterClientId || '');
        } catch {}
      }
      const cats = (() => {
        try {
          const userRaw = window.localStorage.getItem('userData');
          const user = userRaw ? JSON.parse(userRaw) : null;
          const userId = user?.id || user?.email || null;
          const key = userId ? `recentCategories_${userId}` : 'recentCategories';
          return window.localStorage.getItem(key);
        } catch {
          return window.localStorage.getItem('recentCategories');
        }
      })();
      if (cats) {
        try { setRecentCats(JSON.parse(cats) || []); } catch {}
      }
    }
  }, []);

  // Accept clientId param to set client filter (native) or persist on web
  useEffect(() => {
    const clientIdParam = route?.params?.clientId;
    if (clientIdParam) {
      setFilterClientId(clientIdParam);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = (() => {
            try {
              const userRaw = window.localStorage.getItem('userData');
              const user = userRaw ? JSON.parse(userRaw) : null;
              const userId = user?.id || user?.email || null;
              const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
              return window.localStorage.getItem(key);
            } catch {
              return window.localStorage.getItem('moneyFilters');
            }
          })();
          const prev = raw ? JSON.parse(raw) : {};
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
            window.localStorage.setItem(key, JSON.stringify({ ...prev, filterClientId: clientIdParam }));
          } catch {
            window.localStorage.setItem('moneyFilters', JSON.stringify({ ...prev, filterClientId: clientIdParam }));
          }
        }
      } catch {}
    }
  }, [route?.params?.clientId]);

  // Persist filters (web, user-scoped)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const payload = { fromDate, toDate, filterCategory, filterClientId, filterVenueId };
      try {
        const userRaw = window.localStorage.getItem('userData');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || null;
        const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
        window.localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        window.localStorage.setItem('moneyFilters', JSON.stringify(payload));
      }
    }
  }, [fromDate, toDate, filterCategory, filterClientId, filterVenueId]);

  async function handleAdd() {
    const db = openDb();
    const tx = { type, amount: parseFloat(amount || '0'), category, date, note };
    
    // Client-side validation
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!amount || isNaN(tx.amount) || tx.amount <= 0) {
      setError('Amount must be a number greater than 0');
      setSuccess('');
      return;
    }
    if (!dateOk) {
      setError('Date must be in YYYY-MM-DD format');
      setSuccess('');
      return;
    }
    if (!category) {
      setError('Category is required');
      setSuccess('');
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      if (db) {
        // Enhanced transaction with outfit linking
        const transactionData = { 
          ...tx, 
          shiftId: shiftId || null, 
          clientId: clientId || null, 
          outfitId: outfitId || null 
        };
        
        const created = await insertTransaction(db, transactionData);
        
        // Refresh data after successful insertion
        const daysValue = txDays === 'all' ? 50000 : txDays;
        const rows = await getRecentTransactions(db, daysValue);
        setItems(rows);
        setTotals(computeTransactionTotals(rows));
        setLastAdded(created);
        
        // Update recent categories
          if (category && !recentCats.includes(category)) {
            const newCats = [category, ...recentCats.slice(0, 9)];
            setRecentCats(newCats);
            if (typeof window !== 'undefined' && window.localStorage) {
              try {
                const userRaw = window.localStorage.getItem('userData');
                const user = userRaw ? JSON.parse(userRaw) : null;
                const userId = user?.id || user?.email || null;
                const key = userId ? `recentCategories_${userId}` : 'recentCategories';
                window.localStorage.setItem(key, JSON.stringify(newCats));
              } catch {
                window.localStorage.setItem('recentCategories', JSON.stringify(newCats));
              }
            }
          }
        
        setSuccess(`${type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(tx.amount)} added successfully${outfitId ? ' and linked to outfit' : ''}`);
      } else {
        const newItem = { id: `t_${Date.now()}`, ...tx, shiftId, clientId, outfitId };
        const next = [newItem, ...items];
        setItems(next);
        setTotals(computeTotalsLocal(next));
        setLastAdded(newItem);
        
        // Update recent categories for web fallback
        if (category && !recentCats.includes(category)) {
          const newCats = [category, ...recentCats.slice(0, 9)];
          setRecentCats(newCats);
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              const userRaw = window.localStorage.getItem('userData');
              const user = userRaw ? JSON.parse(userRaw) : null;
              const userId = user?.id || user?.email || null;
              const key = userId ? `recentCategories_${userId}` : 'recentCategories';
              window.localStorage.setItem(key, JSON.stringify(newCats));
            } catch {
              window.localStorage.setItem('recentCategories', JSON.stringify(newCats));
            }
          }
        }
        
        setSuccess(`${type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(tx.amount)} added successfully${outfitId ? ' and linked to outfit' : ''}`);
      }
      // reset form
      setAmount('');
      setCategory(type === 'income' ? 'Tips' : 'House Fee');
      setDate(new Date().toISOString().slice(0, 10));
      setNote('');
      setType('income');
      setShiftId(null);
      setClientId(null);
      setOutfitId(null);
      setShowForm(false);
      setToast({ message: success, type: 'success', visible: true });
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 3500);
    } catch (e) {
      console.warn('handleAdd failed', e);
      const errorMessage = e.message || 'Failed to add transaction';
      setError(errorMessage);
      setSuccess('');
      setToast({ message: errorMessage, type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 4000);
    }
  }

  async function handleUndo() {
    if (!lastAdded) return;
    const db = openDb();
    try {
      if (db) {
        await deleteTransaction(db, lastAdded.id);
        const daysValue = txDays === 'all' ? 50000 : txDays;
        const rows = await getRecentTransactions(db, daysValue);
        setItems(rows);
        setTotals(computeTransactionTotals(rows));
      } else {
        const next = items.filter(i => i.id !== lastAdded.id);
        setItems(next);
        setTotals(computeTotalsLocal(next));
      }
      setToast({ message: 'Undo: transaction removed', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      setLastAdded(null);
    } catch (e) {
      console.warn('Undo failed', e);
      setToast({ message: 'Failed to undo', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  function applyFilters(list) {
    const shiftVenueById = new Map((shiftOptions || []).map(s => [s.id, s.venueId]));
    return list.filter(item => {
      const d = item.date;
      const afterFrom = fromDate ? d >= fromDate : true;
      const beforeTo = toDate ? d <= toDate : true;
      const matchCat = filterCategory ? (item.category || '').toLowerCase().includes(filterCategory.toLowerCase()) : true;
      const matchClient = filterClientId ? item.clientId === filterClientId : true;
      const matchVenue = filterVenueId
        ? ((item.venueId && item.venueId === filterVenueId) || (item.shiftId && shiftVenueById.get(item.shiftId) === filterVenueId))
        : true;
      return afterFrom && beforeTo && matchCat && matchClient && matchVenue;
    });
  }

  return (
  <View style={styles.container}>
    <Text style={styles.heading}>Money</Text>
    <Segmented
      options={[
        { label: '30d', value: 30 },
        { label: '90d', value: 90 },
        { label: 'All', value: 'all' },
      ]}
      value={txDays}
      onChange={setTxDays}
    />
      {filterClientId ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Tag text={`Client: ${clientsById.get(filterClientId)?.name || filterClientId}`} backgroundColor="#222" color="#ccc" />
          <Button label="Clear" variant="ghost" onPress={() => {
            setFilterClientId('');
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                const raw = window.localStorage.getItem('moneyFilters');
                const prev = raw ? JSON.parse(raw) : {};
                const payload = { ...prev, filterClientId: '' };
                window.localStorage.setItem('moneyFilters', JSON.stringify(payload));
              }
            } catch {}
          }} />
        </View>
      ) : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {success ? <Text style={styles.success} accessibilityRole="status">{success}</Text> : null}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} actionLabel={lastAdded ? 'Undo' : undefined} onAction={lastAdded ? handleUndo : undefined} />
      <View style={styles.formBar}>
        {showForm ? (
          <View style={styles.form}>
            <Segmented
              options={[{ label: 'Income', value: 'income' }, { label: 'Expense', value: 'expense' }]}
              value={type}
              onChange={setType}
            />
            <Input placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <Input placeholder="Category" value={category} onChangeText={setCategory} />
            <CategoryPicker
              label={type === 'income' ? 'Quick Income Category' : 'Quick Expense Category'}
              category={category}
              setCategory={(c) => {
                setCategory(c);
                try {
                  // Persist to recent categories on pick (web)
                  const nextCats = Array.from(new Set([c, ...recentCats])).slice(0, 20);
                  setRecentCats(nextCats);
                  if (typeof window !== 'undefined' && window.localStorage) {
                    try {
                      const userRaw = window.localStorage.getItem('userData');
                      const user = userRaw ? JSON.parse(userRaw) : null;
                      const userId = user?.id || user?.email || null;
                      const key = userId ? `recentCategories_${userId}` : 'recentCategories';
                      window.localStorage.setItem(key, JSON.stringify(nextCats));
                    } catch {
                      window.localStorage.setItem('recentCategories', JSON.stringify(nextCats));
                    }
                  }
                } catch {}
              }}
              options={typeSuggestions}
            />
            {category ? (
              <View style={styles.suggestions}>
                {typeSuggestions.filter(c => c.toLowerCase().includes(category.toLowerCase()) && c.toLowerCase() !== category.toLowerCase()).slice(0, 5).map((c) => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)} accessibilityRole="button" accessibilityLabel={`Use category ${c}`}>
                    <Text style={styles.suggestionRow}>🔖 {c}</Text>
                  </TouchableOpacity>
                ))}
                <Button label="Clear suggestions" variant="ghost" onPress={() => { setRecentCats([]); if (typeof window !== 'undefined' && window.localStorage) { try { const userRaw = window.localStorage.getItem('userData'); const user = userRaw ? JSON.parse(userRaw) : null; const userId = user?.id || user?.email || null; const key = userId ? `recentCategories_${userId}` : 'recentCategories'; window.localStorage.removeItem(key); } catch { window.localStorage.removeItem('recentCategories'); } } }} />
              </View>
            ) : null}
            <Input placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
            <Input placeholder="Note" value={note} onChangeText={setNote} />
            <ShiftPicker shiftId={shiftId} setShiftId={setShiftId} options={shiftOptions} />
            <ClientPicker clientId={clientId} setClientId={setClientId} options={clientOptions} />
            <OutfitPicker outfitId={outfitId} setOutfitId={setOutfitId} options={outfitOptions} />
            <Button title="Add" onPress={handleAdd} variant="primary" />
            <Button title="Cancel" onPress={() => setShowForm(false)} variant="ghost" />
          </View>
        ) : showQuickForm ? (
          <QuickTransactionForm
            onClose={() => setShowQuickForm(false)}
            onSuccess={(transaction) => {
              setLastAdded(transaction);
              setShowQuickForm(false);
              // Refresh data
              const db = openDb();
              if (db) {
                (async () => {
                  try {
                    const daysValue = txDays === 'all' ? 50000 : txDays;
                    const rows = await getRecentTransactions(db, daysValue);
                    setItems(rows);
                    setTotals(computeTransactionTotals(rows));
                  } catch (e) {
                    console.warn('Failed to refresh after quick add', e);
                  }
                })();
              }
              setToast({ message: 'Transaction added successfully', type: 'success', visible: true });
              setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 3000);
            }}
            venueOptions={venueOptions}
            clientOptions={clientOptions}
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowForm(true)} style={{ flex: 1 }}>
              <Text style={styles.showFormBtn}>+ Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQuickForm(true)} style={{ flex: 1 }}>
              <Text style={[styles.showFormBtn, { backgroundColor: '#ffd166', color: '#000' }]}>⚡ Quick Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button
          label={sortAsc ? 'Sort Amount ↑' : 'Sort Amount ↓'}
          variant={sortAsc ? 'primary' : 'ghost'}
          onPress={() => {
            const next = !sortAsc;
            setSortAsc(next);
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                try {
                  const userRaw = window.localStorage.getItem('userData');
                  const user = userRaw ? JSON.parse(userRaw) : null;
                  const userId = user?.id || user?.email || null;
                  const key = userId ? `moneySortAsc_${userId}` : 'moneySortAsc';
                  window.localStorage.setItem(key, JSON.stringify(next));
                } catch {
                  window.localStorage.setItem('moneySortAsc', JSON.stringify(next));
                }
              }
            } catch {}
          }}
        />
      </View>
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Filters</Text>
        <Input placeholder="From YYYY-MM-DD" value={fromDate} onChangeText={setFromDate} />
        <Input placeholder="To YYYY-MM-DD" value={toDate} onChangeText={setToDate} />
        <Input placeholder="Category contains" value={filterCategory} onChangeText={setFilterCategory} />
        {filterClientId ? (
          <Button label={`Clear Client Filter (${clientsById.get(filterClientId)?.name || filterClientId})`} variant="ghost" onPress={() => setFilterClientId('')} />
        ) : null}
        {filterVenueId ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tag text={`Venue: ${(venueOptions.find(v => v.id === filterVenueId)?.name) || filterVenueId}`} backgroundColor="#222" color="#ccc" />
            <Button label="Clear" variant="ghost" onPress={() => {
              setFilterVenueId('');
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const raw = (() => {
                    try {
                      const userRaw = window.localStorage.getItem('userData');
                      const user = userRaw ? JSON.parse(userRaw) : null;
                      const userId = user?.id || user?.email || null;
                      const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                      return window.localStorage.getItem(key);
                    } catch {
                      return window.localStorage.getItem('moneyFilters');
                    }
                  })();
                  const prev = raw ? JSON.parse(raw) : {};
                  try {
                    const userRaw = window.localStorage.getItem('userData');
                    const user = userRaw ? JSON.parse(userRaw) : null;
                    const userId = user?.id || user?.email || null;
                    const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                    window.localStorage.setItem(key, JSON.stringify({ ...prev, filterVenueId: '' }));
                  } catch {
                    window.localStorage.setItem('moneyFilters', JSON.stringify({ ...prev, filterVenueId: '' }));
                  }
                }
              } catch {}
            }} />
          </View>
        ) : (
          <Button label="Filter by Venue" variant="ghost" onPress={() => setVenueFilterOpen(true)} />
        )}
        <TouchableOpacity onPress={() => exportCSV(applyFilters(items))}>
          <Text style={styles.exportBtn}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => {
          const db = openDb();
          try {
            const snapshot = await getKpiSnapshot(db);
            exportJSON(snapshot);
          } catch (e) {
            console.warn('Export KPI JSON failed', e);
          }
        }}>
          <Text style={styles.exportBtn}>Export KPI JSON</Text>
        </TouchableOpacity>
      </View>
      {venueFilterOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Venue</Text>
            <FlatList
              data={(venueOptions || []).slice(0, 12)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  setFilterVenueId(item.id);
                  setVenueFilterOpen(false);
                  try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                      const raw = (() => {
                        try {
                          const userRaw = window.localStorage.getItem('userData');
                          const user = userRaw ? JSON.parse(userRaw) : null;
                          const userId = user?.id || user?.email || null;
                          const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                          return window.localStorage.getItem(key);
                        } catch {
                          return window.localStorage.getItem('moneyFilters');
                        }
                      })();
                      const prev = raw ? JSON.parse(raw) : {};
                      try {
                        const userRaw = window.localStorage.getItem('userData');
                        const user = userRaw ? JSON.parse(userRaw) : null;
                        const userId = user?.id || user?.email || null;
                        const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                        window.localStorage.setItem(key, JSON.stringify({ ...prev, filterVenueId: item.id }));
                      } catch {
                        window.localStorage.setItem('moneyFilters', JSON.stringify({ ...prev, filterVenueId: item.id }));
                      }
                    }
                  } catch {}
                }} style={styles.modalRow}>
                  <Text style={styles.modalRowText}>{item.name || item.id}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#666' }}>No venues available</Text>
                </View>
              )}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {filterVenueId ? (
                <Button label="Clear Venue Filter" variant="ghost" onPress={() => { setFilterVenueId(''); }} />
              ) : null}
              <Button label="Close" variant="ghost" onPress={() => setVenueFilterOpen(false)} />
            </View>
          </View>
        </View>
      )}
      <View style={styles.cards}>
        <GradientCard variant="accent" padding="medium" style={{ minWidth: 160 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.cardTitle}>{`Income (${txDays === 'all' ? 'All' : txDays + 'd'})`}</Text>
            {Platform.OS !== 'web' ? <Ionicons name="cash-outline" size={16} color="#06d6a0" /> : <Text>💵</Text>}
          </View>
          <Text style={styles.cardValue}>{formatCurrency(totals.income)}</Text>
        </GradientCard>
        <GradientCard variant="coral" padding="medium" style={{ minWidth: 160 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.cardTitle}>{`Expenses (${txDays === 'all' ? 'All' : txDays + 'd'})`}</Text>
            {Platform.OS !== 'web' ? <Ionicons name="card-outline" size={16} color="#ff2d90" /> : <Text>💸</Text>}
          </View>
          <Text style={styles.cardValue}>{formatCurrency(totals.expense)}</Text>
        </GradientCard>
        <GradientCard variant="minimal" padding="medium" style={{ minWidth: 160 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.cardTitle}>{`Net (${txDays === 'all' ? 'All' : txDays + 'd'})`}</Text>
            {Platform.OS !== 'web' ? <Ionicons name="trending-up-outline" size={16} color="#ffd166" /> : <Text>📈</Text>}
          </View>
          <Text style={styles.cardValue}>{formatCurrency(totals.net)}</Text>
        </GradientCard>
      </View>
      {Array.isArray(snapshot?.byClient) && snapshot.byClient.length ? (
        <View style={styles.cards}>
          {snapshot.byClient
            .slice()
            .sort((a, b) => (b.net || 0) - (a.net || 0))
            .slice(0, 3)
            .map((row) => (
              <GradientCard key={row.clientId} variant="minimal" padding="small" style={{ minWidth: 160 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.cardTitle}>{getClientName(clientsById, row.clientId)}</Text>
                  {Platform.OS !== 'web' ? (
                    <Ionicons name="person-outline" size={16} color={row.net >= 0 ? '#06d6a0' : '#ff2d90'} />
                  ) : (
                    <Text>🧑</Text>
                  )}
                </View>
                <Text style={styles.cardValue}>{`${formatCurrency(row.net)} net`}</Text>
                <View style={{ marginTop: 8 }}>
                  <Button label="Filter" variant="ghost" onPress={() => setFilterClientId(row.clientId)} />
                </View>
              </GradientCard>
            ))}
        </View>
      ) : null}
      {categoryTotals.length ? (
        <View style={styles.cards}>
          {categoryTotals.slice(0, 3).map(ct => (
            <GradientCard key={ct.category} variant="minimal" padding="small" style={{ minWidth: 160 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>{ct.category}</Text>
                {Platform.OS !== 'web' ? (
                  <Ionicons name="pricetag-outline" size={16} color={ct.net >= 0 ? '#06d6a0' : '#ff2d90'} />
                ) : (
                  <Text>🔖</Text>
                )}
              </View>
              <Text style={styles.cardValue}>{`${formatCurrency(ct.net)} net`}</Text>
            </GradientCard>
          ))}
        </View>
      ) : null}
      <FlatList
        data={(function() {
          const rows = applyFilters(items);
          const arr = [...rows];
          arr.sort((a, b) => (sortAsc ? (a.amount || 0) - (b.amount || 0) : (b.amount || 0) - (a.amount || 0)));
          return arr;
        })()}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TransactionRow
            item={item}
            clientsById={clientsById}
            setFilterClientId={setFilterClientId}
            setFilterCategory={setFilterCategory}
          />
        )}
      />
    </View>
  );
}

function TransactionRow({ item, clientsById, setFilterClientId, setFilterCategory }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);

  // Restore amount sort (web)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = (() => {
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `moneySortAsc_${userId}` : 'moneySortAsc';
            return window.localStorage.getItem(key);
          } catch {
            return window.localStorage.getItem('moneySortAsc');
          }
        })();
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed === true || parsed === false) setSortAsc(parsed);
        }
      } catch {}
    }
  }, []);
  const date = new Date(item.date);
  const color = item.type === 'income' ? '#06d6a0' : '#ff2d90';
  const sign = item.type === 'income' ? '+' : '-';
  const iconEl = Platform.OS !== 'web' ? (
    <Ionicons name={item.type === 'income' ? 'cash-outline' : 'card-outline'} size={14} color={color} />
  ) : null;
  return (
    <Animated.View style={[styles.row, { opacity: fade }]}> 
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {iconEl}
          <TouchableOpacity onPress={() => setFilterCategory?.((item.category || '').trim())} accessibilityRole="button" accessibilityLabel={`Filter by ${item.category || '—'}`}>
            <Text style={styles.category}>{item.category || '—'}</Text>
          </TouchableOpacity>
          {item.clientId ? (
            <TouchableOpacity onPress={() => {
              setFilterClientId?.(item.clientId);
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const raw = (() => {
                    try {
                      const userRaw = window.localStorage.getItem('userData');
                      const user = userRaw ? JSON.parse(userRaw) : null;
                      const userId = user?.id || user?.email || null;
                      const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                      return window.localStorage.getItem(key);
                    } catch {
                      return window.localStorage.getItem('moneyFilters');
                    }
                  })();
                  const prev = raw ? JSON.parse(raw) : {};
                  const payload = { ...prev, filterClientId: item.clientId };
                  try {
                    const userRaw = window.localStorage.getItem('userData');
                    const user = userRaw ? JSON.parse(userRaw) : null;
                    const userId = user?.id || user?.email || null;
                    const key = userId ? `moneyFilters_${userId}` : 'moneyFilters';
                    window.localStorage.setItem(key, JSON.stringify(payload));
                  } catch {
                    window.localStorage.setItem('moneyFilters', JSON.stringify(payload));
                  }
                }
              } catch {}
            }}>
              <Text style={{ color: '#ccc', fontSize: 12, textDecorationLine: 'underline' }}>(Client: {clientsById?.get(item.clientId)?.name || item.clientId})</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.note}>{date.toLocaleDateString()} • {item.note || ''}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>{sign}${item.amount}</Text>
    </Animated.View>
  );
}



function computeTotalsLocal(rows) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount || 0;
    else if (r.type === 'expense') expense += r.amount || 0;
  }
  return { income, expense, net: income - expense };
}

function exportCSV(rows) {
  const header = ['id','type','amount','category','date','shiftId','note'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const line = [r.id || '', r.type || '', r.amount ?? '', r.category || '', r.date || '', r.shiftId || '', (r.note || '').replace(/\n/g, ' ')].map(v => String(v).replace(/"/g, '""'));
    lines.push(line.join(','));
  }
  const csv = lines.join('\n');
  if (typeof window !== 'undefined' && window.document) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    console.log(csv);
  }
}

function exportJSON(obj) {
  const pretty = JSON.stringify(obj, null, 2);
  if (typeof window !== 'undefined' && window.document) {
    const blob = new Blob([pretty], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi_snapshot_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    console.log('KPI Snapshot JSON:\n', pretty);
  }
}

function ShiftPicker({ shiftId, setShiftId, options }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>Attach to Shift</Text>
      <Button label={shiftId ? `Selected: ${shiftId}` : 'Pick Shift'} variant="ghost" onPress={() => setOpen(true)} />
      {open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Shift</Text>
            <FlatList
              data={options.slice(0, 10)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setShiftId(item.id); setOpen(false); }} style={styles.modalRow}>
                  <Text style={styles.modalRowText}>
                    {item.venueName || item.venueId} • {new Date(item.start).toLocaleDateString()} • {new Date(item.start).toLocaleTimeString()}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button label="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

function ClientPicker({ clientId, setClientId, options = [] }) {
  const [open, setOpen] = useState(false);
  // Web fallback: load clients from localStorage or sample
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const raw = (typeof window !== 'undefined' && window.localStorage)
        ? (() => {
            try {
              const userRaw = window.localStorage.getItem('userData');
              const user = userRaw ? JSON.parse(userRaw) : null;
              const userId = user?.id || user?.email || null;
              const key = userId ? `clients_${userId}` : 'clients';
              return window.localStorage.getItem(key);
            } catch {
              return window.localStorage.getItem('clients');
            }
          })()
        : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setLocalClients(parsed);
      } else {
        setLocalClients(sampleClients || []);
      }
    } catch {}
  }, []);
  const [localClients, setLocalClients] = useState([]);
  const list = Platform.OS === 'web' ? localClients : options;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>Attach to Client</Text>
      <Button label={clientId ? `Selected: ${clientId}` : 'Pick Client'} variant="ghost" onPress={() => setOpen(true)} />
      {open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Client</Text>
            <FlatList
              data={(list || []).slice(0, 10)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setClientId(item.id); setOpen(false); }} style={styles.modalRow}>
                  <Text style={styles.modalRowText}>
                    {item.name} {item.valueScore != null ? `• Score ${item.valueScore}` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button label="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

function CategoryPicker({ label = 'Quick Category', category, setCategory, options = [] }) {
  const [open, setOpen] = useState(false);
  const list = (options || []).filter(Boolean).slice(0, 20);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>{label}</Text>
      <Button label={category ? `Selected: ${category}` : 'Pick Category'} variant="ghost" onPress={() => setOpen(true)} />
      {open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={list}
              keyExtractor={(item) => item}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setCategory(item); setOpen(false); }} style={styles.modalRow}>
                  <Text style={styles.modalRowText}>🔖 {item}</Text>
                </TouchableOpacity>
              )}
            />
            <Button label="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

function OutfitPicker({ outfitId, setOutfitId, options = [] }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  // Get unique outfit types for filtering
  const outfitTypes = useMemo(() => {
    const types = [...new Set(options.map(outfit => outfit.type).filter(Boolean))];
    return types.sort();
  }, [options]);

  // Filter outfits based on search and type filter
  const filteredOutfits = useMemo(() => {
    let filtered = options;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(outfit => 
        (outfit.name || '').toLowerCase().includes(query) ||
        (outfit.type || '').toLowerCase().includes(query) ||
        (outfit.description || '').toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(outfit => outfit.type === filterType);
    }
    
    return filtered;
  }, [options, searchQuery, filterType]);

  // Get selected outfit name for display
  const selectedOutfit = options.find(outfit => outfit.id === outfitId);
  const selectedLabel = selectedOutfit 
    ? `${selectedOutfit.name || 'Unnamed'} (${selectedOutfit.type || 'No Type'})`
    : 'Pick Outfit';

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setFilterType('');
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>Attach to Outfit</Text>
      <Button 
        label={outfitId ? `Selected: ${selectedLabel}` : 'Pick Outfit'} 
        variant="ghost" 
        onPress={() => setOpen(true)} 
      />
      {open && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Select Outfit</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#ccc" />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={{ marginBottom: 12 }}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search outfits..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Type Filter */}
            {outfitTypes.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 6 }}>Filter by Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setFilterType('')}
                    style={[
                      styles.filterChip,
                      !filterType && styles.filterChipActive
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      !filterType && styles.filterChipTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  {outfitTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFilterType(type)}
                      style={[
                        styles.filterChip,
                        filterType === type && styles.filterChipActive
                      ]}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filterType === type && styles.filterChipTextActive
                      ]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Results Count */}
            <Text style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
              {filteredOutfits.length} outfit{filteredOutfits.length !== 1 ? 's' : ''} found
            </Text>

            {/* Outfit List */}
            <FlatList
              data={filteredOutfits}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => { 
                    setOutfitId(item.id); 
                    handleClose(); 
                  }} 
                  style={[
                    styles.modalRow,
                    outfitId === item.id && styles.modalRowSelected
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.modalRowText,
                      outfitId === item.id && styles.modalRowTextSelected
                    ]}>
                      {item.name || 'Unnamed Outfit'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                      {item.type && (
                        <Text style={styles.outfitType}>{item.type}</Text>
                      )}
                      {item.wearCount > 0 && (
                        <Text style={styles.outfitWears}>
                          {item.wearCount} wear{item.wearCount !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    {item.description && (
                      <Text style={styles.outfitDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {outfitId === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#06d6a0" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666', textAlign: 'center' }}>
                    No outfits found matching your search
                  </Text>
                </View>
              )}
            />
            
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              {outfitId && (
                <Button 
                  label="Clear Selection" 
                  variant="ghost" 
                  onPress={() => { 
                    setOutfitId(null); 
                    handleClose(); 
                  }} 
                  style={{ flex: 1 }}
                />
              )}
              <Button 
                label="Close" 
                variant="ghost" 
                onPress={handleClose} 
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  heading: {
    color: '#f5f5f5',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  formBar: {
    marginBottom: 12,
  },
  form: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  // type toggle styles replaced by shared Segmented component
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalSheet: { backgroundColor: '#121212', borderRadius: 12, padding: 12, width: '90%', maxWidth: 480 },
  modalTitle: { color: '#f5f5f5', fontWeight: '700', fontSize: 16, marginBottom: 8 },
  modalRow: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10 },
  modalRowSelected: { backgroundColor: '#2a2a2a', borderColor: '#06d6a0', borderWidth: 1 },
  modalRowText: { color: '#eee' },
  modalRowTextSelected: { color: '#06d6a0', fontWeight: '600' },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#ffd166',
    borderColor: '#ffd166',
  },
  filterChipText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  outfitType: {
    color: '#ffd166',
    fontSize: 11,
    fontWeight: '500',
    backgroundColor: '#2a2a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outfitWears: {
    color: '#06d6a0',
    fontSize: 11,
    fontWeight: '500',
  },
  outfitDescription: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  quickForm: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ffd166',
  },
  quickFormTitle: {
    color: '#ffd166',
    fontSize: 18,
    fontWeight: '700',
  },
  quickFormLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  quickFormSelect: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickFormSelectText: {
    color: '#fff',
    fontSize: 14,
  },
  quickPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickPreset: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  quickPresetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickPresetCategory: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
  },
  quickTransactionRow: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickTransactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickTransactionCategory: {
    color: '#ccc',
    fontSize: 12,
  },
  quickAmountInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    width: 80,
    textAlign: 'center',
  },
  quickTotals: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  quickTotalText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  showFormBtn: { backgroundColor: '#333', color: '#ffd166', fontWeight: '700', textAlign: 'center', paddingVertical: 8, borderRadius: 8 },
  filters: { backgroundColor: '#121212', borderRadius: 12, padding: 12, gap: 8, marginBottom: 12 },
  filterLabel: { color: '#ccc', fontWeight: '700', fontSize: 12 },
  exportBtn: { backgroundColor: '#444', color: '#fff', fontWeight: '700', textAlign: 'center', paddingVertical: 8, borderRadius: 8 },
  error: { color: '#ff2d90', fontSize: 12, marginBottom: 6 },
  success: { color: '#06d6a0', fontSize: 12, marginBottom: 6 },
  card: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardValue: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '600',
  },
  row: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  amount: {
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 12,
  },
  separator: { height: 12 },
});

function getClientName(map, id) {
  const found = map.get(id);
  return found ? found.name : id;
}

function QuickTransactionForm({ onClose, onSuccess, venueOptions = [], clientOptions = [] }) {
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick transaction presets
  const quickPresets = [
    { type: 'income', category: 'VIP Dance', amount: 100 },
    { type: 'income', category: 'Lapdance', amount: 25 },
    { type: 'income', category: 'Stage Tips', amount: 20 },
    { type: 'income', category: 'Bottle', amount: 50 },
    { type: 'expense', category: 'House Fee', amount: 50 },
    { type: 'expense', category: 'DJ Tip', amount: 20 },
  ];

  const addTransaction = (preset) => {
    const newTx = {
      id: `temp_${Date.now()}_${Math.random()}`,
      ...preset,
      date: new Date().toISOString().slice(0, 10),
      venueId: selectedVenue?.id || null,
      clientId: selectedClient?.id || null,
      note: '',
    };
    setTransactions(prev => [...prev, newTx]);
  };

  const removeTransaction = (id) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const updateTransaction = (id, field, value) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id ? { ...tx, [field]: value } : tx
    ));
  };

  const handleSubmit = async () => {
    if (transactions.length === 0) {
      setError('Add at least one transaction');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const db = openDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Insert all transactions
      for (const tx of transactions) {
        const { id, ...txData } = tx; // Remove temp id
        await insertTransaction(db, txData);
      }

      onSuccess(transactions[transactions.length - 1]); // Pass last transaction for undo
    } catch (e) {
      console.warn('Quick transaction submit failed', e);
      setError(e.message || 'Failed to save transactions');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const netTotal = totalIncome - totalExpense;

  return (
    <View style={styles.quickForm}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={styles.quickFormTitle}>⚡ Quick Add Transactions</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Venue & Client Selection */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickFormLabel}>Venue (Optional)</Text>
          <TouchableOpacity 
            style={styles.quickFormSelect}
            onPress={() => {
              // Simple venue picker - could be enhanced with modal
              const venue = venueOptions[0]; // For demo, pick first
              setSelectedVenue(venue);
            }}
          >
            <Text style={styles.quickFormSelectText}>
              {selectedVenue ? selectedVenue.name : 'Select Venue'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickFormLabel}>Client (Optional)</Text>
          <TouchableOpacity 
            style={styles.quickFormSelect}
            onPress={() => {
              // Simple client picker - could be enhanced with modal
              const client = clientOptions[0]; // For demo, pick first
              setSelectedClient(client);
            }}
          >
            <Text style={styles.quickFormSelectText}>
              {selectedClient ? selectedClient.name : 'Select Client'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Presets */}
      <Text style={styles.quickFormLabel}>Quick Add</Text>
      <View style={styles.quickPresets}>
        {quickPresets.map((preset, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.quickPreset,
              { borderColor: preset.type === 'income' ? '#06d6a0' : '#ff2d90' }
            ]}
            onPress={() => addTransaction(preset)}
          >
            <Text style={[styles.quickPresetText, { color: preset.type === 'income' ? '#06d6a0' : '#ff2d90' }]}>
              {preset.type === 'income' ? '+' : '-'}${preset.amount}
            </Text>
            <Text style={styles.quickPresetCategory}>{preset.category}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction List */}
      {transactions.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.quickFormLabel}>Transactions ({transactions.length})</Text>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.quickTransactionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickTransactionAmount, { color: tx.type === 'income' ? '#06d6a0' : '#ff2d90' }]}>
                  {tx.type === 'income' ? '+' : '-'}${tx.amount}
                </Text>
                <Text style={styles.quickTransactionCategory}>{tx.category}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={styles.quickAmountInput}
                  value={String(tx.amount)}
                  onChangeText={(text) => updateTransaction(tx.id, 'amount', parseFloat(text) || 0)}
                  keyboardType="numeric"
                  placeholder="Amount"
                  placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={() => removeTransaction(tx.id)}>
                  <Ionicons name="trash-outline" size={16} color="#ff2d90" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.quickTotals}>
            <Text style={styles.quickTotalText}>Income: <Text style={{ color: '#06d6a0' }}>${totalIncome}</Text></Text>
            <Text style={styles.quickTotalText}>Expenses: <Text style={{ color: '#ff2d90' }}>${totalExpense}</Text></Text>
            <Text style={[styles.quickTotalText, { fontWeight: '700' }]}>Net: <Text style={{ color: netTotal >= 0 ? '#06d6a0' : '#ff2d90' }}>${netTotal}</Text></Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Button 
          label="Cancel" 
          variant="ghost" 
          onPress={onClose} 
          style={{ flex: 1 }}
        />
        <Button 
          label={loading ? 'Saving...' : `Save ${transactions.length} Transaction${transactions.length !== 1 ? 's' : ''}`}
          variant="primary" 
          onPress={handleSubmit}
          disabled={loading || transactions.length === 0}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}
