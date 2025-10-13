import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { shifts as sampleShifts, venues as sampleVenues, clients as sampleClients, getVenueById } from '../data/sampleData';
import { openDb, getShiftsWithVenues, getShiftTransactionTotals, getAllVenues, getAllClients, insertShift, updateShift, deleteShift } from '../lib/db';
import { GradientButton, ModernInput, GradientCard, Toast } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

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
  const [items, setItems] = useState(sampleShifts || []);
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
    if (!db) return;
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

  const filteredItems = useMemo(() => {
    let list = [...items];
    list = applyClientFilter(list);
    list = applyDays(list);
    list = applySort(list);
    return list;
  }, [items, clientFilterId, days, sortByNet, totalsByShift]);

  const upcomingShifts = useMemo(() => {
    const now = new Date();
    return filteredItems.filter(shift => new Date(shift.start) > now).slice(0, 3);
  }, [filteredItems]);

  const recentShifts = useMemo(() => {
    const now = new Date();
    return filteredItems.filter(shift => new Date(shift.start) <= now).slice(0, 5);
  }, [filteredItems]);

  const weeklyStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekShifts = filteredItems.filter(shift => new Date(shift.start) >= weekAgo);
    
    const totalEarnings = weekShifts.reduce((sum, shift) => sum + (shift.earnings || 0), 0);
    const totalHours = weekShifts.reduce((sum, shift) => {
      const start = new Date(shift.start);
      const end = new Date(shift.end);
      return sum + ((end - start) / (1000 * 60 * 60));
    }, 0);
    
    return {
      shifts: weekShifts.length,
      earnings: totalEarnings,
      hours: totalHours,
      avgPerHour: totalHours > 0 ? totalEarnings / totalHours : 0
    };
  }, [filteredItems]);

  async function handleDeleteShift(shiftId) {
    try {
      const db = openDb();
      if (db) {
        await deleteShift(db, shiftId);
        const rows = await getShiftsWithVenues(db);
        setItems(rows);
        const map = await getShiftTransactionTotals(db);
        setTotalsByShift(map);
      } else {
        const nextList = items.filter(item => item.id !== shiftId);
        setItems(nextList);
        if (typeof window !== 'undefined' && window.localStorage) {
          try { window.localStorage.setItem('shifts', JSON.stringify(nextList)); } catch {}
        }
      }
      setToast({ message: 'Shift deleted', type: 'success', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    } catch (e) {
      console.error('Delete shift failed:', e);
      setToast({ message: 'Delete failed', type: 'error', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    }
  }

  function renderShiftCard({ item }) {
    const start = new Date(item.start);
    const end = new Date(item.end);
    const duration = ((end - start) / (1000 * 60 * 60)).toFixed(1);
    const client = clientsById.get(item.clientId);
    const totals = totalsByShift.get(item.id);
    const isUpcoming = start > new Date();

    return (
      <GradientCard style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <View style={styles.shiftInfo}>
            <Text style={styles.shiftVenue}>{item.venueName || 'Unknown Venue'}</Text>
            <Text style={styles.shiftDate}>
              {start.toLocaleDateString()} • {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Text>
            {client && <Text style={styles.shiftClient}>with {client.name}</Text>}
          </View>
          <View style={[styles.shiftStatus, isUpcoming ? styles.upcomingStatus : styles.completedStatus]}>
            <Text style={styles.statusText}>{isUpcoming ? 'UPCOMING' : 'COMPLETED'}</Text>
          </View>
        </View>
        
        <View style={styles.shiftMetrics}>
          <View style={styles.metric}>
            <Ionicons name="time" size={16} color={Colors.primary} />
            <Text style={styles.metricText}>{duration}h</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="cash" size={16} color={Colors.success} />
            <Text style={styles.metricText}>{formatCurrency(item.earnings || 0)}</Text>
          </View>
          {totals && (
            <View style={styles.metric}>
              <Ionicons name="trending-up" size={16} color={Colors.accent} />
              <Text style={styles.metricText}>{formatCurrency(totals.net || 0)} net</Text>
            </View>
          )}
        </View>
        
        {item.notes && (
          <Text style={styles.shiftNotes}>{item.notes}</Text>
        )}
        
        <View style={styles.shiftActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setEditingShift(item);
              setVenueId(item.venueId);
              setClientId(item.clientId || '');
              setEarnings(String(item.earnings || ''));
              setNotes(item.notes || '');
              setStartStr(item.start);
              setEndStr(item.end);
              setEditOpen(true);
            }}
          >
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteShift(item.id)}
          >
            <Ionicons name="trash" size={16} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </GradientCard>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar" size={28} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Shifts</Text>
              <Text style={styles.headerSubtitle}>Manage your schedule</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => exportShiftsCSV(filteredItems)}
            >
              <Ionicons name="download" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setAddOpen(true)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Stats */}
        <View style={styles.statsContainer}>
          <GradientCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{weeklyStats.shifts}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="cash-outline" size={24} color={Colors.success} />
              <Text style={styles.statValue}>{formatCurrency(weeklyStats.earnings)}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="time-outline" size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{weeklyStats.hours.toFixed(1)}h</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="trending-up-outline" size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{formatCurrency(weeklyStats.avgPerHour)}</Text>
              <Text style={styles.statLabel}>Per Hour</Text>
            </View>
          </GradientCard>
        </View>

        {/* Time Range Selector */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeButtons}>
            {[7, 30, 90].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.timeButton, days === d && styles.timeButtonActive]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.timeButtonText, days === d && styles.timeButtonTextActive]}>
                  {d} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Shifts */}
        {upcomingShifts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {upcomingShifts.map((shift) => (
              <View key={shift.id}>
                {renderShiftCard({ item: shift })}
              </View>
            ))}
          </View>
        )}

        {/* Recent Shifts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shifts</Text>
            <TouchableOpacity onPress={() => setSortByNet(!sortByNet)}>
              <Text style={styles.sortText}>
                {sortByNet ? 'By Net' : 'By Date'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {recentShifts.length === 0 ? (
            <GradientCard style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyTitle}>No shifts yet</Text>
                <Text style={styles.emptySubtitle}>Add your first shift to get started</Text>
                <GradientButton
                  title="Add Shift"
                  onPress={() => setAddOpen(true)}
                  style={styles.emptyButton}
                />
              </View>
            </GradientCard>
          ) : (
            recentShifts.map((shift) => (
              <View key={shift.id}>
                {renderShiftCard({ item: shift })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  timeButtonTextActive: {
    color: 'white',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  sortText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  shiftCard: {
    padding: 16,
    marginBottom: 12,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  shiftDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  shiftClient: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  shiftStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingStatus: {
    backgroundColor: Colors.warning + '20',
  },
  completedStatus: {
    backgroundColor: Colors.success + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
  },
  shiftMetrics: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 4,
  },
  shiftNotes: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  shiftActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  emptyCard: {
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
});