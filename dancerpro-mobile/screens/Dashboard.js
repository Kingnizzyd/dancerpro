import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { lastNDaysShifts, sumEarnings, topVenueByEarnings, clients as sampleClients } from '../data/sampleData';
import { openDb, getRecentShifts, getTopVenue, getKpiSnapshot, getAllClients, getAllDataSnapshot, importAllDataSnapshot, getTopEarningOutfits, getAllOutfitsWithEarnings } from '../lib/db';
import { GradientCard, GradientButton, ModernInput } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';
import { BACKEND_URL } from '../lib/config';
import { fetchCloudSnapshot } from '../lib/api';
import WebSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const { user } = useAuth();
  const [recentShifts, setRecentShifts] = useState(Platform.OS === 'web' ? lastNDaysShifts(7) : []);
  const [total, setTotal] = useState(Platform.OS === 'web' ? sumEarnings(lastNDaysShifts(7)) : 0);
  const [top, setTop] = useState(Platform.OS === 'web' ? topVenueByEarnings(lastNDaysShifts(7)) : null);
  const [snapshot, setSnapshot] = useState({ totals: { income: 0, expense: 0, net: 0 }, counts: {}, byClient: [], topClient: null });
  const [clients, setClients] = useState(Platform.OS === 'web' ? (sampleClients || []) : []);
  const [topOutfits, setTopOutfits] = useState([]);
  const [outfitStats, setOutfitStats] = useState({ totalOutfits: 0, totalEarnings: 0, avgEarningsPerOutfit: 0, profitableOutfits: 0 });
  const navigation = useNavigation();
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataMsg, setDataMsg] = useState('');
  const [backendHealth, setBackendHealth] = useState('unknown'); // 'healthy' | 'degraded' | 'down' | 'unknown'
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState(null);
  const [autoSynced, setAutoSynced] = useState(false);

  const refreshDashboardData = async () => {
    setRefreshing(true);
    const db = openDb();
    if (!db) {
      try {
        const s = await getKpiSnapshot(db);
        setSnapshot(s);
      } catch (e) {
        console.warn('Dashboard KPI load (web) failed', e);
      }
      setClients(sampleClients || []);
    }
    try {
      const recent = await getRecentShifts(db, days);
      const t = recent.reduce((acc, s) => acc + (s.earnings || 0), 0);
      const topVenue = await getTopVenue(db, days);
      setRecentShifts(recent);
      setTotal(t);
      setTop(topVenue ? { venue: topVenue.venue, total: topVenue.total } : null);

      const s = await getKpiSnapshot(db);
      setSnapshot(s);
      const cs = await getAllClients(db);
      setClients(cs);

      const topOutfitsData = await getTopEarningOutfits(db, 5);
      setTopOutfits(topOutfitsData);

      const allOutfits = await getAllOutfitsWithEarnings(db);
      const totalOutfits = allOutfits.length;
      const totalEarnings = allOutfits.reduce((acc, o) => acc + (o.net || 0), 0);
      const profitableOutfits = allOutfits.filter(o => (o.net || 0) > 0).length;
      const avgEarningsPerOutfit = totalOutfits > 0 ? totalEarnings / totalOutfits : 0;

      setOutfitStats({
        totalOutfits,
        totalEarnings,
        avgEarningsPerOutfit,
        profitableOutfits
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.warn('Dashboard DB load failed, using sample data', e);
    } finally {
      setRefreshing(false);
    }
  };

  const checkHealth = async () => {
    setHealthChecking(true);
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 7000);
      const res = await fetch(`${BACKEND_URL}/health`, { signal: controller?.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        setBackendHealth('down');
      } else {
        let status = 'healthy';
        try {
          const json = await res.json();
          status = json?.status || 'healthy';
        } catch {}
        if (String(status).toLowerCase() === 'degraded') setBackendHealth('degraded');
        else if (String(status).toLowerCase() === 'down') setBackendHealth('down');
        else setBackendHealth('healthy');
      }
      setLastHealthCheck(new Date());
    } catch (e) {
      setBackendHealth('down');
      setLastHealthCheck(new Date());
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    refreshDashboardData();
  }, [days]);

  // Auto-sync from backend when healthy and an auth token exists
  useEffect(() => {
    if (autoSynced) return;
    try {
      const token = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('authToken') : null;
      if (backendHealth === 'healthy' && token) {
        (async () => {
          try {
            setRefreshing(true);
            const snap = await fetchCloudSnapshot(token);
            const db = openDb();
            await importAllDataSnapshot(db, snap);
            await refreshDashboardData();
            setAutoSynced(true);
            setDataMsg('Cloud data synced');
            setTimeout(() => setDataMsg(''), 2500);
          } catch (e) {
            console.warn('Auto cloud sync failed', e);
          } finally {
            setRefreshing(false);
          }
        })();
      }
    } catch {}
  }, [backendHealth, autoSynced]);

  // Real-time updates: subscribe to socket events to refresh snapshot and recents
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Connect to Socket.IO server using HTTP URL
        await WebSocketService.connect(BACKEND_URL);
      } catch (e) {
        console.warn('Dashboard socket connect failed', e);
      }
    })();

    const handler = async () => {
      if (!mounted) return;
      await refreshDashboardData();
    };

    WebSocketService.on('new_message', handler);
    WebSocketService.on('message_sent', handler);
    WebSocketService.on('message_received', handler);
    // Future events for shifts/transactions
    WebSocketService.on('shift_updated', handler);
    WebSocketService.on('transaction_updated', handler);

    return () => {
      mounted = false;
      WebSocketService.off('new_message', handler);
      WebSocketService.off('message_sent', handler);
      WebSocketService.off('message_received', handler);
      WebSocketService.off('shift_updated', handler);
      WebSocketService.off('transaction_updated', handler);
    };
  }, []);

  // Persist selected range (web) and restore on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('dashboardDays');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed === 7 || parsed === 30 || parsed === 90) setDays(parsed);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('dashboardDays', JSON.stringify(days)); } catch {}
    }
  }, [days]);

  const handleViewShifts = (clientId) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('clientFilterId', clientId); } catch {}
    }
    try {
      navigation.navigate('Shifts', { clientId });
    } catch {}
  };

  const handleViewClient = (clientId) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('clientDetailId', clientId); } catch {}
    }
    try {
      navigation.navigate('Clients', { clientId });
    } catch {}
  };

  const handleViewMoney = (clientId) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('moneyFilters');
        const prev = raw ? JSON.parse(raw) : {};
        const payload = { ...prev, filterClientId: clientId };
        window.localStorage.setItem('moneyFilters', JSON.stringify(payload));
      } catch {}
    }
    try {
      navigation.navigate('Money', { clientId });
    } catch {}
  };

  // Data backup/export (web/native where possible)
  const handleExportAll = async () => {
    try {
      const db = openDb();
      const snapshot = await getAllDataSnapshot(db);
      if (typeof window !== 'undefined' && window.document) {
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dancerpro_backup_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setDataMsg('Exported data snapshot.');
        setTimeout(() => setDataMsg(''), 2500);
      } else {
        console.log('DATA SNAPSHOT', snapshot);
        setDataMsg('Snapshot logged to console.');
        setTimeout(() => setDataMsg(''), 2500);
      }
    } catch (e) {
      console.warn('Export all failed', e);
      setDataMsg('Failed to export data.');
      setTimeout(() => setDataMsg(''), 2500);
    }
  };

  const handleImportAll = async () => {
    if (typeof window === 'undefined' || !window.document) {
      setDataMsg('Import is supported on web only for now.');
      setTimeout(() => setDataMsg(''), 2500);
      return;
    }
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const json = JSON.parse(String(evt.target?.result || '{}'));
            const db = openDb();
            await importAllDataSnapshot(db, json);
            setDataMsg('Imported data snapshot. Reloading...');
            setTimeout(() => {
              setDataMsg('');
              if (typeof window !== 'undefined') window.location.reload();
            }, 1000);
          } catch (e) {
            console.warn('Import all failed', e);
            setDataMsg('Failed to import data.');
            setTimeout(() => setDataMsg(''), 2500);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (e) {
      console.warn('Import trigger failed', e);
      setDataMsg('Failed to start import.');
      setTimeout(() => setDataMsg(''), 2500);
    }
  };

  const handleSyncCloud = async () => {
    try {
      setRefreshing(true);
      const snap = await fetchCloudSnapshot();
      const db = openDb();
      await importAllDataSnapshot(db, snap);
      await refreshDashboardData();
      setDataMsg('Synced from cloud');
      setTimeout(() => setDataMsg(''), 2500);
    } catch (e) {
      console.warn('Cloud sync failed', e);
      setDataMsg(`Cloud sync failed: ${e.message || 'Error'}`);
      setTimeout(() => setDataMsg(''), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary, Colors.surfaceAccent]}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.gradientPrimary, Colors.gradientSecondary]}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="analytics" size={32} color={Colors.white} />
                <View>
                  <Text style={styles.heading}>Dashboard</Text>
                  <Text style={styles.subheading}>Your performance overview</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.syncButton} 
                  onPress={handleSyncCloud}
                  accessibilityRole="button"
                  accessibilityLabel="Sync cloud data"
                >
                  <Ionicons name="cloud-download" size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={refreshDashboardData}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh dashboard"
                >
                  <Ionicons name="refresh" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Status Bar */}
        <GradientCard variant="minimal" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { 
                backgroundColor: backendHealth === 'healthy' ? Colors.success : 
                               backendHealth === 'degraded' ? Colors.warning : 
                               backendHealth === 'down' ? Colors.error : Colors.textMuted 
              }]} />
              <Text style={styles.statusText}>
                {healthChecking ? 'Checking…' : `Backend: ${backendHealth}`}
              </Text>
            </View>
            {user?.email && (
              <Text style={styles.userText}>Signed in as {user.email}</Text>
            )}
            <Text style={styles.lastUpdatedText}>
              {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
            </Text>
          </View>
        </GradientCard>

        {/* Time Range Selector */}
        <GradientCard variant="glow" style={styles.timeRangeCard}>
          <Text style={styles.cardTitle}>Time Range</Text>
          <View style={styles.timeRangeButtons}>
            {[
              { label: '7 Days', value: 7 },
              { label: '30 Days', value: 30 },
              { label: '90 Days', value: 90 },
            ].map((option) => (
              <GradientButton
                key={option.value}
                title={option.label}
                variant={days === option.value ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setDays(option.value)}
                style={styles.timeRangeButton}
              />
            ))}
          </View>
        </GradientCard>

        {/* KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          <GradientCard variant="accent" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="cash" size={24} color={Colors.accent} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{formatCurrency(total)}</Text>
                <Text style={styles.kpiLabel}>Earnings ({days}d)</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="glow" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="calendar" size={24} color={Colors.secondary} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{recentShifts.length}</Text>
                <Text style={styles.kpiLabel}>Shifts ({days}d)</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="default" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="business" size={24} color={Colors.gradientPrimary} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {top ? top.venue.name : '—'}
                </Text>
                <Text style={styles.kpiLabel}>Top Venue</Text>
                {top && <Text style={styles.kpiSubtext}>{formatCurrency(top.total)}</Text>}
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="accent" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="shirt" size={24} color={Colors.accentSecondary} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{formatCurrency(outfitStats.totalEarnings)}</Text>
                <Text style={styles.kpiLabel}>Outfit Earnings</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="glow" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="trending-up" size={24} color={Colors.success} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>
                  {outfitStats.profitableOutfits}/{outfitStats.totalOutfits}
                </Text>
                <Text style={styles.kpiLabel}>Profitable Outfits</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="default" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="analytics" size={24} color={Colors.warning} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{formatCurrency(outfitStats.avgEarningsPerOutfit)}</Text>
                <Text style={styles.kpiLabel}>Avg Outfit ROI</Text>
              </View>
            </View>
          </GradientCard>
        </View>

        {/* Top Clients Section */}
        <GradientCard variant="glow" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Clients</Text>
            <GradientButton
              title="View All"
              variant="secondary"
              size="small"
              onPress={() => navigation.navigate('Clients')}
            />
          </View>
          <View style={styles.clientList}>
            {snapshot?.byClient?.slice(0, 5).map((c, i) => (
              <View key={i} style={styles.clientRow}>
                <View style={styles.clientRank}>
                  <Text style={styles.rankNumber}>#{i + 1}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{getClientName(clients, c.clientId) || 'Unknown'}</Text>
                  <Text style={styles.clientEarnings}>{formatCurrency(c.net)}</Text>
                </View>
                <View style={styles.clientActions}>
                  <TouchableOpacity 
                    onPress={() => handleViewClient(c.clientId)} 
                    style={styles.actionButton}
                  >
                    <Ionicons name="person" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleViewMoney(c.clientId)} 
                    style={styles.actionButton}
                  >
                    <Ionicons name="cash" size={16} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {(!snapshot?.byClient || snapshot.byClient.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No client data yet</Text>
                <Text style={styles.emptySubtext}>Start adding clients to see performance</Text>
              </View>
            )}
          </View>
        </GradientCard>

        {/* Top Earning Outfits Section */}
        <GradientCard variant="accent" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Earning Outfits</Text>
            <GradientButton
              title="Analytics"
              variant="secondary"
              size="small"
              onPress={() => navigation.navigate('Analytics')}
            />
          </View>
          <View style={styles.outfitList}>
            {topOutfits.map((outfit, i) => (
              <View key={outfit.id} style={styles.outfitRow}>
                <View style={styles.outfitRank}>
                  <LinearGradient
                    colors={[Colors.gradientPrimary, Colors.gradientSecondary]}
                    style={styles.rankGradient}
                  >
                    <Text style={styles.rankNumber}>#{i + 1}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{outfit.name}</Text>
                  <View style={styles.outfitMetrics}>
                    <Text style={styles.outfitIncome}>+{formatCurrency(outfit.income || 0)}</Text>
                    <Text style={styles.outfitExpense}>-{formatCurrency(outfit.expense || 0)}</Text>
                    <Text style={[styles.outfitNet, { 
                      color: (outfit.net || 0) >= 0 ? Colors.success : Colors.error 
                    }]}>
                      {formatCurrency(outfit.net || 0)}
                    </Text>
                  </View>
                  <Text style={styles.outfitWears}>
                    {outfit.wearCount || 0} wears • {outfit.transactionCount || 0} transactions
                  </Text>
                </View>
              </View>
            ))}
            {topOutfits.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="shirt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No outfit earnings data yet</Text>
                <Text style={styles.emptySubtext}>Start linking transactions to outfits to see performance</Text>
              </View>
            )}
          </View>
        </GradientCard>

        {/* Data Management Section */}
        <GradientCard variant="minimal" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.dataActions}>
            <GradientButton
              title="Export All"
              variant="secondary"
              size="small"
              onPress={handleExportAll}
              style={styles.dataButton}
            />
            <GradientButton
              title="Import All"
              variant="secondary"
              size="small"
              onPress={handleImportAll}
              style={styles.dataButton}
            />
          </View>
          {dataMsg ? (
            <Text style={styles.dataMessage}>{dataMsg}</Text>
          ) : null}
          <Text style={styles.dataNote}>
            {Platform.OS === 'web' ? 'Using web localStorage fallback.' : 'Using on-device SQLite database.'}
          </Text>
        </GradientCard>

        {/* Loading Overlay */}
        {refreshing && (
          <View style={styles.refreshOverlay}>
            <GradientCard variant="glow" style={styles.refreshCard}>
              <Ionicons name="refresh" size={24} color={Colors.primary} />
              <Text style={styles.refreshText}>Refreshing...</Text>
            </GradientCard>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}



function getClientName(list, id) {
  const found = (list || []).find(c => c.id === id);
  return found ? found.name : id;
}

function renderTopClient(snapshot, clients) {
  const tc = snapshot?.topClient;
  if (!tc) return '—';
  return `${getClientName(clients, tc.clientId)} (${formatCurrency(tc.net)})`;
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: Colors.spacing.xl,
  },
  header: {
    marginBottom: Colors.spacing.lg,
  },
  headerGradient: {
    paddingTop: 50,
    paddingHorizontal: Colors.spacing.lg,
    paddingBottom: Colors.spacing.lg,
    borderBottomLeftRadius: Colors.borderRadius.xl,
    borderBottomRightRadius: Colors.borderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
  },
  heading: {
    color: Colors.white,
    fontSize: Colors.typography.fontSize.xl,
    fontWeight: Colors.typography.fontWeight.bold,
    marginBottom: 4,
  },
  subheading: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.sm,
  },
  syncButton: {
    padding: Colors.spacing.sm,
    borderRadius: Colors.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButton: {
    padding: Colors.spacing.sm,
    borderRadius: Colors.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusCard: {
    marginHorizontal: Colors.spacing.lg,
    marginBottom: Colors.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Colors.spacing.sm,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  userText: {
    color: Colors.textAccent,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  lastUpdatedText: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
  },
  timeRangeCard: {
    marginHorizontal: Colors.spacing.lg,
    marginBottom: Colors.spacing.lg,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    marginBottom: Colors.spacing.md,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: Colors.spacing.sm,
  },
  timeRangeButton: {
    flex: 1,
  },
  kpiGrid: {
    paddingHorizontal: Colors.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Colors.spacing.md,
    marginBottom: Colors.spacing.lg,
  },
  kpiCard: {
    width: (width - Colors.spacing.lg * 2 - Colors.spacing.md) / 2,
    minHeight: 120,
  },
  kpiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: Colors.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiText: {
    flex: 1,
  },
  kpiValue: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.lg,
    fontWeight: Colors.typography.fontWeight.bold,
    marginBottom: 4,
  },
  kpiLabel: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  kpiSubtext: {
    color: Colors.textAccent,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
    marginTop: 2,
  },
  sectionCard: {
    marginHorizontal: Colors.spacing.lg,
    marginBottom: Colors.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Colors.spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.lg,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  clientList: {
    gap: Colors.spacing.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
    paddingVertical: Colors.spacing.sm,
    paddingHorizontal: Colors.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Colors.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientRank: {
    width: 32,
    height: 32,
    borderRadius: Colors.borderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    color: Colors.textAccent,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    marginBottom: 2,
  },
  clientEarnings: {
    color: Colors.success,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  clientActions: {
    flexDirection: 'row',
    gap: Colors.spacing.xs,
  },
  actionButton: {
    padding: Colors.spacing.sm,
    borderRadius: Colors.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  outfitList: {
    gap: Colors.spacing.md,
  },
  outfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
    paddingVertical: Colors.spacing.md,
    paddingHorizontal: Colors.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Colors.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outfitRank: {
    width: 40,
    height: 40,
  },
  rankGradient: {
    width: 40,
    height: 40,
    borderRadius: Colors.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    marginBottom: Colors.spacing.xs,
  },
  outfitMetrics: {
    flexDirection: 'row',
    gap: Colors.spacing.md,
    marginBottom: Colors.spacing.xs,
  },
  outfitIncome: {
    color: Colors.success,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  outfitExpense: {
    color: Colors.error,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  outfitNet: {
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  outfitWears: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Colors.spacing.xl,
    gap: Colors.spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    textAlign: 'center',
    maxWidth: 250,
  },
  dataActions: {
    flexDirection: 'row',
    gap: Colors.spacing.sm,
    marginBottom: Colors.spacing.md,
  },
  dataButton: {
    flex: 1,
  },
  dataMessage: {
    color: Colors.textAccent,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
    marginBottom: Colors.spacing.sm,
    textAlign: 'center',
  },
  dataNote: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    textAlign: 'center',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  refreshCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
    paddingHorizontal: Colors.spacing.lg,
    paddingVertical: Colors.spacing.md,
  },
  refreshText: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
});