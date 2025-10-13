import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shifts as sampleShifts, venues as sampleVenues, clients as sampleClients, getVenueById } from '../data/sampleData';
import { openDb, getShiftsWithVenues, getShiftTransactionTotals, getAllVenues, getAllClients, insertShift, updateShift, deleteShift } from '../lib/db';
import { Tag, Button, Input, Toast, Segmented } from '../components/UI';

function exportShiftsCSV(rows) {
  const header = ['id','start','end','venueId','venueName','earnings','notes'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const line = [
      r.id || '',
      r.start || '',
      r.end || '',
      r.venueId || '',
      r.venueName || '',
      r.earnings ?? '',
      (r.notes || '').replace(/\n/g, ' '),
    ].map(v => String(v).replace(/"/g, '""'));
    lines.push(line.join(','));
  }
  const csv = lines.join('\n');
  if (typeof window !== 'undefined' && window.document) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shifts_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    console.log(csv);
  }
}

export default function Shifts({ route }) {
  const [items, setItems] = useState(Platform.OS === 'web' ? sampleShifts : []);
  const [totalsByShift, setTotalsByShift] = useState(new Map());
  const [venues, setVenues] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [venueId, setVenueId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientFilterId, setClientFilterId] = useState('');
  const [days, setDays] = useState(7);
  const [sortByNet, setSortByNet] = useState(false);
  const [earnings, setEarnings] = useState('');
  const [notes, setNotes] = useState('');
  const [startStr, setStartStr] = useState(new Date().toISOString());
  const [endStr, setEndStr] = useState(new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString());
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  const [clientOptions, setClientOptions] = useState([]);
  const clientsById = useMemo(() => {
    const map = new Map();
    (clientOptions || []).forEach(c => map.set(c.id, c));
    return map;
  }, [clientOptions]);

  useEffect(() => {
    const db = openDb();
    if (!db) return; // web fallback uses sample data
    (async () => {
      try {
        const rows = await getShiftsWithVenues(db);
        setItems(rows);
        const map = await getShiftTransactionTotals(db);
        setTotalsByShift(map);
      } catch (e) {
        console.warn('Shifts DB load failed, using sample data', e);
      }
    })();
  }, []);

  // Load persisted shifts on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('shifts');
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setItems(saved);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    const db = openDb();
    if (db) {
      (async () => {
        try {
          const vs = await getAllVenues(db);
          setVenues(vs);
        } catch (e) {
          console.warn('Load venues failed', e);
          setVenues(sampleVenues);
        }
      })();
    } else {
      setVenues(sampleVenues);
    }
  }, []);

  // Load clients for picker (native DB or web fallback)
  useEffect(() => {
    const db = openDb();
    if (db) {
      (async () => {
        try {
          const cs = await getAllClients(db);
          setClientOptions(cs);
        } catch (e) {
          console.warn('Load clients failed', e);
          setClientOptions(sampleClients || []);
        }
      })();
    } else {
      try {
        const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('clients') : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setClientOptions(parsed);
          else setClientOptions(sampleClients || []);
        } else {
          setClientOptions(sampleClients || []);
        }
      } catch {
        setClientOptions(sampleClients || []);
      }
    }
  }, []);

  // Accept client filter from navigation params (native) or persisted web state
  useEffect(() => {
    const fromParams = route && route.params && route.params.clientId ? route.params.clientId : '';
    if (fromParams) setClientFilterId(fromParams);
    if (!fromParams && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('clientFilterId');
        if (saved) setClientFilterId(saved);
      } catch {}
    }
  }, [route]);

  // Persist and load client filter on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('clientFilterId');
        if (saved) setClientFilterId(saved);
        const savedSort = window.localStorage.getItem('sortByNet');
        if (savedSort) setSortByNet(savedSort === 'true');
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('clientFilterId', clientFilterId || ''); } catch {}
    }
  }, [clientFilterId]);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('sortByNet', String(!!sortByNet)); } catch {}
    }
  }, [sortByNet]);

  // Persist selected range (web) and restore on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('shiftsDays');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed === 7 || parsed === 30 || parsed === 90) setDays(parsed);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('shiftsDays', JSON.stringify(days)); } catch {}
    }
  }, [days]);

  function validIso(s) {
    return s && !isNaN(Date.parse(s));
  }

  function applyClientFilter(list) {
    if (!clientFilterId) return list;
    return list.filter(s => s.clientId === clientFilterId);
  }

  function applySort(list) {
    if (!sortByNet) return list;
    const arr = [...list];
    arr.sort((a, b) => {
      const aNet = (totalsByShift.get(a.id)?.net || 0);
      const bNet = (totalsByShift.get(b.id)?.net || 0);
      return bNet - aNet;
    });
    return arr;
  }

  function applyDays(list) {
    const d = days;
    if (!d || typeof d !== 'number') return list;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - d);
    return list.filter(s => {
      const start = new Date(s.start);
      return start >= cutoff;
    });
  }

  async function handleEditShift() {
    if (!editingShift) return;
    
    const db = openDb();
    const vId = venueId || editingShift.venueId;
    const cId = clientId || editingShift.clientId;
    const eVal = Number(earnings || editingShift.earnings);
    const nVal = notes !== '' ? notes : editingShift.notes;
    const start = validIso(startStr) ? new Date(startStr).toISOString() : editingShift.start;
    const end = validIso(endStr) ? new Date(endStr).toISOString() : editingShift.end;
    
    // validations
    if (!vId) {
      setToast({ message: 'Select a venue', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (!validIso(startStr) || !validIso(endStr)) {
      setToast({ message: 'Enter valid ISO start/end times', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (new Date(end) <= new Date(start)) {
      setToast({ message: 'End time must be after start', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (isNaN(eVal) || eVal < 0) {
      setToast({ message: 'Earnings must be a non-negative number', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    
    try {
      if (db) {
        await updateShift(db, editingShift.id, { 
          venueId: vId, 
          clientId: cId, 
          start, 
          end, 
          earnings: eVal, 
          notes: nVal 
        });
        const rows = await getShiftsWithVenues(db);
        setItems(rows);
        const map = await getShiftTransactionTotals(db);
        setTotalsByShift(map);
      } else {
        const updatedShift = { 
          ...editingShift, 
          venueId: vId, 
          clientId: cId, 
          start, 
          end, 
          earnings: eVal, 
          notes: nVal 
        };
        const venue = getVenueById(vId);
        const nextList = items.map(item => 
          item.id === editingShift.id 
            ? { ...updatedShift, venueName: venue?.name }
            : item
        );
        setItems(nextList);
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.setItem('shifts', JSON.stringify(nextList)); } catch {}
        }
      }
      
      setEditOpen(false);
      setEditingShift(null);
      setVenueId('');
      setClientId('');
      setEarnings('');
      setNotes('');
      setStartStr(new Date().toISOString());
      setEndStr(new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString());
      setToast({ message: 'Shift updated', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Update shift failed', e);
      setToast({ message: 'Failed to update shift', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  function handleOpenEdit(shift) {
    setEditingShift(shift);
    setVenueId(shift.venueId || '');
    setClientId(shift.clientId || '');
    setEarnings(shift.earnings?.toString() || '');
    setNotes(shift.notes || '');
    setStartStr(shift.start || new Date().toISOString());
    setEndStr(shift.end || new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString());
    setEditOpen(true);
  }

  async function handleAddShift() {
    const db = openDb();
    const vId = venueId || (venues[0]?.id || '');
    const cId = clientId || null;
    const eVal = Number(earnings || 0);
    const nVal = notes || '';
    const start = validIso(startStr) ? new Date(startStr).toISOString() : '';
    const end = validIso(endStr) ? new Date(endStr).toISOString() : '';
    // validations
    if (!vId) {
      setToast({ message: 'Select a venue', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (!validIso(startStr) || !validIso(endStr)) {
      setToast({ message: 'Enter valid ISO start/end times', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (new Date(end) <= new Date(start)) {
      setToast({ message: 'End time must be after start', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (isNaN(eVal) || eVal < 0) {
      setToast({ message: 'Earnings must be a non-negative number', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    try {
      if (db) {
        await insertShift(db, { venueId: vId, clientId: cId, start, end, earnings: eVal, notes: nVal });
        const rows = await getShiftsWithVenues(db);
        setItems(rows);
        const map = await getShiftTransactionTotals(db);
        setTotalsByShift(map);
      } else {
        const newItem = { id: `s_${Date.now()}`, start, end, venueId: vId, clientId: cId, earnings: eVal, notes: nVal };
        const venue = getVenueById(vId);
        const nextList = [{ ...newItem, venueName: venue?.name }, ...items];
        setItems(nextList);
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.setItem('shifts', JSON.stringify(nextList)); } catch {}
        }
      }
      setAddOpen(false);
      setVenueId('');
      setClientId('');
      setEarnings('');
      setNotes('');
      setStartStr(new Date().toISOString());
      setEndStr(new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString());
      setToast({ message: 'Shift added', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Add shift failed', e);
      setToast({ message: 'Failed to add shift', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  async function handleDeleteShift(id) {
    const db = openDb();
    try {
      if (db) {
        await deleteShift(db, id);
        const rows = await getShiftsWithVenues(db);
        setItems(rows);
        const map = await getShiftTransactionTotals(db);
        setTotalsByShift(map);
      } else {
        const next = items.filter(s => s.id !== id);
        setItems(next);
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.setItem('shifts', JSON.stringify(next)); } catch {}
        }
      }
      setToast({ message: 'Shift deleted', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Delete shift failed', e);
      setToast({ message: 'Failed to delete shift', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Shifts & Venues</Text>
      <Segmented
        options={[
          { label: '7d', value: 7 },
          { label: '30d', value: 30 },
          { label: '90d', value: 90 },
        ]}
        value={days}
        onChange={setDays}
      />
      {clientFilterId ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Tag
            text={`Client: ${clientsById.get(clientFilterId)?.name || clientFilterId}`}
            backgroundColor="#222"
            color="#ccc"
          />
          <Button
            label="Clear"
            variant="ghost"
            onPress={() => setClientFilterId('')}
          />
        </View>
      ) : null}
      <View style={{ marginBottom: 12 }}>
        <Button label="Add Shift" variant="primary" onPress={() => setAddOpen(true)} />
        <View style={{ height: 8 }} />
        <Button label="Export CSV" variant="ghost" onPress={() => exportShiftsCSV(items)} />
        <View style={{ height: 8 }} />
        <View style={{ gap: 6 }}>
          <ClientPicker label="Filter by Client" clientId={clientFilterId} setClientId={setClientFilterId} options={clientOptions} />
          {clientFilterId ? (
            <Button label="Clear Filter" variant="ghost" onPress={() => setClientFilterId('')} />
          ) : null}
          <Button label={sortByNet ? 'Sorted by Net (desc)' : 'Sort by Net'} variant={sortByNet ? 'primary' : 'ghost'} onPress={() => setSortByNet(!sortByNet)} />
        </View>
      </View>
      <FlatList
        data={applySort(applyClientFilter(applyDays(items)))}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ShiftRow
            item={{ ...item, shiftTotals: totalsByShift.get(item.id) }}
            clientsById={clientsById}
            onDelete={() => handleDeleteShift(item.id)}
            onEdit={() => handleOpenEdit(item)}
          />
        )}
      />
      {addOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Shift</Text>
            <Text style={{ color: '#ccc', fontSize: 12 }}>Venue</Text>
            <FlatList
              data={venues.slice(0, 8)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Button
                  label={item.name}
                  variant={venueId === item.id ? 'primary' : 'ghost'}
                  onPress={() => setVenueId(item.id)}
                />
              )}
            />
            <Input placeholder="Start time (ISO)" value={startStr} onChangeText={setStartStr} />
            <Input placeholder="End time (ISO)" value={endStr} onChangeText={setEndStr} />
            <Input placeholder="Earnings e.g. 600" value={earnings} onChangeText={setEarnings} keyboardType="numeric" />
            <Input placeholder="Notes" value={notes} onChangeText={setNotes} />
            <ClientPicker clientId={clientId} setClientId={setClientId} options={clientOptions} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setAddOpen(false)} />
              <Button label="Add" variant="primary" onPress={handleAddShift} />
            </View>
          </View>
        </View>
      )}
      {editOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Shift</Text>
            <Text style={{ color: '#ccc', fontSize: 12 }}>Venue</Text>
            <FlatList
              data={venues.slice(0, 8)}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Button
                  label={item.name}
                  variant={venueId === item.id ? 'primary' : 'ghost'}
                  onPress={() => setVenueId(item.id)}
                />
              )}
            />
            <Input placeholder="Start time (ISO)" value={startStr} onChangeText={setStartStr} />
            <Input placeholder="End time (ISO)" value={endStr} onChangeText={setEndStr} />
            <Input placeholder="Earnings e.g. 600" value={earnings} onChangeText={setEarnings} keyboardType="numeric" />
            <Input placeholder="Notes" value={notes} onChangeText={setNotes} />
            <ClientPicker clientId={clientId} setClientId={setClientId} options={clientOptions} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Button label="Cancel" variant="ghost" onPress={() => {
                setEditOpen(false);
                setEditingShift(null);
                setVenueId('');
                setClientId('');
                setEarnings('');
                setNotes('');
                setStartStr(new Date().toISOString());
                setEndStr(new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString());
              }} />
              <Button label="Update" variant="primary" onPress={handleEditShift} />
            </View>
          </View>
        </View>
      )}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </View>
  );
}

function ShiftRow({ item, onDelete, onEdit, clientsById }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);
  const venue = item.venueName ? { name: item.venueName } : getVenueById(item.venueId);
  const start = new Date(item.start);
  const end = new Date(item.end);
  const range = `${start.toLocaleString()} → ${end.toLocaleTimeString()}`;
  const totals = item.shiftTotals || null; // placeholder; will fill below
  const client = item.clientId ? (clientsById ? clientsById.get(item.clientId) : null) : null;

  return (
    <Animated.View style={[styles.row, { opacity: fade }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.venue}>{venue?.name || '—'}</Text>
          <Tag text={new Date(item.start).toLocaleDateString()} backgroundColor="#222" color="#ccc" />
          {client ? <Tag text={client.name} backgroundColor="#222" color="#ccc" /> : null}
        </View>
        <Text style={styles.range}>{range}</Text>
        <Text style={styles.notes}>{item.notes}</Text>
        {totals ? (
          <Text style={styles.txNet}>Tx Net: ${totals.net} (Income ${totals.income} • Expense ${totals.expense})</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Platform.OS !== 'web' ? <Ionicons name="cash-outline" size={14} color="#06d6a0" /> : null}
        <Text style={styles.earnings}>${item.earnings}</Text>
        <Button label="Edit" variant="ghost" onPress={onEdit} />
        <Button label="Delete" variant="ghost" onPress={onDelete} />
      </View>
    </Animated.View>
  );
}

function ClientPicker({ clientId, setClientId, options = [], label = 'Attach to Client' }) {
  const [open, setOpen] = useState(false);
  const list = options || [];
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>{label}</Text>
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
                <Button
                  label={item.name}
                  variant={clientId === item.id ? 'primary' : 'ghost'}
                  onPress={() => { setClientId(item.id); setOpen(false); }}
                />
              )}
            />
            <Button label="Close" variant="ghost" onPress={() => setOpen(false)} />
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
  row: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  venue: {
    color: '#ff2d90',
    fontSize: 16,
    fontWeight: '600',
  },
  range: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  notes: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  earnings: {
    color: '#06d6a0',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 12,
  },
  txNet: {
    color: '#ffd166',
    fontSize: 12,
    marginTop: 6,
  },
  separator: { height: 12 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheet: {
    width: '90%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
});