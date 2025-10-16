import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { openDb, getAllClients, insertClient, updateClient, deleteClient, getKpiSnapshot, getClientPerformance, getRecentShifts, getClientTransactions, insertTransaction } from '../lib/db';
import { seedPerformanceForExistingClients } from '../lib/mockData';
import { GradientButton, ModernInput, GradientCard, Toast } from '../components/UI';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency, isValidE164, toE164, prettyPhone } from '../utils/formatters';
import { secureGet, secureSet } from '../lib/secureStorage';
import { Colors } from '../constants/Colors';
import { buildApiEndpoint, fetchWithTimeout, getAuthToken } from '../lib/http';
import webSocketService from '../services/WebSocketService';
import { BACKEND_URL } from '../lib/config';

const { width } = Dimensions.get('window');

export default function Clients({ route }) {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
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
  const [canSeed, setCanSeed] = useState(false);
  
  // Transaction history state
  const [clientTransactions, setClientTransactions] = useState([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Messaging and calling state
  const [messageText, setMessageText] = useState('');
  const [conversationMessages, setConversationMessages] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    const db = openDb();
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

  // Determine if current user is allowed to seed mock performance (User 1 only)
  useEffect(() => {
    (async () => {
      try {
        let user = await secureGet('userData');
        if (!user && typeof window !== 'undefined' && window.localStorage) {
          try {
            const raw = window.localStorage.getItem('userData');
            user = raw ? JSON.parse(raw) : null;
          } catch {}
        }
        const uid = user?.id || null;
        setCanSeed(String(uid) === '1');
      } catch {
        setCanSeed(false);
      }
    })();
  }, []);

  // Load persisted clients on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const userRaw = window.localStorage.getItem('userData');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || null;
        const key = userId ? `clients_${userId}` : 'clients';
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved)) setItems(saved);
        }
      } catch {}
    }
  }, []);

  // Open detail when navigated with clientId or web-persisted id
  useEffect(() => {
    const clientIdParam = route?.params?.clientId;
    let clientId = clientIdParam;
    if (!clientId && typeof window !== 'undefined' && window.localStorage) {
      try {
        const userRaw = window.localStorage.getItem('userData');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || null;
        const key = userId ? `clientDetailId_${userId}` : 'clientDetailId';
        const saved = window.localStorage.getItem(key);
        if (saved) clientId = saved;
      } catch {
        try { clientId = window.localStorage.getItem('clientDetailId') || clientId; } catch {}
      }
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

  async function handleSeedPerformance() {
    try {
      setToast({ visible: true, type: 'info', message: 'Generating mock performance…' });
      await seedPerformanceForExistingClients({ months: 4 });
      const db = openDb();
      const [clients, s] = await Promise.all([
        getAllClients(db),
        getKpiSnapshot(db),
      ]);
      setItems(Array.isArray(clients) ? clients : []);
      setSnapshot(s || { byClient: [] });
      setToast({ visible: true, type: 'success', message: 'Performance data generated.' });
    } catch (e) {
      console.warn('Seeding performance failed', e);
      setToast({ visible: true, type: 'error', message: 'Failed to generate performance data.' });
    }
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
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `clients_${userId}` : 'clients';
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
          }
        } else {
          const id = `c_${Date.now()}`;
          const next = [{ id, name, contact, valueScore: score, tags, notes }, ...items];
          setItems(next);
          try {
            const userRaw = window.localStorage.getItem('userData');
            const user = userRaw ? JSON.parse(userRaw) : null;
            const userId = user?.id || user?.email || null;
            const key = userId ? `clients_${userId}` : 'clients';
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
          }
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
        try {
          const userRaw = window.localStorage.getItem('userData');
          const user = userRaw ? JSON.parse(userRaw) : null;
          const userId = user?.id || user?.email || null;
          const key = userId ? `clients_${userId}` : 'clients';
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          try { window.localStorage.setItem('clients', JSON.stringify(next)); } catch {}
        }
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

  function openDetail(c) {
    setDetail(c);
    setDetailOpen(true);
    // Load transaction history for this client
    loadClientTransactions(c.id);
    // Load messaging and call history
    const phone = extractPhoneNumber(c.contact);
    if (phone) {
      loadConversation(phone);
      loadCallHistory(phone);
      ensureSocketConnected();
    }
  }

  async function loadClientTransactions(clientId) {
    const db = openDb();
    try {
      if (db) {
        const transactions = await getClientTransactions(db, clientId, 90); // Last 90 days
        setClientTransactions(transactions);
      } else {
        // Web fallback - could load from localStorage if needed
        setClientTransactions([]);
      }
    } catch (e) {
      console.warn('Failed to load client transactions', e);
      setClientTransactions([]);
    }
  }

  function extractPhoneNumber(contactValue) {
    try {
      const raw = String(contactValue || '').trim();
      const digits = raw.replace(/[^0-9+]/g, '');
      return digits || null;
    } catch {
      return null;
    }
  }

  async function loadConversation(phoneNumber) {
    try {
      setLoadingConversation(true);
      const token = await getAuthToken();
      const url = buildApiEndpoint(`conversations/${encodeURIComponent(phoneNumber)}`);
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }, 12000);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch conversation');
      }
      setConversationMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (e) {
      console.warn('Conversation load failed', e);
      setConversationMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  }

  async function loadCallHistory(phoneNumber) {
    try {
      setLoadingCalls(true);
      const token = await getAuthToken();
      const url = buildApiEndpoint(`calls/history/${encodeURIComponent(phoneNumber)}`);
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }, 12000);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch call history');
      }
      setCallLogs(Array.isArray(data?.calls) ? data.calls : []);
    } catch (e) {
      console.warn('Call history load failed', e);
      setCallLogs([]);
    } finally {
      setLoadingCalls(false);
    }
  }

  async function sendSms() {
    try {
      if (!detail) return;
      const rawPhone = extractPhoneNumber(detail.contact);
      const phone = toE164(rawPhone || '');
      if (!phone || !isValidE164(phone)) {
        setToast({ visible: true, type: 'error', message: 'Client phone must be valid E.164' });
        return;
      }
      const body = String(messageText || '').trim();
      if (!body) {
        setToast({ visible: true, type: 'error', message: 'Message cannot be empty' });
        return;
      }
      setSending(true);
      const token = await getAuthToken();
      const url = buildApiEndpoint('send-sms');
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ to: phone, body })
      }, 15000);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send SMS');
      }
      setToast({ visible: true, type: 'success', message: 'Message sent' });
      setMessageText('');
      // Optimistically append
      setConversationMessages((prev) => [
        ...prev,
        {
          id: data.messageId || `local_${Date.now()}`,
          body,
          from: 'me',
          to: phone,
          status: data.status || 'queued',
          timestamp: new Date().toISOString(),
          direction: 'outbound'
        }
      ]);
    } catch (e) {
      console.warn('Send SMS failed', e);
      setToast({ visible: true, type: 'error', message: 'Failed to send message' });
    } finally {
      setSending(false);
    }
  }

  async function startMaskedCall(record = false) {
    try {
      if (!detail) return;
      const rawPhone = extractPhoneNumber(detail.contact);
      const phone = toE164(rawPhone || '');
      if (!phone || !isValidE164(phone)) {
        setToast({ visible: true, type: 'error', message: 'Client phone must be valid E.164' });
        return;
      }
      setCalling(true);
      const token = await getAuthToken();
      const url = buildApiEndpoint('calls/start');
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ clientPhone: phone, record })
      }, 20000);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to start call');
      }
      setToast({ visible: true, type: 'success', message: 'Call started' });
      // Reload call history shortly after
      setTimeout(() => loadCallHistory(phone), 2000);
    } catch (e) {
      console.warn('Start call failed', e);
      setToast({ visible: true, type: 'error', message: 'Failed to start call' });
    } finally {
      setCalling(false);
    }
  }

  const socketListenersRef = React.useRef(null);
  const [showPrivacyBanner, setShowPrivacyBanner] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dismissed = await secureGet('privacy_banner_dismissed');
        if (!cancelled) setShowPrivacyBanner(!(dismissed === 'true'));
      } catch {
        if (!cancelled) setShowPrivacyBanner(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    return () => {
      // Cleanup any registered socket listeners on unmount
      const l = socketListenersRef.current;
      if (l) {
        try {
          webSocketService.off('new_message', l.onNewMessage);
          webSocketService.off('message_received', l.onMessageReceived);
          webSocketService.off('message_sent', l.onMessageSent);
          webSocketService.off('message_status_update', l.onMessageStatusUpdate);
          webSocketService.off('call_status_update', l.onCallStatus);
        } catch {}
      }
      socketListenersRef.current = null;
    };
  }, []);

  function ensureSocketConnected() {
    try {
      if (!webSocketService.isConnected()) {
        webSocketService.connect(BACKEND_URL);
      }
      // Remove previous listeners to avoid duplicates
      const existing = socketListenersRef.current;
      if (existing) {
        try {
          webSocketService.off('new_message', existing.onNewMessage);
          webSocketService.off('message_received', existing.onMessageReceived);
          webSocketService.off('message_sent', existing.onMessageSent);
          webSocketService.off('message_status_update', existing.onMessageStatusUpdate);
          webSocketService.off('call_status_update', existing.onCallStatus);
        } catch {}
        socketListenersRef.current = null;
      }
      // Subscribe to events
      const onNewMessage = (data) => {
        if (!detail) return;
        const rawPhone = extractPhoneNumber(detail.contact);
        const phone = toE164(rawPhone || '');
        // Append if relevant to current conversation
        if (data?.to === phone || data?.from === phone) {
          setConversationMessages((prev) => [...prev, {
            id: data.messageId || `socket_${Date.now()}`,
            body: data.body,
            from: data.from || 'client',
            to: data.to || phone,
            status: data.status || 'received',
            timestamp: data.timestamp || new Date().toISOString(),
            direction: data.sender === 'dancer' ? 'outbound' : 'inbound'
          }]);
        }
      };
      const onMessageReceived = onNewMessage;
      const onMessageSent = onNewMessage;
      const onMessageStatusUpdate = (payload) => {
        try {
          // payload: { messageId, status, to, from, timestamp }
          const next = (prev) => prev.map(m => {
            if (!m) return m;
            const matchById = payload?.messageId && m.id === payload.messageId;
            const matchByToFrom = payload?.to && payload?.from && ((m.to === payload.to && m.from === payload.from) || (m.to === payload.from && m.from === payload.to));
            if (matchById || matchByToFrom) {
              return { ...m, status: payload.status || m.status, timestamp: payload.timestamp || m.timestamp };
            }
            return m;
          });
          setConversationMessages(next);
        } catch {}
      };
      const onCallStatus = (data) => {
        // We could update UI based on call status
      };
      webSocketService.on('new_message', onNewMessage);
      webSocketService.on('message_received', onMessageReceived);
      webSocketService.on('message_sent', onMessageSent);
      webSocketService.on('message_status_update', onMessageStatusUpdate);
      webSocketService.on('call_status_update', onCallStatus);
      socketListenersRef.current = { onNewMessage, onMessageReceived, onMessageSent, onMessageStatusUpdate, onCallStatus };
    } catch (e) {
      console.warn('Socket connection failed', e);
    }
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
        // No database available - set empty performance data
        setPerfData({ clientId, days, shiftCount: 0, totalEarnings: 0, avgEarnings: 0, bestDay: null, bestDayAvg: 0, earningsHistory: [] });
        setPerfRecentShifts([]);
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
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary, Colors.surfaceAccent]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.gradientPrimary, Colors.gradientSecondary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="people" size={32} color={Colors.white} />
              <View>
                <Text style={styles.heading}>Clients & Messaging</Text>
                <Text style={styles.subheading}>Manage your client relationships</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Colors.spacing.sm }}>
            <GradientButton
              title="Add Client"
              variant="accent"
              size="small"
              onPress={() => { resetForm(); setAddOpen(true); }}
              style={styles.addButton}
            />
            {canSeed && (
              <GradientButton
                title="Generate Performance"
                variant="primary"
                size="small"
                onPress={handleSeedPerformance}
              />
            )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Client List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
        ListEmptyComponent={() => (
          <GradientCard variant="minimal" style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Clients Yet</Text>
              <Text style={styles.emptySubtitle}>Add your first client to start tracking relationships and earnings</Text>
              <GradientButton
                title="Add Your First Client"
                variant="primary"
                onPress={() => { resetForm(); setAddOpen(true); }}
                style={styles.emptyButton}
              />
            </View>
          </GradientCard>
        )}
      />

      {/* Add/Edit Modal */}
      {addOpen && (
        <View style={styles.modalOverlay}>
          <GradientCard variant="glow" style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editId ? 'Edit Client' : 'Add Client'}</Text>
                <TouchableOpacity 
                  onPress={() => { setAddOpen(false); resetForm(); }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <ModernInput 
                  label="Client Name"
                  placeholder="Enter client name" 
                  value={name} 
                  onChangeText={setName}
                  variant="glow"
                />
                <ModernInput 
                  label="Contact Information"
                  placeholder="Phone, email, or social media" 
                  value={contact} 
                  onChangeText={setContact} 
                />
                <ModernInput 
                  label="Value Score (1-10)"
                  placeholder="Rate client value (e.g. 8)" 
                  value={valueScore} 
                  onChangeText={setValueScore} 
                  keyboardType="numeric" 
                />
                <ModernInput 
                  label="Tags"
                  placeholder="VIP, Regular, High-Spender (comma-separated)" 
                  value={tagsStr} 
                  onChangeText={setTagsStr} 
                />
                <ModernInput 
                  label="Notes"
                  placeholder="Additional notes about this client" 
                  value={notes} 
                  onChangeText={setNotes} 
                />
              </View>
              
              {editId && (
                <GradientCard variant="accent" style={styles.transactionSection}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.sectionTitle}>Client Transactions</Text>
                    <Ionicons 
                      name="card-outline" 
                      size={20} 
                      color={Colors.accent} 
                    />
                  </View>
                  
                  <View style={styles.transactionRedirect}>
                    <Text style={styles.redirectText}>
                      Use the centralized Transaction Manager to add income and expenses for this client.
                    </Text>
                    <GradientButton 
                      title="Go to Transaction Manager" 
                      variant="primary" 
                      onPress={() => navigation.navigate('Transactions')}
                      style={styles.redirectButton}
                    />
                  </View>
                </GradientCard>
              )}
              
              <View style={styles.modalActions}>
                <GradientButton 
                  title="Cancel" 
                  variant="secondary" 
                  onPress={() => { setAddOpen(false); resetForm(); }}
                  style={styles.cancelButton}
                />
                <GradientButton 
                  title={editId ? 'Save Changes' : 'Add Client'} 
                  variant="primary" 
                  onPress={handleSave}
                  style={styles.saveButton}
                />
              </View>
            </ScrollView>
          </GradientCard>
        </View>
      )}

      {/* Detail Modal */}
      {detailOpen && detail && (
        <View style={styles.modalOverlay}>
          <GradientCard variant="glow" style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Details</Text>
              <TouchableOpacity 
                onPress={() => { setDetailOpen(false); setDetail(null); }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailContent}>
              <View style={styles.clientHeader}>
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={32} color={Colors.primary} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{detail.name}</Text>
                  <Text style={styles.clientContact}>{prettyPhone(toE164(detail.contact || '') || detail.contact) || 'No contact info'}</Text>
                  {typeof detail.valueScore !== 'undefined' && detail.valueScore !== null && (
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreLabel}>Value Score:</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreValue}>{detail.valueScore}/10</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {Array.isArray(detail.tags) && detail.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  <Text style={styles.tagsLabel}>Tags:</Text>
                  <View style={styles.tagsList}>
                    {detail.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {detail.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{detail.notes}</Text>
                </View>
              )}

              {/* Messaging Section */}
              {toE164(extractPhoneNumber(detail.contact) || '') ? (
                <GradientCard variant="minimal" style={styles.messagingCard}>
                  <Text style={styles.sectionTitle}>Messaging</Text>
                  <View style={styles.composeRow}>
                    <View style={{ flex: 1 }}>
                      <ModernInput 
                        label="Compose Message"
                        placeholder="Type your message"
                        value={messageText}
                        onChangeText={setMessageText}
                      />
                    </View>
                    <GradientButton 
                      title={sending ? 'Sending…' : 'Send SMS'}
                      variant="primary"
                      onPress={sendSms}
                      style={styles.composeButton}
                    />
                  </View>
                  <View style={styles.historyContainerAlt}>
                    <Text style={styles.historyTitle}>Conversation History</Text>
                    {loadingConversation ? (
                      <Text style={styles.loadingText}>Loading messages…</Text>
                    ) : (
                      <View style={styles.messageList}>
                        {conversationMessages && conversationMessages.length > 0 ? (
                          conversationMessages.slice(-20).map((m) => (
                            <View key={m.id} style={[styles.messageItem, m.direction === 'outbound' ? styles.messageOutbound : styles.messageInbound]}>
                              <Text style={styles.messageBody}>{m.body}</Text>
                              <Text style={styles.messageMeta}>{new Date(m.timestamp).toLocaleString()} · {m.direction} · {m.status || '—'}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyTransactionText}>No messages yet</Text>
                        )}
                      </View>
                    )}
                  </View>
                </GradientCard>
              ) : (
                <GradientCard variant="minimal" style={styles.messagingCard}>
                  <Text style={styles.sectionTitle}>Messaging</Text>
                  <Text style={styles.emptyTransactionText}>Add a valid phone number to message this client.</Text>
                </GradientCard>
              )}

              {/* Privacy banner below header */}
              {showPrivacyBanner && (
                <GradientCard variant="minimal" style={styles.privacyBanner}>
                  <Text style={styles.privacyText}>Privacy: Messages and calls sync via Twilio. Learn more in Settings.</Text>
                  <TouchableOpacity onPress={async () => { try { await secureSet('privacy_banner_dismissed', 'true'); } catch {} setShowPrivacyBanner(false); }}>
                    <Text style={styles.privacyDismiss}>Dismiss</Text>
                  </TouchableOpacity>
                </GradientCard>
              )}

              {(function() {
                try {
                  const row = (snapshot?.byClient || []).find(r => r.clientId === detail.id);
                  if (!row) return null;
                  return (
                    <GradientCard variant="accent" style={styles.earningsCard}>
                      <Text style={styles.earningsTitle}>Financial Summary</Text>
                      <View style={styles.earningsGrid}>
                        <View style={styles.earningsItem}>
                          <Text style={styles.earningsLabel}>Net Earnings</Text>
                          <Text style={[styles.earningsValue, { color: row.net >= 0 ? Colors.success : Colors.error }]}>
                            {formatCurrency(row.net)}
                          </Text>
                        </View>
                        <View style={styles.earningsItem}>
                          <Text style={styles.earningsLabel}>Total Income</Text>
                          <Text style={[styles.earningsValue, { color: Colors.success }]}>
                            {formatCurrency(row.income || 0)}
                          </Text>
                        </View>
                        <View style={styles.earningsItem}>
                          <Text style={styles.earningsLabel}>Total Expenses</Text>
                          <Text style={[styles.earningsValue, { color: Colors.error }]}>
                            {formatCurrency(row.expense || 0)}
                          </Text>
                        </View>
                      </View>
                    </GradientCard>
                  );
                } catch { return null; }
              })()}

              {/* Call Logs Section */}
              {toE164(extractPhoneNumber(detail.contact) || '') && (
                <GradientCard variant="minimal" style={styles.callLogsCard}>
                  <View style={styles.transactionHistoryHeader}>
                    <Text style={styles.sectionTitle}>Call Logs ({callLogs.length})</Text>
                    <Ionicons 
                      name={loadingCalls ? "refresh" : "call"}
                      size={20}
                      color={Colors.accent}
                    />
                  </View>
                  {loadingCalls ? (
                    <Text style={styles.loadingText}>Loading call history…</Text>
                  ) : (
                    <View style={styles.callLogsList}>
                      {callLogs.length > 0 ? (
                        callLogs.slice(-10).map((c) => (
                          <View key={c.sid} style={styles.callLogItem}>
                            <Text style={styles.callLogStatus}>{c.status}</Text>
                            <Text style={styles.callLogMeta}>{new Date(c.startTime).toLocaleString()} · {c.direction} {c.duration ? `· ${c.duration}s` : ''}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyTransactionText}>No recent calls</Text>
                      )}
                    </View>
                  )}
                </GradientCard>
              )}

              {/* Transaction History Section */}
              <GradientCard variant="minimal" style={styles.transactionHistoryCard}>
                <TouchableOpacity 
                  style={styles.transactionHistoryHeader}
                  onPress={() => setShowTransactionHistory(!showTransactionHistory)}
                >
                  <Text style={styles.sectionTitle}>Recent Transactions ({clientTransactions.length})</Text>
                  <Ionicons 
                    name={showTransactionHistory ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={Colors.accent} 
                  />
                </TouchableOpacity>
                
                {showTransactionHistory && (
                  <View style={styles.transactionHistoryList}>
                    {clientTransactions.length > 0 ? (
                      clientTransactions.slice(0, 10).map((transaction, index) => (
                        <View key={transaction.id || index} style={styles.transactionHistoryItem}>
                          <View style={styles.transactionHistoryLeft}>
                            <Text style={styles.transactionHistoryCategory}>{transaction.category}</Text>
                            <Text style={styles.transactionHistoryDate}>
                              {new Date(transaction.date).toLocaleDateString()}
                            </Text>
                            {transaction.note && (
                              <Text style={styles.transactionHistoryNote}>{transaction.note}</Text>
                            )}
                          </View>
                          <Text style={[
                            styles.transactionHistoryAmount,
                            { color: transaction.type === 'income' ? Colors.success : Colors.error }
                          ]}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyTransactionText}>No recent transactions</Text>
                    )}
                  </View>
                )}
              </GradientCard>
            </View>

            <View style={styles.modalActions}>
              <GradientButton 
                title="View Shifts" 
                variant="secondary" 
                onPress={() => {
                  if (!detail?.id) return;
                  if (typeof window !== 'undefined' && window.localStorage) {
                    try {
                      const userRaw = window.localStorage.getItem('userData');
                      const user = userRaw ? JSON.parse(userRaw) : null;
                      const userId = user?.id || user?.email || null;
                      const key = userId ? `clientFilterId_${userId}` : 'clientFilterId';
                      window.localStorage.setItem(key, detail.id);
                    } catch {
                      try { window.localStorage.setItem('clientFilterId', detail.id); } catch {}
                    }
                  }
                  try { navigation.navigate('Shifts', { clientId: detail.id }); } catch {}
                }}
                style={styles.actionButton}
              />
              {toE164(extractPhoneNumber(detail?.contact) || '') && (
                <GradientButton
                  title={calling ? 'Calling…' : 'Call Client'}
                  variant="accent"
                  onPress={() => startMaskedCall(false)}
                  style={styles.actionButton}
                />
              )}
              <GradientButton 
                title="Edit Client" 
                variant="primary" 
                onPress={() => { setDetailOpen(false); openEdit(detail); }}
                style={styles.actionButton}
              />
            </View>
          </GradientCard>
        </View>
      )}

      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onAction={() => setToast({ visible: false, message: '', type: 'info' })}
        actionLabel="Dismiss"
      />
    </LinearGradient>
  );
}



function ClientRow({ item, onEdit, onDelete, onView, onPerformance, expanded, perfData, perfRecentShifts, onSetAnalyticsFilter }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);
  
  const tags = item.tags || [];
  const snapshot = {}; // This would come from props in a real implementation
  
  return (
    <Animated.View style={[{ opacity: fade }]}>
      <GradientCard variant="warm" style={styles.clientCard}>
        <View style={styles.clientRowContent}>
          <View style={styles.clientMainInfo}>
            <View style={styles.clientHeader}>
              <View style={styles.clientAvatar}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{item.name}</Text>
                  <Text style={styles.clientContact}>{prettyPhone(toE164(item.contact || '') || item.contact) || 'No contact info'}</Text>
                {typeof item.valueScore !== 'undefined' && item.valueScore !== null && (
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>Score:</Text>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreValue}>{item.valueScore}/10</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <View style={styles.tagsList}>
                  {tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {tags.length > 3 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>+{tags.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {item.notes && (
              <Text style={styles.clientNotes} numberOfLines={2}>{item.notes}</Text>
            )}

            <View style={styles.clientActions}>
              <GradientButton
                title={expanded ? 'Hide Performance' : 'Performance'}
                variant="coral"
                size="small"
                onPress={onPerformance}
                style={styles.actionButton}
              />
              <GradientButton
                title="Analytics"
                variant="warm"
                size="small"
                onPress={onSetAnalyticsFilter}
                style={styles.actionButton}
              />
            </View>

            {expanded && (
              <GradientCard variant="coral" style={styles.performanceContainer}>
                {perfData ? (
                  <>
                    <Text style={styles.performanceTitle}>Performance Overview</Text>
                    <View style={styles.performanceMetrics}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{perfData.shiftCount || 0}</Text>
                        <Text style={styles.metricLabel}>Shifts</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{formatCurrency(perfData.totalEarnings || 0)}</Text>
                        <Text style={styles.metricLabel}>Total</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{formatCurrency(perfData.avgEarnings || 0)}</Text>
                        <Text style={styles.metricLabel}>Avg/Shift</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {typeof perfData.bestDay === 'number' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][perfData.bestDay] : '—'}
                        </Text>
                        <Text style={styles.metricLabel}>Best Day</Text>
                      </View>
                    </View>

                    {Array.isArray(perfData?.earningsHistory) && perfData.earningsHistory.length > 0 && (
                      <View style={styles.historyContainer}>
                        <Text style={styles.historyTitle}>Earnings History</Text>
                        <View style={styles.historyChart}>
                          {perfData.earningsHistory.slice(0, 12).map((h, idx) => (
                            <View key={idx} style={styles.historyBar}>
                              <View style={[
                                styles.historyFill, 
                                { 
                                  height: Math.min(48, Math.max(4, (h.value || 0) / (perfData.avgEarnings || 1) * 12)),
                                  backgroundColor: Colors.gradientPrimary
                                }
                              ]} />
                              <Text style={styles.historyLabel}>{h.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {Array.isArray(perfRecentShifts) && perfRecentShifts.length > 0 && (
                      <View style={styles.recentShiftsContainer}>
                        <Text style={styles.recentShiftsTitle}>Recent Shifts</Text>
                        {perfRecentShifts.slice(0, 5).map((s) => (
                          <View key={s.id || `${s.start}-${s.venueId}`} style={styles.shiftRow}>
                            <Text style={styles.shiftDate}>
                              {(s.start || '').slice(0,16).replace('T',' ')}
                            </Text>
                            <Text style={styles.shiftEarnings}>
                              {formatCurrency(s.earnings || 0)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>No performance data available</Text>
                )}
              </GradientCard>
            )}
          </View>

          <View style={styles.clientActionButtons}>
            <TouchableOpacity onPress={onView} style={styles.iconButton}>
              <Ionicons name="eye" size={20} color={Colors.primary} />
              <Text style={styles.iconButtonText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
              <Ionicons name="create" size={20} color={Colors.accent} />
              <Text style={styles.iconButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
              <Ionicons name="trash" size={20} color={Colors.error} />
              <Text style={styles.iconButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  addButton: {
    minWidth: 100,
  },
  listContainer: {
    paddingHorizontal: Colors.spacing.lg,
    paddingBottom: Colors.spacing.xl,
  },
  separator: { 
    height: Colors.spacing.md 
  },
  emptyCard: {
    marginTop: Colors.spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Colors.spacing.xl,
    gap: Colors.spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.lg,
    fontWeight: Colors.typography.fontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.md,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Colors.spacing.md,
  },
  clientCard: {
    marginBottom: Colors.spacing.sm,
  },
  clientRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Colors.spacing.md,
  },
  clientMainInfo: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.md,
    marginBottom: Colors.spacing.sm,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: Colors.borderRadius.full,
    backgroundColor: 'rgba(177, 156, 217, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.lg,
    fontWeight: Colors.typography.fontWeight.bold,
    marginBottom: 2,
  },
  clientContact: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.sm,
    marginBottom: Colors.spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Colors.spacing.xs,
  },
  scoreLabel: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
  },
  scoreBadge: {
    backgroundColor: Colors.gradientPrimary,
    paddingHorizontal: Colors.spacing.xs,
    paddingVertical: 2,
    borderRadius: Colors.borderRadius.sm,
  },
  scoreValue: {
    color: Colors.white,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  tagsContainer: {
    marginBottom: Colors.spacing.sm,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Colors.spacing.xs,
  },
  tag: {
    backgroundColor: 'rgba(199, 255, 0, 0.2)',
    paddingHorizontal: Colors.spacing.sm,
    paddingVertical: 4,
    borderRadius: Colors.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(199, 255, 0, 0.3)',
  },
  tagText: {
    color: Colors.secondary,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  clientNotes: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    lineHeight: 18,
    marginBottom: Colors.spacing.sm,
  },
  clientActions: {
    flexDirection: 'row',
    gap: Colors.spacing.sm,
    marginBottom: Colors.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  clientActionButtons: {
    flexDirection: 'column',
    gap: Colors.spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 50,
    borderRadius: Colors.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconButtonText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  performanceContainer: {
    marginTop: Colors.spacing.sm,
  },
  performanceTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    marginBottom: Colors.spacing.md,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Colors.spacing.sm,
    marginBottom: Colors.spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: Colors.spacing.sm,
    borderRadius: Colors.borderRadius.md,
  },
  metricValue: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.bold,
    marginBottom: 2,
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
  },
  historyContainer: {
    marginBottom: Colors.spacing.md,
  },
  historyTitle: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
    marginBottom: Colors.spacing.sm,
  },
  historyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: Colors.spacing.sm,
  },
  historyBar: {
    alignItems: 'center',
    flex: 1,
  },
  historyFill: {
    width: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginBottom: 4,
  },
  historyLabel: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  recentShiftsContainer: {
    marginTop: Colors.spacing.sm,
  },
  recentShiftsTitle: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
    marginBottom: Colors.spacing.sm,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Colors.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  shiftDate: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.xs,
  },
  shiftEarnings: {
    color: Colors.success,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  noDataText: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalSheet: {
    width: width * 0.9,
    maxHeight: '85%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Colors.spacing.lg,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.xl,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  closeButton: {
    padding: Colors.spacing.xs,
  },
  formSection: {
    gap: Colors.spacing.md,
    marginBottom: Colors.spacing.lg,
  },
  transactionSection: {
    marginBottom: Colors.spacing.lg,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Colors.spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  transactionForm: {
    gap: Colors.spacing.md,
  },
  transactionTypeButtons: {
    flexDirection: 'row',
    gap: Colors.spacing.sm,
  },
  typeButton: {
    flex: 1,
  },
  addTransactionButton: {
    marginTop: Colors.spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Colors.spacing.md,
    marginTop: Colors.spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  detailContent: {
    gap: Colors.spacing.lg,
  },
  clientInfo: {
    flex: 1,
  },
  tagsLabel: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
    marginBottom: Colors.spacing.xs,
  },
  notesContainer: {
    marginTop: Colors.spacing.sm,
  },
  notesLabel: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
    marginBottom: Colors.spacing.xs,
  },
  transactionHistoryCard: {
    marginTop: Colors.spacing.md,
  },
  transactionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Colors.spacing.md,
  },
  transactionHistoryList: {
    gap: Colors.spacing.sm,
  },
  transactionHistoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Colors.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionHistoryLeft: {
    flex: 1,
    marginRight: Colors.spacing.md,
  },
  transactionHistoryCategory: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  transactionHistoryDate: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.xs,
    marginTop: Colors.spacing.xs,
  },
  transactionHistoryNote: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    marginTop: Colors.spacing.xs,
    fontStyle: 'italic',
  },
  transactionHistoryAmount: {
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  emptyTransactionText: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    textAlign: 'center',
    paddingVertical: Colors.spacing.lg,
  },
  notesText: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.sm,
    lineHeight: 20,
  },
  earningsCard: {
    marginTop: Colors.spacing.md,
  },
  earningsTitle: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.semibold,
    marginBottom: Colors.spacing.md,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Colors.spacing.sm,
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: Colors.spacing.md,
    borderRadius: Colors.borderRadius.md,
  },
  earningsLabel: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: Colors.typography.fontSize.md,
    fontWeight: Colors.typography.fontWeight.bold,
  },
  transactionRedirect: {
    padding: Colors.spacing.md,
    alignItems: 'center',
  },
  redirectText: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Colors.spacing.md,
    lineHeight: 20,
  },
  redirectButton: {
    minWidth: 200,
  },
  actionButton: {
    flex: 1,
  },
  // Messaging styles
  messagingCard: {
    marginTop: Colors.spacing.md,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Colors.spacing.sm,
    marginTop: Colors.spacing.sm,
  },
  composeButton: {
    minWidth: 120,
  },
  historyContainerAlt: {
    marginTop: Colors.spacing.md,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.sm,
    fontStyle: 'italic',
  },
  messageList: {
    gap: Colors.spacing.sm,
  },
  messageItem: {
    padding: Colors.spacing.sm,
    borderRadius: Colors.borderRadius.md,
  },
  messageInbound: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageOutbound: {
    backgroundColor: 'rgba(199, 255, 0, 0.12)',
  },
  messageBody: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.sm,
  },
  messageMeta: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    marginTop: 4,
  },
  privacyBanner: {
    marginTop: Colors.spacing.md,
    paddingVertical: Colors.spacing.sm,
    paddingHorizontal: Colors.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Colors.spacing.sm,
  },
  privacyText: {
    color: Colors.textSecondary,
    fontSize: Colors.typography.fontSize.xs,
    flex: 1,
  },
  privacyDismiss: {
    color: Colors.accent,
    fontSize: Colors.typography.fontSize.xs,
    fontWeight: Colors.typography.fontWeight.semibold,
  },
  // Call logs styles
  callLogsCard: {
    marginTop: Colors.spacing.md,
  },
  callLogsList: {
    gap: Colors.spacing.sm,
  },
  callLogItem: {
    paddingVertical: Colors.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  callLogStatus: {
    color: Colors.text,
    fontSize: Colors.typography.fontSize.sm,
    fontWeight: Colors.typography.fontWeight.medium,
  },
  callLogMeta: {
    color: Colors.textMuted,
    fontSize: Colors.typography.fontSize.xs,
    marginTop: 2,
  },
});