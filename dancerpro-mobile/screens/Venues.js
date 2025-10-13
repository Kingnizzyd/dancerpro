import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { venues as sampleVenues } from '../data/sampleData';
import { openDb, getAllVenues, insertVenue, updateVenue, deleteVenue, insertTransaction, getAllClients, getVenuePerformance, getVenueShifts } from '../lib/db';
import { Button, Input, Tag, Toast } from '../components/UI';

export default function Venues() {
  const [items, setItems] = useState(Platform.OS === 'web' ? sampleVenues : []);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [avgEarnings, setAvgEarnings] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  
  // Quick transaction entry state
  const [showQuickTransaction, setShowQuickTransaction] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [transactionType, setTransactionType] = useState('income');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('VIP Dance');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionNote, setTransactionNote] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Venue performance state
  const [perfForId, setPerfForId] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [perfRecentShifts, setPerfRecentShifts] = useState([]);

  useEffect(() => {
    loadVenues();
    loadClients();
  }, []);

  // Load persisted venues on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('venues');
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setItems(saved);
        } catch {}
      }
    }
  }, []);

  async function loadVenues() {
    const db = openDb();
    if (!db) return; // web fallback uses sample data
    try {
      const rows = await getAllVenues(db);
      setItems(rows);
    } catch (e) {
      console.warn('Venues DB load failed, using sample data', e);
    }
  }

  async function loadClients() {
    const db = openDb();
    if (!db) {
      // Web fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('clients');
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (Array.isArray(saved)) setClientOptions(saved);
          } catch {}
        }
      }
      return;
    }
    try {
      const rows = await getAllClients(db);
      setClientOptions(rows);
    } catch (e) {
      console.warn('Clients DB load failed', e);
    }
  }

  async function loadPerformance(venueId) {
    if (perfForId === venueId && perfData) {
      // toggle off
      setPerfForId(null);
      setPerfData(null);
      setPerfRecentShifts([]);
      return;
    }
    setPerfForId(venueId);
    setPerfLoading(true);
    try {
      const db = openDb();
      if (db) {
        const perf = await getVenuePerformance(db, venueId, 120);
        const recent = await getVenueShifts(db, venueId, 120, 10);
        setPerfData(perf);
        setPerfRecentShifts(recent);
      } else {
        // Web fallback using localStorage or sample data
        const rawShifts = JSON.parse(localStorage.getItem('shifts') || '[]');
        const allShifts = Array.isArray(rawShifts) && rawShifts.length ? rawShifts : (
          (typeof window !== 'undefined') ? (window.sampleShifts || []) : []
        );
        const filtered = allShifts.filter(s => s.venueId === venueId);
        let total = 0;
        const byDow = new Map();
        const daily = new Map();
        filtered.forEach(s => {
          const earn = Number(s.earnings || 0);
          total += earn;
          const d = new Date(s.start);
          const dow = d.getDay();
          const key = d.toISOString().slice(0,10);
          const list = byDow.get(dow) || [];
          list.push(earn);
          byDow.set(dow, list);
          daily.set(key, (daily.get(key) || 0) + earn);
        });
        let bestDay = null;
        let bestAvg = 0;
        byDow.forEach((list, dow) => {
          const avg = list.length ? list.reduce((a,b)=>a+b,0)/list.length : 0;
          if (avg > bestAvg) { bestAvg = avg; bestDay = dow; }
        });
        const history = Array.from(daily.entries()).map(([date, earnings]) => ({ date, earnings }))
          .sort((a,b)=> new Date(a.date) - new Date(b.date));
        setPerfData({ venueId, days: 120, shiftCount: filtered.length, totalEarnings: total, avgEarnings: filtered.length ? total/filtered.length : 0, bestDay, bestDayAvg: bestAvg, earningsHistory: history });
        setPerfRecentShifts(filtered.sort((a,b)=> new Date(b.start) - new Date(a.start)).slice(0,10));
      }
    } catch (e) {
      console.warn('Load performance failed', e);
      setToast({ message: 'Failed to load performance', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } finally {
      setPerfLoading(false);
    }
  }

  function setPreferredVenueFilter(venueId) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('analyticsPreferredVenue', venueId);
        setToast({ message: 'Analytics filter set to this venue', type: 'success', visible: true });
        setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      }
    } catch {}
  }

  function resetForm() {
    setEditId(null);
    setName('');
    setLocation('');
    setAvgEarnings('');
  }

  function resetTransactionForm() {
    setTransactionAmount('');
    setTransactionCategory(transactionType === 'income' ? 'VIP Dance' : 'House Fee');
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setTransactionNote('');
    setSelectedClientId(null);
    setSelectedVenueId(null);
    setShowQuickTransaction(false);
  }

  function openQuickTransaction(venueId) {
    setSelectedVenueId(venueId);
    setTransactionCategory(transactionType === 'income' ? 'VIP Dance' : 'House Fee');
    setShowQuickTransaction(true);
  }

  async function handleQuickTransaction() {
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
    
    const venue = items.find(v => v.id === selectedVenueId);
    const transactionData = {
      type: transactionType,
      amount: amount,
      category: transactionCategory.trim(),
      date: transactionDate,
      note: transactionNote.trim() + (venue ? ` (Venue: ${venue.name})` : ''),
      venueId: selectedVenueId || null,
      clientId: selectedClientId || null,
      shiftId: null, // No shift since this is for missed shift data
      outfitId: null
    };
    
    try {
      if (db) {
        await insertTransaction(db, transactionData);
      } else {
        // Web fallback - store in localStorage
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const newTransaction = {
          id: `t_${Date.now()}`,
          ...transactionData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transactions.unshift(newTransaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));
      }
      
      resetTransactionForm();
      setToast({ 
        message: `${transactionType === 'income' ? 'Income' : 'Expense'} of $${amount.toFixed(2)} added successfully`, 
        type: 'success', 
        visible: true 
      });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      setToast({ message: 'Failed to add transaction', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  async function handleSave() {
    const db = openDb();
    const earnings = Number(avgEarnings || 0);
    
    if (!name.trim()) {
      setToast({ message: 'Venue name is required', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
      return;
    }

    try {
      if (editId) {
        // Update existing venue
        if (db) {
          await updateVenue(db, editId, {
            name: name.trim(),
            location: location.trim(),
            avgEarnings: earnings
          });
          await loadVenues();
        } else {
          // Web fallback
          const updated = items.map(v => 
            v.id === editId 
              ? { ...v, name: name.trim(), location: location.trim(), avgEarnings: earnings }
              : v
          );
          setItems(updated);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('venues', JSON.stringify(updated));
          }
        }
        setToast({ message: 'Venue updated successfully', type: 'success', visible: true });
      } else {
        // Create new venue
        const newVenue = {
          id: `v_${Date.now()}`,
          name: name.trim(),
          location: location.trim(),
          avgEarnings: earnings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (db) {
          await insertVenue(db, newVenue);
          await loadVenues();
        } else {
          // Web fallback
          const updated = [...items, newVenue];
          setItems(updated);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('venues', JSON.stringify(updated));
          }
        }
        setToast({ message: 'Venue added successfully', type: 'success', visible: true });
      }

      resetForm();
      setAddOpen(false);
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    } catch (error) {
      console.error('Error saving venue:', error);
      setToast({ message: error.message || 'Failed to save venue', type: 'error', visible: true });
      setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
    }
  }

  function handleEdit(venue) {
    setEditId(venue.id);
    setName(venue.name);
    setLocation(venue.location || '');
    setAvgEarnings(venue.avgEarnings?.toString() || '');
    setAddOpen(true);
  }

  async function handleDelete(venue) {
    Alert.alert(
      'Delete Venue',
      `Are you sure you want to delete "${venue.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = openDb();
              if (db) {
                await deleteVenue(db, venue.id);
                await loadVenues();
              } else {
                // Web fallback
                const updated = items.filter(v => v.id !== venue.id);
                setItems(updated);
                if (typeof window !== 'undefined' && window.localStorage) {
                  window.localStorage.setItem('venues', JSON.stringify(updated));
                }
              }
              setToast({ message: 'Venue deleted successfully', type: 'success', visible: true });
              setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
            } catch (error) {
              console.error('Error deleting venue:', error);
              setToast({ message: error.message || 'Failed to delete venue', type: 'error', visible: true });
              setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 2500);
            }
          }
        }
      ]
    );
  }

  function VenueRow({ item }) {
    const fade = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, []);

    return (
      <Animated.View style={[styles.row, { opacity: fade }]}>
        <View style={styles.venueInfo}>
          <View style={styles.venueHeader}>
            <Text style={styles.venueName}>{item.name}</Text>
            <Text style={styles.avgEarnings}>${item.avgEarnings || 0}</Text>
          </View>
          {item.location ? (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.location}>{item.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button
            title="+ Transaction"
            onPress={() => openQuickTransaction(item.id)}
            variant="primary"
            style={[styles.actionButton, styles.transactionButton]}
          />
          <Button
            title={perfForId === item.id ? 'Hide Performance' : 'Performance'}
            onPress={() => loadPerformance(item.id)}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Edit"
            onPress={() => handleEdit(item)}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Delete"
            onPress={() => handleDelete(item)}
            variant="danger"
            style={styles.actionButton}
          />
        </View>
        {perfForId === item.id && (
          <View style={styles.performanceContainer}>
            {perfLoading ? (
              <Text style={styles.perfLoading}>Loading performance…</Text>
            ) : perfData ? (
              <View>
                <View style={styles.perfMetricsRow}>
                  <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Shifts</Text><Text style={styles.perfMetricValue}>{perfData.shiftCount}</Text></View>
                  <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Total</Text><Text style={styles.perfMetricValue}>${(perfData.totalEarnings||0).toFixed(2)}</Text></View>
                  <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Avg/Shift</Text><Text style={styles.perfMetricValue}>${(perfData.avgEarnings||0).toFixed(2)}</Text></View>
                  <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Best Day</Text><Text style={styles.perfMetricValue}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][perfData.bestDay ?? 0]}</Text></View>
                </View>
                <View style={styles.perfActions}>
                  <Button
                    title="Filter in Analytics"
                    onPress={() => setPreferredVenueFilter(item.id)}
                    variant="primary"
                    style={styles.perfActionButton}
                  />
                </View>
                <Text style={styles.perfSectionTitle}>Recent Shifts</Text>
                {perfRecentShifts.length ? (
                  perfRecentShifts.map(s => (
                    <View key={s.id} style={styles.perfHistoryItem}>
                      <Text style={styles.perfHistoryDate}>{new Date(s.start).toLocaleString()}</Text>
                      <Text style={styles.perfHistoryEarn}>${(s.earnings||0).toFixed(2)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.perfEmpty}>No recent shifts</Text>
                )}
              </View>
            ) : (
              <Text style={styles.perfEmpty}>No performance data</Text>
            )}
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Venues</Text>
        <Button
          title="Add Venue"
          onPress={() => {
            resetForm();
            setAddOpen(true);
          }}
          variant="primary"
          style={styles.addButton}
        />
      </View>

      {addOpen && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editId ? 'Edit Venue' : 'Add New Venue'}
          </Text>
          <Input
            label="Venue Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter venue name"
            style={styles.input}
          />
          <Input
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Enter location (optional)"
            style={styles.input}
          />
          <Input
            label="Average Earnings"
            value={avgEarnings}
            onChangeText={setAvgEarnings}
            placeholder="Enter average earnings"
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.formActions}>
            <Button
              title="Cancel"
              onPress={() => {
                resetForm();
                setAddOpen(false);
              }}
              variant="secondary"
              style={styles.formButton}
            />
            <Button
              title={editId ? 'Update' : 'Add'}
              onPress={handleSave}
              variant="primary"
              style={styles.formButton}
            />
          </View>
        </View>
      )}

      {showQuickTransaction && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Quick Transaction Entry</Text>
          <Text style={styles.formSubtitle}>
            Add transaction data for {items.find(v => v.id === selectedVenueId)?.name || 'venue'}
          </Text>
          
          <View style={styles.segmentedContainer}>
            <Button
              title="Income"
              onPress={() => {
                setTransactionType('income');
                setTransactionCategory('VIP Dance');
              }}
              variant={transactionType === 'income' ? 'primary' : 'secondary'}
              style={[styles.segmentButton, transactionType === 'income' && styles.activeSegment]}
            />
            <Button
              title="Expense"
              onPress={() => {
                setTransactionType('expense');
                setTransactionCategory('House Fee');
              }}
              variant={transactionType === 'expense' ? 'primary' : 'secondary'}
              style={[styles.segmentButton, transactionType === 'expense' && styles.activeSegment]}
            />
          </View>

          <Input
            label="Amount"
            value={transactionAmount}
            onChangeText={setTransactionAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <Input
            label="Category"
            value={transactionCategory}
            onChangeText={setTransactionCategory}
            placeholder={transactionType === 'income' ? 'VIP Dance, Lapdance, etc.' : 'House Fee, Parking, etc.'}
            style={styles.input}
          />
          
          <Input
            label="Date"
            value={transactionDate}
            onChangeText={setTransactionDate}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
          
          {clientOptions.length > 0 && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Client (Optional)</Text>
              <View style={styles.clientPicker}>
                <Button
                  title={selectedClientId ? clientOptions.find(c => c.id === selectedClientId)?.name || 'Select Client' : 'No Client'}
                  onPress={() => {
                    // Simple client selection - cycle through options
                    const currentIndex = clientOptions.findIndex(c => c.id === selectedClientId);
                    const nextIndex = currentIndex + 1 >= clientOptions.length ? -1 : currentIndex + 1;
                    setSelectedClientId(nextIndex === -1 ? null : clientOptions[nextIndex].id);
                  }}
                  variant="secondary"
                  style={styles.clientButton}
                />
              </View>
            </View>
          )}
          
          <Input
            label="Note (Optional)"
            value={transactionNote}
            onChangeText={setTransactionNote}
            placeholder="Additional notes"
            style={styles.input}
            multiline
          />
          
          <View style={styles.formActions}>
            <Button
              title="Cancel"
              onPress={resetTransactionForm}
              variant="secondary"
              style={styles.formButton}
            />
            <Button
              title="Add Transaction"
              onPress={handleQuickTransaction}
              variant="primary"
              style={styles.formButton}
            />
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VenueRow item={item} />}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#666" />
            <Text style={styles.emptyTitle}>No venues yet</Text>
            <Text style={styles.emptySubtitle}>Add your first venue to get started</Text>
          </View>
        }
      />

      <Text style={styles.note}>
        {Platform.OS === 'web' ? 'Using web localStorage fallback.' : 'Using on-device SQLite database.'}
      </Text>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    paddingHorizontal: 16,
  },
  form: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  venueInfo: {
    flex: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  avgEarnings: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06d6a0',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },
  transactionButton: {
    backgroundColor: '#06d6a0',
    minWidth: 90,
  },
  performanceContainer: {
    marginTop: 12,
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
  },
  perfLoading: {
    color: '#999',
    fontSize: 14,
  },
  perfMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  perfMetric: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  perfMetricLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  perfMetricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  perfSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  perfActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  perfActionButton: {
    paddingHorizontal: 12,
  },
  perfHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  perfHistoryDate: {
    color: '#bbb',
    fontSize: 12,
  },
  perfHistoryEarn: {
    color: '#06d6a0',
    fontSize: 13,
    fontWeight: '600',
  },
  perfEmpty: {
    color: '#888',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
  },
  activeSegment: {
    backgroundColor: '#06d6a0',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  clientPicker: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    backgroundColor: '#111',
  },
  clientButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});