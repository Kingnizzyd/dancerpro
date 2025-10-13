import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { lastNDaysShifts, sumEarnings, topVenueByEarnings, clients as sampleClients } from '../data/sampleData';
import { openDb, getRecentShifts, getTopVenue, getKpiSnapshot, getAllClients, getAllDataSnapshot, importAllDataSnapshot, getTopEarningOutfits, getAllOutfitsWithEarnings } from '../lib/db';
import { Card, Button, Segmented } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';
import { BACKEND_URL } from '../lib/config';
import WebSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

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

  // Real-time updates: subscribe to socket events to refresh snapshot and recents
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await WebSocketService.connect();
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

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Dashboard</Text>
        <View style={styles.headerActions}>
          <View style={styles.healthBadge} accessibilityLabel={`Backend ${backendHealth}`}>
            <View
              style={[
                styles.healthDot,
                backendHealth === 'healthy' ? { backgroundColor: Colors.success } :
                backendHealth === 'degraded' ? { backgroundColor: Colors.warning } :
                backendHealth === 'down' ? { backgroundColor: Colors.error } :
                { backgroundColor: Colors.status }
              ]}
            />
            <Text style={styles.healthText}>
              {healthChecking ? 'Checking…' : `Backend: ${backendHealth}`}
            </Text>
            <TouchableOpacity
              onPress={checkHealth}
              accessibilityRole="button"
              accessibilityLabel="Check backend health"
            >
              <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshDashboardData}
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard"
          >
            <Ionicons name="refresh" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.lastUpdatedText}>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}</Text>
      {lastHealthCheck ? (
        <Text style={styles.lastUpdatedText}>Backend checked: {new Date(lastHealthCheck).toLocaleTimeString()}</Text>
      ) : null}
      {user?.email ? (
        <Text style={styles.signedInText}>Signed in as {user.email}</Text>
      ) : null}
      <Segmented
        options={[
          { label: '7d', value: 7 },
          { label: '30d', value: 30 },
          { label: '90d', value: 90 },
        ]}
        value={days}
        onChange={setDays}
      />
      <View style={[styles.cards, { marginTop: 12 }]}>
        <Card
          title={`Earnings (${days}d)`}
          value={formatCurrency(total)}
          accent="#ff2d90"
          icon={Platform.OS !== 'web' ? <Ionicons name="cash-outline" size={16} color="#ff2d90" /> : '💰'}
        />
        <Card
          title={`Shifts (${days}d)`}
          value={`${recentShifts.length}`}
          accent="#ffd166"
          icon={Platform.OS !== 'web' ? <Ionicons name="calendar-outline" size={16} color="#ffd166" /> : '📅'}
        />
        <Card
          title="Top Venue"
          value={top ? `${top.venue.name} (${formatCurrency(top.total)})` : '—'}
          accent="#06d6a0"
          icon={Platform.OS !== 'web' ? <Ionicons name="business-outline" size={16} color="#06d6a0" /> : '🏢'}
        />
        <Card
          title="Outfit Earnings"
          value={formatCurrency(outfitStats.totalEarnings)}
          accent="#8b5cf6"
          icon={Platform.OS !== 'web' ? <Ionicons name="shirt-outline" size={16} color="#8b5cf6" /> : '👗'}
        />
        <Card
          title="Profitable Outfits"
          value={`${outfitStats.profitableOutfits}/${outfitStats.totalOutfits}`}
          accent="#10b981"
          icon={Platform.OS !== 'web' ? <Ionicons name="trending-up-outline" size={16} color="#10b981" /> : '📈'}
        />
        <Card
          title="Avg Outfit ROI"
          value={formatCurrency(outfitStats.avgEarningsPerOutfit)}
          accent="#f59e0b"
          icon={Platform.OS !== 'web' ? <Ionicons name="analytics-outline" size={16} color="#f59e0b" /> : '📊'}
        />
        <Card
          title="Transactions"
          value={`${snapshot?.counts?.transactions || 0}`}
          accent="#9b5de5"
          icon={Platform.OS !== 'web' ? <Ionicons name="swap-vertical-outline" size={16} color="#9b5de5" /> : '🔢'}
        />
        <Card
          title="Client-linked Tx"
          value={`${snapshot?.counts?.clientLinkedTx || 0}`}
          accent="#9b5de5"
          icon={Platform.OS !== 'web' ? <Ionicons name="link-outline" size={16} color="#9b5de5" /> : '🔗'}
        />
        <Card
          title="Data"
          value={Platform.OS === 'web' ? 'Web storage' : 'SQLite'}
          accent="#4444ff"
          icon={Platform.OS !== 'web' ? <Ionicons name="cloud-outline" size={16} color="#4444ff" /> : '🗄️'}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Export All" variant="ghost" onPress={handleExportAll} />
            <Button label="Import All" variant="ghost" onPress={handleImportAll} />
          </View>
          {dataMsg ? <Text style={{ color: '#ccc', marginTop: 6 }}>{dataMsg}</Text> : null}
        </Card>
        <Card
          title="Top Client"
          value={renderTopClient(snapshot, clients)}
          accent="#06d6a0"
          icon={Platform.OS !== 'web' ? <Ionicons name="person-outline" size={16} color="#06d6a0" /> : '🧑'}
        >
          {snapshot?.topClient ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="View Client" variant="ghost" onPress={() => handleViewClient(snapshot.topClient.clientId)} />
              <Button label="View Money" variant="ghost" onPress={() => handleViewMoney(snapshot.topClient.clientId)} />
            </View>
          ) : null}
        </Card>
      </View>
      {/* Top Clients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Clients</Text>
        <View style={styles.clientList}>
          {snapshot?.byClient?.slice(0, 5).map((c, i) => (
            <View key={i} style={styles.clientRow}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{getClientName(clients, c.clientId) || 'Unknown'}</Text>
                <Text style={styles.clientEarnings}>{formatCurrency(c.net)}</Text>
              </View>
              <View style={styles.clientActions}>
                <TouchableOpacity onPress={() => handleViewClient(c.clientId)} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={`View client ${getClientName(clients, c.clientId) || 'details'}`}>
                  <Text style={styles.actionText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleViewMoney(c.clientId)} style={styles.actionButton} accessibilityRole="button" accessibilityLabel={`View money for ${getClientName(clients, c.clientId) || 'client'}`}>
                  <Text style={styles.actionText}>Money</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Top Earning Outfits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Earning Outfits</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Analytics')} 
            style={styles.viewAllButton}
            accessibilityRole="button"
            accessibilityLabel="View analytics"
          >
            <Text style={styles.viewAllText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.outfitList}>
          {topOutfits.map((outfit, i) => (
            <View key={outfit.id} style={styles.outfitRow}>
              <View style={styles.outfitInfo}>
                <Text style={styles.outfitName}>{outfit.name}</Text>
                <View style={styles.outfitMetrics}>
                  <Text style={styles.outfitIncome}>+{formatCurrency(outfit.income || 0)}</Text>
                <Text style={styles.outfitExpense}>-{formatCurrency(outfit.expense || 0)}</Text>
                <Text style={[styles.outfitNet, { color: (outfit.net || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                  {formatCurrency(outfit.net || 0)}
                  </Text>
                </View>
                <Text style={styles.outfitWears}>
                  {outfit.wearCount || 0} wears • {outfit.transactionCount || 0} transactions
                </Text>
              </View>
              <View style={styles.outfitRank}>
                <Text style={styles.rankNumber}>#{i + 1}</Text>
              </View>
            </View>
          ))}
          {topOutfits.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No outfit earnings data yet</Text>
              <Text style={styles.emptySubtext}>Start linking transactions to outfits to see performance</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.note}>
        {Platform.OS === 'web' ? 'Using web localStorage fallback.' : 'Using on-device SQLite database.'}
      </Text>
      {refreshing && (
        <View style={styles.refreshOverlay} pointerEvents="none">
          <View style={styles.refreshOverlayInner}>
            <Ionicons name="refresh" size={24} color={Colors.text} />
            <Text style={styles.refreshOverlayText}>Refreshing...</Text>
          </View>
        </View>
      )}
    </View>
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
    backgroundColor: Colors.background,
    padding: 16,
  },
  heading: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.buttonGhost,
  },
  lastUpdatedText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  note: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 12,
  },
  refreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshOverlayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  refreshOverlayText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: '#f5f5f5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  clientList: {
    gap: 8,
  },
  clientRow: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientEarnings: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#f5f5f5',
    fontSize: 12,
    fontWeight: '600',
  },
  outfitList: {
    gap: 12,
  },
  outfitRow: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  outfitMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  outfitIncome: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  outfitExpense: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  outfitNet: {
    fontSize: 14,
    fontWeight: '700',
  },
  outfitWears: {
    color: '#999',
    fontSize: 12,
  },
  outfitRank: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  rankNumber: {
    color: '#ffd166',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAllText: {
    color: '#06d6a0',
    fontSize: 12,
    fontWeight: '600',
  },
});