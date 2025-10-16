import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openDb, getRecentTransactions, computeTransactionTotals, insertTransaction, updateTransaction, deleteTransaction, getAllClients, getAllVenues, getAllOutfits } from '../lib/db';
import { GradientCard, GradientButton, ModernInput, Toast } from '../components/UI';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/formatters';

export default function TransactionManager() {
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, net: 0 });

  const [clients, setClients] = useState([]);
  const [venues, setVenues] = useState([]);
  const [outfits, setOutfits] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: '',
    clientId: null,
    venueId: null,
    outfitId: null,
    note: '',
    date: new Date().toISOString(),
  });

  const [clientQuery, setClientQuery] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  const [outfitQuery, setOutfitQuery] = useState('');

  const clientsById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const venuesById = useMemo(() => new Map(venues.map(v => [v.id, v])), [venues]);
  const outfitsById = useMemo(() => new Map(outfits.map(o => [o.id, o])), [outfits]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    return clients.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [clients, clientQuery]);
  const filteredVenues = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    return venues.filter(v => (v.name || '').toLowerCase().includes(q));
  }, [venues, venueQuery]);
  const filteredOutfits = useMemo(() => {
    const q = outfitQuery.trim().toLowerCase();
    return outfits.filter(o => (o.name || o.title || '').toLowerCase().includes(q));
  }, [outfits, outfitQuery]);

  function showToast(message, type = 'info') {
    try { Toast.show?.({ message, type }); } catch {}
  }

  async function loadData() {
    const db = openDb();
    const tx = await getRecentTransactions(db, 90);
    setTransactions(tx);
    setTotals(computeTransactionTotals(tx));
    setClients(await getAllClients(db));
    setVenues(await getAllVenues(db));
    setOutfits(await getAllOutfits(db));
  }

  useEffect(() => { loadData(); }, []);

  function openForm(item) {
    if (item) {
      setEditingTransaction(item);
      setFormData({
        type: item.type || 'income',
        amount: String(item.amount || ''),
        category: item.category || '',
        clientId: item.clientId || null,
        venueId: item.venueId || null,
        outfitId: item.outfitId || null,
        note: item.note || '',
        date: item.date || new Date().toISOString(),
      });
    } else {
      setEditingTransaction(null);
      setFormData({ type: 'income', amount: '', category: '', clientId: null, venueId: null, outfitId: null, note: '', date: new Date().toISOString() });
    }
    setClientQuery(''); setVenueQuery(''); setOutfitQuery('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTransaction(null);
  }

  async function handleSubmit() {
    const db = openDb();
    const amountNum = Number(formData.amount || 0);
    const transactionData = {
      type: formData.type,
      amount: amountNum,
      category: formData.category || 'General',
      clientId: formData.clientId || null,
      venueId: formData.venueId || null,
      outfitId: formData.outfitId || null,
      note: formData.note || '',
      date: formData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingTransaction) {
        await updateTransaction(db, { id: editingTransaction.id, ...transactionData });
        showToast('Transaction updated successfully', 'success');
      } else {
        await insertTransaction(db, transactionData);
        showToast('Income added successfully', 'success');
      }
      closeForm();
      loadData();
    } catch (err) {
      console.error('Submit error', err);
      showToast('Failed to save transaction', 'error');
    }
  }

  async function handleDelete(id) {
    const db = openDb();
    try {
      await deleteTransaction(db, id);
      showToast('Transaction deleted successfully', 'success');
      loadData();
    } catch (err) {
      console.error('Delete error', err);
      showToast('Failed to delete transaction', 'error');
    }
  }

  function renderTransactionItem({ item }) {
    const clientName = item.clientId ? (clientsById.get(item.clientId)?.name || '—') : null;
    const venueName = item.venueId ? (venuesById.get(item.venueId)?.name || '—') : null;
    const outfitName = item.outfitId ? (outfitsById.get(item.outfitId)?.name || outfitsById.get(item.outfitId)?.title || '—') : null;

    const hasTagOptions = (clients.length > 0 || venues.length > 0 || outfits.length > 0);

    return (
      <View style={styles.transactionRow}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionCategory}>{item.category || 'General'}</Text>
          <Text style={styles.transactionDate}>{new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}</Text>
          {clientName && (
            <Text style={styles.metaText}>Client: <Text style={styles.metaValue}>{clientName}</Text></Text>
          )}
          {venueName && (
            <Text style={styles.metaText}>Venue: <Text style={styles.metaValue}>{venueName}</Text></Text>
          )}
          {outfitName && (
            <Text style={styles.metaText}>Outfit: <Text style={styles.metaValue}>{outfitName}</Text></Text>
          )}
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.amount, { color: item.type === 'income' ? Colors.success : Colors.error }]}> {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}</Text>
          <View style={styles.transactionActions}>
            {hasTagOptions && (
              <TouchableOpacity onPress={() => openForm(item)} style={styles.actionButton}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => openForm(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
              <Ionicons name="trash" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const TagSelector = ({ label, query, setQuery, options, selectedId, onSelect }) => (
    <View style={styles.tagSection}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ModernInput
        placeholder={`Filter ${label.toLowerCase()}`}
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagList}>
        <TouchableOpacity onPress={() => onSelect(null)} style={[styles.tag, selectedId === null && styles.tagSelected]}>
          <Text style={styles.tagText}>None</Text>
        </TouchableOpacity>
        {options.map(opt => (
          <TouchableOpacity key={opt.id} onPress={() => onSelect(opt.id)} style={[styles.tag, selectedId === opt.id && styles.tagSelected]}>
            <Text style={styles.tagText}>{opt.name || opt.title || 'Unnamed'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <GradientCard variant="minimal" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>+{formatCurrency(totals.income)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>-{formatCurrency(totals.expense)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totals.net)}</Text>
          </View>
        </View>
        <GradientButton title="Add Transaction" variant="primary" onPress={() => openForm(null)} style={styles.addButton} />
      </GradientCard>

      <GradientCard variant="minimal" style={styles.listCard}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet</Text>}
          scrollEnabled={false}
        />
      </GradientCard>

      {showForm && (
        <View style={styles.modalOverlay}>
          <GradientCard variant="glow" style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</Text>
              <TouchableOpacity onPress={closeForm} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity onPress={() => setFormData({ ...formData, type: 'income' })} style={[styles.typeButton, formData.type === 'income' && styles.typeButtonActive]}>
                  <Text style={styles.typeButtonText}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFormData({ ...formData, type: 'expense' })} style={[styles.typeButton, formData.type === 'expense' && styles.typeButtonActive]}>
                  <Text style={styles.typeButtonText}>Expense</Text>
                </TouchableOpacity>
              </View>

              <ModernInput
                placeholder="Amount"
                keyboardType="numeric"
                value={String(formData.amount)}
                onChangeText={(t) => setFormData({ ...formData, amount: t })}
                style={styles.input}
              />

              <ModernInput
                placeholder="Category"
                value={formData.category}
                onChangeText={(t) => setFormData({ ...formData, category: t })}
                style={styles.input}
              />

              <ModernInput
                placeholder="Note (optional)"
                value={formData.note}
                onChangeText={(t) => setFormData({ ...formData, note: t })}
                style={styles.input}
              />

              {/* Tag selectors */}
              {clients.length > 0 && (
                <TagSelector
                  label="Clients"
                  query={clientQuery}
                  setQuery={setClientQuery}
                  options={filteredClients}
                  selectedId={formData.clientId}
                  onSelect={(id) => setFormData({ ...formData, clientId: id })}
                />
              )}
              {venues.length > 0 && (
                <TagSelector
                  label="Venues"
                  query={venueQuery}
                  setQuery={setVenueQuery}
                  options={filteredVenues}
                  selectedId={formData.venueId}
                  onSelect={(id) => setFormData({ ...formData, venueId: id })}
                />
              )}
              {outfits.length > 0 && (
                <TagSelector
                  label="Outfits"
                  query={outfitQuery}
                  setQuery={setOutfitQuery}
                  options={filteredOutfits}
                  selectedId={formData.outfitId}
                  onSelect={(id) => setFormData({ ...formData, outfitId: id })}
                />
              )}

              <View style={styles.modalActions}>
                <GradientButton title="Cancel" variant="secondary" onPress={closeForm} style={styles.cancelButton} />
                <GradientButton title="Save" variant="primary" onPress={handleSubmit} style={styles.saveButton} />
              </View>
            </View>
          </GradientCard>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Colors.spacing.md },
  summaryCard: { marginBottom: Colors.spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Colors.spacing.md },
  summaryItem: { flex: 1 },
  summaryLabel: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.sm },
  summaryValue: { color: Colors.text, fontSize: Colors.typography.fontSize.lg, fontWeight: Colors.typography.fontWeight.semibold },
  addButton: { marginTop: Colors.spacing.sm },

  listCard: { padding: Colors.spacing.sm },
  separator: { height: 1, backgroundColor: Colors.border },
  emptyText: { color: Colors.textMuted, textAlign: 'center', padding: Colors.spacing.md },

  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Colors.spacing.md },
  transactionLeft: { flex: 1, marginRight: Colors.spacing.md },
  transactionRight: { alignItems: 'flex-end' },
  transactionCategory: { color: Colors.text, fontSize: Colors.typography.fontSize.md, fontWeight: Colors.typography.fontWeight.medium },
  transactionDate: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.xs, marginTop: Colors.spacing.xs },
  metaText: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.xs, marginTop: Colors.spacing.xs },
  metaValue: { color: Colors.textAccent },
  amount: { fontSize: Colors.typography.fontSize.md, fontWeight: Colors.typography.fontWeight.semibold },
  transactionActions: { flexDirection: 'row', gap: Colors.spacing.xs, marginTop: Colors.spacing.sm },
  actionButton: { padding: Colors.spacing.xs },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalSheet: { width: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Colors.spacing.md },
  modalTitle: { color: Colors.text, fontSize: Colors.typography.fontSize.lg, fontWeight: Colors.typography.fontWeight.bold },
  closeButton: { padding: Colors.spacing.xs },
  formSection: { gap: Colors.spacing.md },
  sectionLabel: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.sm, fontWeight: Colors.typography.fontWeight.medium },
  typeRow: { flexDirection: 'row', gap: Colors.spacing.sm },
  typeButton: { flex: 1, paddingVertical: Colors.spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Colors.borderRadius.md, alignItems: 'center' },
  typeButtonActive: { borderColor: Colors.primary },
  typeButtonText: { color: Colors.text },
  input: { marginTop: Colors.spacing.sm },

  tagSection: { marginTop: Colors.spacing.md },
  tagList: { marginTop: Colors.spacing.sm },
  tag: { paddingHorizontal: Colors.spacing.md, paddingVertical: Colors.spacing.xs, borderWidth: 1, borderColor: Colors.border, borderRadius: Colors.borderRadius.round, marginRight: Colors.spacing.xs },
  tagSelected: { borderColor: Colors.primary, backgroundColor: Colors.surfaceAccent },
  tagText: { color: Colors.text },

  modalActions: { flexDirection: 'row', gap: Colors.spacing.md, marginTop: Colors.spacing.lg },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});