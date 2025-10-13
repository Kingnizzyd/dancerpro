import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clients as sampleClients, shifts as sampleShifts } from '../data/sampleData';
import { openDb, getAllClients, insertClient, updateClient, deleteClient, getKpiSnapshot, insertTransaction, getClientPerformance, getClientShifts } from '../lib/db';
import { Button, Input, Tag, Toast, Segmented } from '../components/UI';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';

export default function Clients({ route }) {
  const navigation = useNavigation();
  const [items, setItems] = useState(Platform.OS === 'web' ? sampleClients : []);
  // Performance state
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [perfRecentShifts, setPerfRecentShifts] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [snapshot, setSnapshot] = useState({ byClient: [] });
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [valueScore, setValueScore] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  
  // Transaction form state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState('income');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('VIP Dance');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionNote, setTransactionNote] = useState('');

  useEffect(() => {
    const db = openDb();
    if (!db) return; // web fallback uses sample data
    (async () => {
      try {
        const rows = await getAllClients(db);
        setItems(rows);
      } catch (e) {
        console.warn('Clients DB load failed, using sample data', e);
      }
    })();
  }, []);

  // Load KPI snapshot to show client net totals (web/native)
  useEffect(() => {
    (async () => {
      try {
        const db = openDb();
        const s = await getKpiSnapshot(db);
        setSnapshot(s || { byClient: [] });
      } catch (e) {
        console.warn('Clients KPI snapshot load failed', e);
      }
    })();
  }, []);

  // Load persisted clients on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('clients');
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setItems(saved);
        } catch {}
      }
    }
  }, []);

  // Open detail when navigated with clientId or web-persisted id
  useEffect(() => {
    const clientIdParam = route?.params?.clientId;
    let clientId = clientIdParam;
    if (!clientId && typeof window !== 'undefined' && window.localStorage) {
      try { clientId = window.localStorage.getItem('clientDetailId') || clientId; } catch {}
    }
    if (!clientId) return;
    const found = (items || []).find(c => c.id === clientId);
    if (found) {
      openDetail(found);
    }
  }, [items, route?.params?.clientId]);

  function resetForm() {
    setEditId(null);
    setName('');
    setContact('');
    setValueScore('');
    setTagsStr('');
    setNotes('');
  }

  async function handleSave() {
    const db = openDb();
    const score = Number(valueScore || 0);
    if (!name.trim()) {
      setToast({ message: 'Name is required', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    if (isNaN(score) || score < 0) {
      setToast({ message: 'Value score must be a non-negative number', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    try {
      if (db) {
        if (editId) {
          await updateClient(db, { id: editId, name, contact, valueScore: score, tags, notes });
        } else {
          await insertClient(db, { name, contact, valueScore: score, tags, notes });
        }
        const rows = await getAllClients(db);
        setItems(rows);
      } else {
        if (editId) {
          const next = items.map(c => c.id === editId ? { ...c, name, contact, valueScore: score, tags, notes } : c);
          setItems(next);
          try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
        } else {
          const id = `c_${Date.now()}`;
          const next = [{ id, name, contact, valueScore: score, tags, notes }, ...items];
          setItems(next);
          try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
        }
      }
      resetForm();
      setAddOpen(false);
      setToast({ message: editId ? 'Client updated' : 'Client added', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Save client failed', e);
      setToast({ message: 'Failed to save client', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  async function handleDelete(id) {
    const db = openDb();
    try {
      if (db) {
        await deleteClient(db, id);
        const rows = await getAllClients(db);
        setItems(rows);
      } else {
        const next = items.filter(c => c.id !== id);
        setItems(next);
        try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
      }
      setToast({ message: 'Client deleted', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Delete client failed', e);
      setToast({ message: 'Failed to delete client', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  function openEdit(c) {
    setEditId(c.id);
    setName(c.name || '');
    setContact(c.contact || '');
    setValueScore(String(c.valueScore ?? ''));
    setTagsStr((c.tags || []).join(', '));
    setNotes(c.notes || '');
    setAddOpen(true);
    // Reset transaction form
    setShowTransactionForm(false);
    setTransactionType('income');
    setTransactionAmount('');
    setTransactionCategory('VIP Dance');
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setTransactionNote('');
  }

  async function handleAddTransaction() {
    const db = openDb();
    const amount = parseFloat(transactionAmount);
    
    if (!transactionAmount || isNaN(amount) || amount <= 0) {
      setToast({ message: 'Please enter a valid amount', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    
    if (!transactionCategory.trim()) {
      setToast({ message: 'Category is required', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }
    
    const transactionData = {
      type: transactionType,
      amount: amount,
      category: transactionCategory.trim(),
      date: transactionDate,
      note: transactionNote.trim(),
      clientId: editId, // Link to current client being edited
      shiftId: null,
      outfitId: null
    };
    
    try {
      if (db) {
        await insertTransaction(db, transactionData);
      } else {
        // Web fallback - could store in localStorage if needed
        console.log('Transaction would be saved:', transactionData);
      }
      
      // Reset transaction form
      setTransactionAmount('');
      setTransactionCategory(transactionType === 'income' ? 'VIP Dance' : 'House Fee');
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setTransactionNote('');
      setShowTransactionForm(false);
      
      setToast({ 
        message: `${transactionType === 'income' ? 'Income' : 'Expense'} of $${amount.toFixed(2)} added for ${name}`, 
        type: 'success', 
        visible: true 
      });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 3000);
    } catch (e) {
      console.warn('Add transaction failed', e);
      setToast({ message: 'Failed to add transaction', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  function openDetail(c) {
    setDetail(c);
    setDetailOpen(true);
  }

  async function loadPerformance(clientId, days = 90) {
    try {
      const db = openDb();
      if (db) {
        const perf = await getClientPerformance(db, clientId, days);
        setPerfData(perf);
        const recent = await getClientShifts(db, clientId, days);
        setPerfRecentShifts((recent || []).slice(0, 10));
      } else {
        // Web fallback using sample shifts
        const filtered = (sampleShifts || []).filter(s => s.clientId === clientId);
        const total = filtered.reduce((sum, s) => sum + (s.earnings || 0), 0);
        const dowMap = new Map();
        filtered.forEach(s => {
          const d = new Date(s.start);
          const key = d.getDay();
          const prev = dowMap.get(key) || { total: 0, count: 0 };
          prev.total += (s.earnings || 0);
          prev.count += 1;
          dowMap.set(key, prev);
        });
        let bestDay = null, bestAvg = 0;
        for (const [day, { total: t, count: c }] of dowMap.entries()) {
          const avg = c ? t / c : 0;
          if (avg > bestAvg) { bestAvg = avg; bestDay = day; }
        }
        const history = filtered
          .sort((a,b) => new Date(a.start) - new Date(b.start))
          .map(s => ({ label: (s.start || '').slice(5,10) || '—', value: s.earnings || 0 }));
        setPerfData({ clientId, days, shiftCount: filtered.length, totalEarnings: total, avgEarnings: filtered.length ? total/filtered.length : 0, bestDay, bestDayAvg: bestAvg, earningsHistory: history });
        setPerfRecentShifts(filtered.sort((a,b)=> new Date(b.start) - new Date(a.start)).slice(0,10));
      }
    } catch (e) {
      console.warn('Failed loading client performance', e);
      setPerfData(null);
      setPerfRecentShifts([]);
    }
  }

  function togglePerformance(clientId) {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setPerfData(null);
      setPerfRecentShifts([]);
      return;
    }
    setExpandedClientId(clientId);
    loadPerformance(clientId);
  }

  function setPreferredClientFilter(clientId) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('analyticsPreferredClient', clientId);
      }
      setToast({ message: 'Analytics filter set to this client', type: 'success', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (e) {
      console.warn('Failed to set preferred client filter', e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Clients & Messaging</Text>
      <View style={{ marginBottom: 12 }}>
        <Button label="Add Client" variant="primary" onPress={() => { resetForm(); setAddOpen(true); }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <ClientRow 
            item={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
            onView={() => openDetail(item)}
            onPerformance={() => togglePerformance(item.id)}
            expanded={expandedClientId === item.id}
            perfData={perfData}
            perfRecentShifts={perfRecentShifts}
            onSetAnalyticsFilter={() => setPreferredClientFilter(item.id)}
          />
        )}
      />
      {addOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Client' : 'Add Client'}</Text>
              <Input placeholder="Name" value={name} onChangeText={setName} />
              <Input placeholder="Contact" value={contact} onChangeText={setContact} />
              <Input placeholder="Value score e.g. 8" value={valueScore} onChangeText={setValueScore} keyboardType="numeric" />
              <Input placeholder="Tags comma-separated" value={tagsStr} onChangeText={setTagsStr} />
              <Input placeholder="Notes" value={notes} onChangeText={setNotes} />
              
              {editId && (
                <View style={styles.transactionSection}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.sectionTitle}>Add Transaction</Text>
                    <TouchableOpacity 
                      style={styles.toggleButton}
                      onPress={() => setShowTransactionForm(!showTransactionForm)}
                    >
                      <Ionicons 
                        name={showTransactionForm ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#ffd166" 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {showTransactionForm && (
                    <View style={styles.transactionForm}>
                      <View style={styles.segmentedContainer}>
                        <Segmented
                          options={[
                            { label: 'Income', value: 'income' },
                            { label: 'Expense', value: 'expense' }
                          ]}
                          value={transactionType}
                          onChange={setTransactionType}
                        />
                      </View>
                      
                      <Input 
                        placeholder="Amount" 
                        value={transactionAmount} 
                        onChangeText={setTransactionAmount} 
                        keyboardType="numeric" 
                      />
                      
                      <Input 
                        placeholder={transactionType === 'income' ? 'Category (e.g. VIP Dance)' : 'Category (e.g. House Fee)'} 
                        value={transactionCategory} 
                        onChangeText={setTransactionCategory} 
                      />
                      
                      <Input 
                        placeholder="Date (YYYY-MM-DD)" 
                        value={transactionDate} 
                        onChangeText={setTransactionDate} 
                      />
                      
                      <Input 
                        placeholder="Note (optional)" 
                        value={transactionNote} 
                        onChangeText={setTransactionNote} 
                      />
                      
                      <Button 
                        label={`Add ${transactionType === 'income' ? 'Income' : 'Expense'}`} 
                        variant="secondary" 
                        onPress={handleAddTransaction} 
                      />
                    </View>
                  )}
                </View>
              )}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <Button label="Cancel" variant="ghost" onPress={() => { setAddOpen(false); resetForm(); }} />
                <Button label={editId ? 'Save' : 'Add'} variant="primary" onPress={handleSave} />
              </View>
            </ScrollView>
          </View>
        </View>
      )}
      {detailOpen && detail && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Client Details</Text>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {Platform.OS !== 'web' ? <Ionicons name="person-circle-outline" size={16} color="#ffd166" /> : null}
                <Text style={styles.name}>{detail.name}</Text>
                {typeof detail.valueScore !== 'undefined' && detail.valueScore !== null ? (
                  <Tag text={`Score ${detail.valueScore}`} backgroundColor="#222" color="#ccc" />
                ) : null}
              </View>
              <Text style={styles.contact}>{detail.contact || '—'}</Text>
              {Array.isArray(detail.tags) && detail.tags.length ? (
                <Text style={styles.tags}>Tags: {detail.tags.join(', ')}</Text>
              ) : null}
              <Text style={styles.notes}>{detail.notes || ''}</Text>
              {(function() {
                try {
                  const row = (snapshot?.byClient || []).find(r => r.clientId === detail.id);
                  if (!row) return null;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Tag text={`Net ${formatCurrency(row.net)}`} backgroundColor="#222" color="#ffd166" />
                <Tag text={`Income ${formatCurrency(row.income || 0)}`} backgroundColor="#222" color="#06d6a0" />
                <Tag text={`Expense ${formatCurrency(row.expense || 0)}`} backgroundColor="#222" color="#ff2d90" />
                    </View>
                  );
                } catch { return null; }
              })()}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Button label="Close" variant="ghost" onPress={() => { setDetailOpen(false); setDetail(null); }} />
              <Button label="Edit" variant="primary" onPress={() => { setDetailOpen(false); openEdit(detail); }} />
              <Button label="View Shifts" variant="ghost" onPress={() => {
                if (!detail?.id) return;
                if (typeof window !== 'undefined' && window.localStorage) {
                  try { window.localStorage.setItem('clientFilterId', detail.id); } catch {}
                }
                try { navigation.navigate('Shifts', { clientId: detail.id }); } catch {}
              }} />
            </View>
          </View>
        </View>
      )}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </View>
  );
}



function ClientRow({ item, onEdit, onDelete, onView, onPerformance, expanded, perfData, perfRecentShifts, onSetAnalyticsFilter }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);
  const tags = item.tags || [];
  return (
    <Animated.View style={[styles.row, { opacity: fade }]}> 
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Platform.OS !== 'web' ? <Ionicons name="person-outline" size={14} color="#ffd166" /> : null}
          <Text style={styles.name}>{item.name}</Text>
          {typeof item.valueScore !== 'undefined' && item.valueScore !== null ? (
            <Tag text={`Score ${item.valueScore}`} backgroundColor="#222" color="#ccc" />
          ) : null}
        </View>
        <Text style={styles.contact}>{item.contact}</Text>
        {tags.length ? (
          <Text style={styles.tags}>Tags: {tags.join(', ')}</Text>
        ) : null}
        <Text style={styles.notes}>{item.notes}</Text>
        <View style={styles.performanceActionsRow}>
          <Button label={expanded ? 'Hide Performance' : 'Performance'} variant="secondary" onPress={onPerformance} />
          <Button label="Filter in Analytics" variant="ghost" onPress={onSetAnalyticsFilter} />
        </View>
        {expanded && (
          <View style={styles.performanceContainer}>
            {perfData ? (
              <View style={styles.performanceMetricsRow}>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>Shifts</Text><Text style={styles.metricValue}>{perfData.shiftCount || 0}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>Total</Text><Text style={styles.metricValue}>{formatCurrency(perfData.totalEarnings || 0)}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>Avg/Shift</Text><Text style={styles.metricValue}>{formatCurrency(perfData.avgEarnings || 0)}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricLabel}>Best Day</Text><Text style={styles.metricValue}>{typeof perfData.bestDay === 'number' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][perfData.bestDay] : '—'}</Text></View>
              </View>
            ) : (
              <Text style={{ color: '#999', fontSize: 12 }}>No performance data</Text>
            )}
            {Array.isArray(perfData?.earningsHistory) && perfData.earningsHistory.length ? (
              <View style={styles.historyRow}>
                {perfData.earningsHistory.slice(0, 12).map((h, idx) => (
                  <View key={idx} style={styles.historyBar}>
                    <View style={[styles.historyFill, { height: Math.min(48, Math.max(4, (h.value || 0) / (perfData.avgEarnings || 1) * 12)) }]} />
                    <Text style={styles.historyLabel}>{h.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {Array.isArray(perfRecentShifts) && perfRecentShifts.length ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionTitle}>Recent Shifts</Text>
                {perfRecentShifts.map((s) => (
                  <View key={s.id || `${s.start}-${s.venueId}`} style={styles.shiftRow}>
                    <Text style={styles.shiftText}>{(s.start || '').slice(0,16).replace('T',' ')}</Text>
                    <Text style={styles.shiftText}>{formatCurrency(s.earnings || 0)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Button label="View" variant="ghost" onPress={onView} />
        <Button label="Edit" variant="ghost" onPress={onEdit} />
        <Button label="Delete" variant="ghost" onPress={onDelete} />
      </View>
    </Animated.View>
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
  name: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '600',
  },
  contact: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  tags: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  notes: {
    color: '#999',
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
    maxHeight: '80%',
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
  transactionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '600',
  },
  performanceActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  performanceContainer: { backgroundColor: '#0f0f0f', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#222' },
  performanceMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  metricBox: { backgroundColor: '#151515', borderRadius: 6, padding: 8, flex: 1, alignItems: 'center' },
  metricLabel: { color: '#aaa', fontSize: 11 },
  metricValue: { color: '#eee', fontSize: 14, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 },
  historyBar: { alignItems: 'center' },
  historyFill: { width: 10, backgroundColor: '#ffd166', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  historyLabel: { color: '#777', fontSize: 10, marginTop: 2 },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#222' },
  shiftText: { color: '#ccc', fontSize: 12 },
  toggleButton: {
    padding: 4,
  },
  transactionForm: {
    gap: 12,
  },
  segmentedContainer: {
    marginBottom: 8,
  },
});