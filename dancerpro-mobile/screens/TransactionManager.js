import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { openDb, getRecentTransactions, computeTransactionTotals, insertTransaction, deleteTransaction, getAllClients, getAllOutfits, getAllVenues, getShiftsWithVenues, getKpiSnapshot } from '../lib/db';
import { GradientCard, GradientButton, ModernInput, Toast, Segmented, Button, Input, Card } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

// Transaction categories organized by type
const INCOME_CATEGORIES = [
  'VIP Dance', 'Lapdance', 'Private Dance', 'Champagne Room', 'Stage Tips',
  'Bottle Service', 'Drink Commission', 'Room Fee', 'Merchandise', 'Tips',
  'Performance Bonus', 'Special Event', 'Photo Session', 'Other Income'
];

const EXPENSE_CATEGORIES = [
  'House Fee', 'Club Fee', 'DJ Tip', 'Security Tip', 'Bartender Tip',
  'Outfit Purchase', 'Shoes', 'Makeup', 'Nails', 'Hair', 'Costume Repair',
  'Parking', 'Rideshare', 'Gas', 'Food', 'Drinks', 'Phone Bill',
  'Gym Membership', 'Beauty Treatments', 'Other Expense'
];

export default function TransactionManager({ route, navigation }) {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production');
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, net: 0 });
  const [clients, setClients] = useState([]);
  const [venues, setVenues] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [kpiSnapshot, setKpiSnapshot] = useState({ byClient: [], topClient: null, counts: {}, totals: { income: 0, expense: 0, net: 0 } });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: 'VIP Dance',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    clientId: null,
    venueId: null,
    outfitId: null,
    shiftId: null
  });

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: 30, // 30, 90, or 'all'
    type: 'all', // 'all', 'income', 'expense'
    category: '',
    clientId: '',
    venueId: '',
    fromDate: '',
    toDate: ''
  });

  // UI state
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'category'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  // Dev-only profiling counters
  const renderItemCounterRef = useRef(0);
  const componentRenderRef = useRef(0);
  useEffect(() => {
    if (!isDev) return;
    componentRenderRef.current += 1;
    if (componentRenderRef.current % 20 === 0) {
      console.debug('[TM] TransactionManager renders:', componentRenderRef.current);
    }
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [filters.dateRange]);

  // Update category when type changes
  useEffect(() => {
    if (formData.type === 'income' && !INCOME_CATEGORIES.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: 'VIP Dance' }));
    } else if (formData.type === 'expense' && !EXPENSE_CATEGORIES.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: 'House Fee' }));
    }
  }, [formData.type]);

  async function loadData() {
    const db = openDb();
    if (!db) return;

    try {
      if (isDev) console.time('[TM] loadData');
      // Load transactions
      const daysValue = filters.dateRange === 'all' ? 50000 : filters.dateRange;
      const transactionRows = await getRecentTransactions(db, daysValue);
      if (isDev) console.debug('[TM] transactions fetched:', transactionRows.length);
      setTransactions(transactionRows);
      setTotals(computeTransactionTotals(transactionRows));

      // Load related data
      if (isDev) console.time('[TM] loadRelated');
      const [clientRows, venueRows, outfitRows, shiftRows, snapshot] = await Promise.all([
        getAllClients(db),
        getAllVenues(db),
        getAllOutfits(db),
        getShiftsWithVenues(db),
        getKpiSnapshot(db)
      ]);
      if (isDev) console.timeEnd('[TM] loadRelated');

      setClients(clientRows);
      setVenues(venueRows);
      setOutfits(outfitRows);
      setShifts(shiftRows);
      setKpiSnapshot(snapshot);
      if (isDev) console.timeEnd('[TM] loadData');

    } catch (error) {
      console.error('Error loading transaction data:', error);
      showToast('Failed to load data', 'error');
    }
  }

  // Memoized lookup maps to avoid repeated array scans per row
  const clientsById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const venuesById = useMemo(() => new Map(venues.map(v => [v.id, v])), [venues]);
  const outfitsById = useMemo(() => new Map(outfits.map(o => [o.id, o])), [outfits]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      filtered = filtered.filter(t => t.category?.toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.clientId) {
      filtered = filtered.filter(t => t.clientId === filters.clientId);
    }
    if (filters.venueId) {
      filtered = filtered.filter(t => t.venueId === filters.venueId);
    }
    if (filters.fromDate) {
      filtered = filtered.filter(t => t.date >= filters.fromDate);
    }
    if (filters.toDate) {
      filtered = filtered.filter(t => t.date <= filters.toDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'date':
        default:
          aVal = a.date || '';
          bVal = b.date || '';
          break;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, filters, sortBy, sortOrder]);

  // Dev-only dataset logs
  useEffect(() => {
    if (!isDev) return;
    console.debug('[TM] filteredTransactions size:', filteredTransactions.length);
  }, [filteredTransactions]);
  useEffect(() => {
    if (!isDev) return;
    console.debug('[TM] totals:', totals);
  }, [totals]);

  // Dev-only viewability
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 25 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (!isDev) return;
    console.debug('[TM] viewable items:', viewableItems.length);
  }, [isDev]);

  // Category totals for analytics
  const categoryTotals = useMemo(() => {
    const totals = new Map();
    filteredTransactions.forEach(t => {
      const category = t.category || 'Uncategorized';
      const existing = totals.get(category) || { income: 0, expense: 0, count: 0 };
      
      if (t.type === 'income') {
        existing.income += t.amount || 0;
      } else {
        existing.expense += t.amount || 0;
      }
      existing.count += 1;
      existing.net = existing.income - existing.expense;
      
      totals.set(category, existing);
    });

    return Array.from(totals.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredTransactions]);

  function showToast(message, type = 'info') {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast({ message: '', type: 'info', visible: false }), 3000);
  }

  function openForm(transaction = null) {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        amount: String(transaction.amount || ''),
        category: transaction.category || '',
        date: transaction.date || new Date().toISOString().slice(0, 10),
        note: transaction.note || '',
        clientId: transaction.clientId || null,
        venueId: transaction.venueId || null,
        outfitId: transaction.outfitId || null,
        shiftId: transaction.shiftId || null
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        type: 'income',
        amount: '',
        category: 'VIP Dance',
        date: new Date().toISOString().slice(0, 10),
        note: '',
        clientId: null,
        venueId: null,
        outfitId: null,
        shiftId: null
      });
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTransaction(null);
  }

  async function handleSubmit() {
    const db = openDb();
    const amount = parseFloat(formData.amount);

    // Validation
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (!formData.category.trim()) {
      showToast('Category is required', 'error');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      showToast('Please enter a valid date', 'error');
      return;
    }

    try {
      const transactionData = {
        type: formData.type,
        amount: amount,
        category: formData.category.trim(),
        date: formData.date,
        note: formData.note.trim(),
        clientId: formData.clientId || null,
        venueId: formData.venueId || null,
        outfitId: formData.outfitId || null,
        shiftId: formData.shiftId || null
      };

      if (editingTransaction) {
        // Update existing transaction (would need updateTransaction function)
        showToast('Transaction update not yet implemented', 'error');
      } else {
        // Create new transaction
        if (db) {
          await insertTransaction(db, transactionData);
        } else {
          // Web fallback
          const stored = JSON.parse(localStorage.getItem('transactions') || '[]');
          const newTransaction = {
            id: `t_${Date.now()}`,
            ...transactionData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          stored.unshift(newTransaction);
          localStorage.setItem('transactions', JSON.stringify(stored));
        }

        showToast(`${formData.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(amount)} added successfully`, 'success');
        closeForm();
        loadData();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast('Failed to save transaction', 'error');
    }
  }

  async function handleDelete(transactionId) {
    const db = openDb();
    try {
      if (db) {
        await deleteTransaction(db, transactionId);
      } else {
        // Web fallback
        const stored = JSON.parse(localStorage.getItem('transactions') || '[]');
        const filtered = stored.filter(t => t.id !== transactionId);
        localStorage.setItem('transactions', JSON.stringify(filtered));
      }
      
      showToast('Transaction deleted successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Failed to delete transaction', 'error');
    }
  }

  const getClientName = useCallback((clientId) => {
    const client = clientsById.get(clientId);
    return client ? client.name : null;
  }, [clientsById]);

  const getVenueName = useCallback((venueId) => {
    const venue = venuesById.get(venueId);
    return venue ? venue.name : null;
  }, [venuesById]);

  const getOutfitName = useCallback((outfitId) => {
    const outfit = outfitsById.get(outfitId);
    return outfit ? outfit.name : null;
  }, [outfitsById]);

  const renderTransactionItem = useCallback(({ item }) => {
    if (isDev) {
      renderItemCounterRef.current += 1;
      const c = renderItemCounterRef.current;
      if (c % 50 === 0) {
        console.debug('[TM] renderTransactionItem calls:', c);
      }
    }
    const clientName = getClientName(item.clientId);
    const venueName = getVenueName(item.venueId);
    const outfitName = getOutfitName(item.outfitId);

    return (
      <Card style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionMain}>
            <Text style={[styles.transactionAmount, { color: item.type === 'income' ? Colors.success : Colors.error }]}>
              {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount || 0)}
            </Text>
            <Text style={styles.transactionCategory}>{item.category}</Text>
          </View>
          <View style={styles.transactionActions}>
            <TouchableOpacity onPress={() => openForm(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDate}>{item.date}</Text>
          {clientName && <Text style={styles.transactionMeta}>Client: {clientName}</Text>}
          {venueName && <Text style={styles.transactionMeta}>Venue: {venueName}</Text>}
          {outfitName && <Text style={styles.transactionMeta}>Outfit: {outfitName}</Text>}
          {item.note && <Text style={styles.transactionNote}>{item.note}</Text>}
        </View>
      </Card>
    );
  }, [getClientName, getVenueName, getOutfitName, openForm, handleDelete]);

  function renderCategoryTotal({ item }) {
    return (
      <View style={styles.categoryTotalItem}>
        <Text style={styles.categoryName}>{item.category}</Text>
        <View style={styles.categoryAmounts}>
          <Text style={[styles.categoryAmount, { color: Colors.success }]}>
            +{formatCurrency(item.income)}
          </Text>
          <Text style={[styles.categoryAmount, { color: Colors.error }]}>
            -{formatCurrency(item.expense)}
          </Text>
          <Text style={[styles.categoryNet, { color: item.net >= 0 ? Colors.success : Colors.error }]}>
            {formatCurrency(item.net)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transaction Manager</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.headerButton}>
            <Ionicons name="filter" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openForm()} style={styles.headerButton}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryContainer}>
        <GradientCard variant="success" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Income</Text>
          <Text style={styles.summaryAmount}>+{formatCurrency(totals.income || 0)}</Text>
        </GradientCard>
        
        <GradientCard variant="error" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryAmount}>-{formatCurrency(totals.expense || 0)}</Text>
        </GradientCard>
        
        <GradientCard variant={totals.net >= 0 ? "success" : "error"} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Total</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.net || 0)}</Text>
        </GradientCard>
      </ScrollView>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        style={styles.transactionList}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={6}
        removeClippedSubviews={true}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
          </View>
        }
      />

      {/* Transaction Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeForm}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Transaction Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <Segmented
                options={[
                  { label: 'Income', value: 'income' },
                  { label: 'Expense', value: 'expense' }
                ]}
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              />
            </View>

            {/* Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount</Text>
              <ModernInput
                value={formData.amount}
                onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
                placeholder="0.00"
                keyboardType="numeric"
                style={styles.formInput}
              />
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ModernInput
                value={formData.category}
                onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
                placeholder="Select category"
                style={styles.formInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTags}>
                {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(category => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                    style={[
                      styles.categoryTag,
                      formData.category === category && styles.categoryTagActive
                    ]}
                  >
                    <Text style={[
                      styles.categoryTagText,
                      formData.category === category && styles.categoryTagTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date</Text>
              <ModernInput
                value={formData.date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
                style={styles.formInput}
              />
            </View>

            {/* Client */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Client (Optional)</Text>
              <ModernInput
                value={getClientName(formData.clientId) || ''}
                placeholder="Select client"
                editable={false}
                style={styles.formInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionTags}>
                <TouchableOpacity
                  onPress={() => setFormData(prev => ({ ...prev, clientId: null }))}
                  style={[styles.optionTag, !formData.clientId && styles.optionTagActive]}
                >
                  <Text style={[styles.optionTagText, !formData.clientId && styles.optionTagTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {clients.map(client => (
                  <TouchableOpacity
                    key={client.id}
                    onPress={() => setFormData(prev => ({ ...prev, clientId: client.id }))}
                    style={[
                      styles.optionTag,
                      formData.clientId === client.id && styles.optionTagActive
                    ]}
                  >
                    <Text style={[
                      styles.optionTagText,
                      formData.clientId === client.id && styles.optionTagTextActive
                    ]}>
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Venue */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venue (Optional)</Text>
              <ModernInput
                value={getVenueName(formData.venueId) || ''}
                placeholder="Select venue"
                editable={false}
                style={styles.formInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionTags}>
                <TouchableOpacity
                  onPress={() => setFormData(prev => ({ ...prev, venueId: null }))}
                  style={[styles.optionTag, !formData.venueId && styles.optionTagActive]}
                >
                  <Text style={[styles.optionTagText, !formData.venueId && styles.optionTagTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {venues.map(venue => (
                  <TouchableOpacity
                    key={venue.id}
                    onPress={() => setFormData(prev => ({ ...prev, venueId: venue.id }))}
                    style={[
                      styles.optionTag,
                      formData.venueId === venue.id && styles.optionTagActive
                    ]}
                  >
                    <Text style={[
                      styles.optionTagText,
                      formData.venueId === venue.id && styles.optionTagTextActive
                    ]}>
                      {venue.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Outfit */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Outfit (Optional)</Text>
              <ModernInput
                value={getOutfitName(formData.outfitId) || ''}
                placeholder="Select outfit"
                editable={false}
                style={styles.formInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionTags}>
                <TouchableOpacity
                  onPress={() => setFormData(prev => ({ ...prev, outfitId: null }))}
                  style={[styles.optionTag, !formData.outfitId && styles.optionTagActive]}
                >
                  <Text style={[styles.optionTagText, !formData.outfitId && styles.optionTagTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {outfits.map(outfit => (
                  <TouchableOpacity
                    key={outfit.id}
                    onPress={() => setFormData(prev => ({ ...prev, outfitId: outfit.id }))}
                    style={[
                      styles.optionTag,
                      formData.outfitId === outfit.id && styles.optionTagActive
                    ]}
                  >
                    <Text style={[
                      styles.optionTagText,
                      formData.outfitId === outfit.id && styles.optionTagTextActive
                    ]}>
                      {outfit.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Note */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Note (Optional)</Text>
              <ModernInput
                value={formData.note}
                onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
                placeholder="Add a note..."
                multiline
                numberOfLines={3}
                style={[styles.formInput, styles.textArea]}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast({ message: '', type: 'info', visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    minWidth: 140,
    marginRight: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  transactionList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionCard: {
    marginBottom: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionMain: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  transactionDetails: {
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  transactionMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  transactionNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    marginBottom: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryTags: {
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryTagTextActive: {
    color: Colors.white,
  },
  optionTags: {
    marginTop: 8,
  },
  optionTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  optionTagTextActive: {
    color: Colors.white,
  },
  categoryTotalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  categoryAmounts: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryNet: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
});