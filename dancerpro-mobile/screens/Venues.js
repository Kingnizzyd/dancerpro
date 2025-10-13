import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { venues as sampleVenues } from '../data/sampleData';
import { openDb, getAllVenues, insertVenue, updateVenue, deleteVenue, insertTransaction, getAllClients, getVenuePerformance, getVenueShifts } from '../lib/db';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton, ModernInput, GradientCard, Toast } from '../components/UI';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

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
      <Animated.View style={{ opacity: fade }}>
        <GradientCard variant="default" style={styles.rowCard}>
          <View style={styles.venueInfo}>
            <View style={styles.venueHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="business" size={18} color={Colors.accent} />
                <Text style={styles.venueName}>{item.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cash-outline" size={16} color={Colors.success} />
                <Text style={styles.avgEarnings}>${item.avgEarnings || 0}</Text>
              </View>
            </View>
            {item.location ? (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.location}>{item.location}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <GradientButton
              title="+ Transaction"
              onPress={() => openQuickTransaction(item.id)}
              variant="primary"
              style={[styles.actionButton, styles.transactionButton]}
            />
            <GradientButton
              title={perfForId === item.id ? 'Hide Performance' : 'Performance'}
              onPress={() => loadPerformance(item.id)}
              variant="secondary"
              style={styles.actionButton}
            />
            <GradientButton
              title="Edit"
              onPress={() => handleEdit(item)}
              variant="secondary"
              style={styles.actionButton}
            />
            <GradientButton
              title="Delete"
              onPress={() => handleDelete(item)}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>

          {perfForId === item.id && (
            <GradientCard variant="glow" style={styles.performanceCard}>
              {perfLoading ? (
                <Text style={styles.perfLoading}>Loading performance…</Text>
              ) : perfData ? (
                <View>
                  {/* Enhanced Analytics Cards */}
                  <View style={styles.analyticsCardsContainer}>
                    <GradientCard variant="subtle" style={styles.analyticsCard}>
                      <View style={styles.analyticsCardHeader}>
                        <Text style={styles.analyticsCardIcon}>📊</Text>
                        <Text style={styles.analyticsCardTitle}>Performance</Text>
                      </View>
                      <View style={styles.analyticsMetrics}>
                        <View style={styles.analyticsMetric}>
                          <Text style={styles.analyticsMetricValue}>{perfData.shiftCount}</Text>
                          <Text style={styles.analyticsMetricLabel}>Total Shifts</Text>
                        </View>
                        <View style={styles.analyticsMetric}>
                          <Text style={styles.analyticsMetricValue}>${(perfData.totalEarnings||0).toFixed(2)}</Text>
                          <Text style={styles.analyticsMetricLabel}>Total Earnings</Text>
                        </View>
                      </View>
                    </GradientCard>

                    <GradientCard variant="subtle" style={styles.analyticsCard}>
                      <View style={styles.analyticsCardHeader}>
                        <Text style={styles.analyticsCardIcon}>💰</Text>
                        <Text style={styles.analyticsCardTitle}>Averages</Text>
                      </View>
                      <View style={styles.analyticsMetrics}>
                        <View style={styles.analyticsMetric}>
                          <Text style={styles.analyticsMetricValue}>${(perfData.avgEarnings||0).toFixed(2)}</Text>
                          <Text style={styles.analyticsMetricLabel}>Per Shift</Text>
                        </View>
                        <View style={styles.analyticsMetric}>
                          <Text style={styles.analyticsMetricValue}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][perfData.bestDay ?? 0]}</Text>
                          <Text style={styles.analyticsMetricLabel}>Best Day</Text>
                        </View>
                      </View>
                    </GradientCard>
                  </View>

                  {/* Legacy metrics row for comparison */}
                  <View style={styles.perfMetricsRow}>
                    <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Shifts</Text><Text style={styles.perfMetricValue}>{perfData.shiftCount}</Text></View>
                    <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Total</Text><Text style={styles.perfMetricValue}>${(perfData.totalEarnings||0).toFixed(2)}</Text></View>
                    <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Avg/Shift</Text><Text style={styles.perfMetricValue}>${(perfData.avgEarnings||0).toFixed(2)}</Text></View>
                    <View style={styles.perfMetric}><Text style={styles.perfMetricLabel}>Best Day</Text><Text style={styles.perfMetricValue}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][perfData.bestDay ?? 0]}</Text></View>
                  </View>
                  <View style={styles.perfActions}>
                    <GradientButton
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
            </GradientCard>
          )}
        </GradientCard>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Venues</Text>
        <GradientButton
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
          <ModernInput
            label="Venue Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter venue name"
            style={styles.input}
          />
          <ModernInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Enter location (optional)"
            style={styles.input}
          />
          <ModernInput
            label="Average Earnings"
            value={avgEarnings}
            onChangeText={setAvgEarnings}
            placeholder="Enter average earnings"
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.formActions}>
            <GradientButton
              title="Cancel"
              onPress={() => {
                resetForm();
                setAddOpen(false);
              }}
              variant="secondary"
              style={styles.formButton}
            />
            <GradientButton
              title={editId ? 'Update' : 'Add'}
              onPress={handleSave}
              variant="primary"
              style={styles.formButton}
            />
          </View>
        </View>
      )}

      {showQuickTransaction && (
        <GradientCard variant="glow" style={styles.transactionModal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="flash" size={24} color={Colors.accent} />
              <Text style={styles.modalTitle}>Quick Transaction Entry</Text>
            </View>
            <GradientButton
              title="✕"
              onPress={resetTransactionForm}
              variant="secondary"
              style={styles.closeButton}
            />
          </View>
          
          <View style={styles.modalSubtitle}>
            <Ionicons name="business" size={16} color={Colors.textSecondary} />
            <Text style={styles.modalSubtitleText}>
              Add transaction data for {items.find(v => v.id === selectedVenueId)?.name || 'venue'}
            </Text>
          </View>
          
          <View style={styles.transactionTypeSelector}>
            <GradientButton
              title="💰 Income"
              onPress={() => {
                setTransactionType('income');
                setTransactionCategory('VIP Dance');
              }}
              variant={transactionType === 'income' ? 'primary' : 'secondary'}
              style={[styles.typeButton, transactionType === 'income' && styles.activeTypeButton]}
            />
            <GradientButton
              title="💸 Expense"
              onPress={() => {
                setTransactionType('expense');
                setTransactionCategory('House Fee');
              }}
              variant={transactionType === 'expense' ? 'primary' : 'secondary'}
              style={[styles.typeButton, transactionType === 'expense' && styles.activeTypeButton]}
            />
          </View>

          <View style={styles.modalForm}>
            <ModernInput
              label="Amount"
              value={transactionAmount}
              onChangeText={setTransactionAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              style={styles.modalInput}
            />
            
            <ModernInput
              label="Category"
              value={transactionCategory}
              onChangeText={setTransactionCategory}
              placeholder={transactionType === 'income' ? 'VIP Dance, Lapdance, etc.' : 'House Fee, Parking, etc.'}
              style={styles.modalInput}
            />
            
            <ModernInput
              label="Date"
              value={transactionDate}
              onChangeText={setTransactionDate}
              placeholder="YYYY-MM-DD"
              style={styles.modalInput}
            />
            
            {clientOptions.length > 0 && (
              <View style={styles.clientSection}>
                <Text style={styles.clientLabel}>Client (Optional)</Text>
                <GradientButton
                  title={selectedClientId ? `👤 ${clientOptions.find(c => c.id === selectedClientId)?.name}` : '👤 No Client'}
                  onPress={() => {
                    const currentIndex = clientOptions.findIndex(c => c.id === selectedClientId);
                    const nextIndex = currentIndex + 1 >= clientOptions.length ? -1 : currentIndex + 1;
                    setSelectedClientId(nextIndex === -1 ? null : clientOptions[nextIndex].id);
                  }}
                  variant="secondary"
                  style={styles.clientButton}
                />
              </View>
            )}
            
            <ModernInput
              label="Note (Optional)"
              value={transactionNote}
              onChangeText={setTransactionNote}
              placeholder="Additional notes"
              style={styles.modalInput}
              multiline
            />
          </View>
          
          <View style={styles.modalActions}>
            <GradientButton
              title="Cancel"
              onPress={resetTransactionForm}
              variant="secondary"
              style={styles.modalActionButton}
            />
            <GradientButton
              title="Add Transaction"
              onPress={handleQuickTransaction}
              variant="primary"
              style={[styles.modalActionButton, styles.primaryActionButton]}
            />
          </View>
        </GradientCard>
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
  rowCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  venueInfo: {
    flex: 1,
    marginBottom: 16,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    letterSpacing: 0.5,
  },
  avgEarnings: {
    fontSize: 18,
    fontWeight: '700',
    color: '#06d6a0',
    textShadowColor: 'rgba(6, 214, 160, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  location: {
    fontSize: 14,
    color: '#bbb',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  transactionButton: {
    backgroundColor: '#06d6a0',
    minWidth: 110,
    shadowColor: '#06d6a0',
    shadowOpacity: 0.4,
  },
  performanceCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  perfLoading: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  perfMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  perfMetric: {
    flex: 1,
    minWidth: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  perfMetricLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perfMetricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  perfSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  perfActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  perfActionButton: {
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  perfHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#06d6a0',
  },
  perfHistoryDate: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  perfHistoryEarn: {
    color: '#06d6a0',
    fontSize: 15,
    fontWeight: '700',
  },
  perfEmpty: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // New analytics card styles
  analyticsCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  analyticsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  analyticsCardIcon: {
    fontSize: 18,
  },
  analyticsCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  analyticsMetrics: {
    gap: 8,
  },
  analyticsMetric: {
    alignItems: 'center',
  },
  analyticsMetricValue: {
    color: '#06d6a0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  analyticsMetricLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
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
  
  // Enhanced Transaction Modal Styles
  transactionModal: {
position: 'absolute',
top: 20,
left: 20,
right: 20,
zIndex: 1000,
padding: 24,
borderRadius: 20,
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.3,
shadowRadius: 16,
elevation: 12,
maxHeight: '90%',
},
modalHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: 16,
paddingBottom: 16,
borderBottomWidth: 1,
borderBottomColor: 'rgba(255, 255, 255, 0.1)',
},
modalTitleContainer: {
flexDirection: 'row',
alignItems: 'center',
gap: 12,
},
modalTitle: {
fontSize: 20,
fontWeight: '700',
color: '#fff',
textShadowColor: 'rgba(6, 214, 160, 0.3)',
textShadowOffset: { width: 0, height: 1 },
textShadowRadius: 4,
},
closeButton: {
width: 36,
height: 36,
borderRadius: 18,
padding: 0,
minWidth: 36,
justifyContent: 'center',
alignItems: 'center',
},
modalSubtitle: {
flexDirection: 'row',
alignItems: 'center',
gap: 8,
marginBottom: 20,
padding: 12,
backgroundColor: 'rgba(255, 255, 255, 0.05)',
borderRadius: 12,
borderLeftWidth: 3,
borderLeftColor: Colors.accent,
},
modalSubtitleText: {
fontSize: 14,
color: Colors.textSecondary,
fontWeight: '500',
},
transactionTypeSelector: {
flexDirection: 'row',
gap: 12,
marginBottom: 24,
padding: 4,
backgroundColor: 'rgba(255, 255, 255, 0.05)',
borderRadius: 16,
},
typeButton: {
flex: 1,
paddingVertical: 12,
borderRadius: 12,
},
activeTypeButton: {
shadowColor: Colors.accent,
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.4,
shadowRadius: 8,
elevation: 6,
},
modalForm: {
gap: 16,
marginBottom: 24,
},
modalInput: {
backgroundColor: 'rgba(255, 255, 255, 0.08)',
borderRadius: 12,
borderWidth: 1,
borderColor: 'rgba(255, 255, 255, 0.1)',
},
clientSection: {
gap: 8,
},
clientLabel: {
fontSize: 14,
fontWeight: '600',
color: '#fff',
marginBottom: 4,
},
clientButton: {
backgroundColor: 'rgba(255, 255, 255, 0.08)',
borderRadius: 12,
borderWidth: 1,
borderColor: 'rgba(255, 255, 255, 0.1)',
paddingVertical: 14,
},
modalActions: {
flexDirection: 'row',
gap: 12,
paddingTop: 16,
borderTopWidth: 1,
borderTopColor: 'rgba(255, 255, 255, 0.1)',
},
modalActionButton: {
flex: 1,
paddingVertical: 14,
borderRadius: 12,
},
primaryActionButton: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});