import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Platform, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { outfits as sampleOutfits, getVenueById } from '../data/sampleData';
import { openDb, getAllOutfits, getAllOutfitsWithEarnings, insertOutfit, updateOutfit, deleteOutfit, incrementWearCount, getAllVenues } from '../lib/db';
import { Card, Button, Input, Tag, Toast } from '../components/UI';

export default function Outfits() {
  const [items, setItems] = useState(Platform.OS === 'web' ? sampleOutfits : []);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [wearCount, setWearCount] = useState('');
  const [photos, setPhotos] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    const db = openDb();
    (async () => {
      try {
        // Use getAllOutfitsWithEarnings to get earnings data
        const rows = await getAllOutfitsWithEarnings(db);
        setItems(rows);
      } catch (e) {
        console.warn('Load outfits with earnings failed, trying regular outfits', e);
        try {
          const rows = await getAllOutfits(db);
          setItems(rows);
        } catch (e2) {
          console.warn('Load outfits failed, using fallback', e2);
          setItems(Platform.OS === 'web' ? sampleOutfits : []);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const db = openDb();
    (async () => {
      try {
        const vs = await getAllVenues(db);
        setVenues(vs);
      } catch (e) {
        console.warn('Load venues failed', e);
      }
    })();
  }, []);

  const totalCost = useMemo(() => (items || []).reduce((acc, o) => acc + Number(o.cost || 0), 0), [items]);
  const totalWear = useMemo(() => (items || []).reduce((acc, o) => acc + Number(o.wearCount || 0), 0), [items]);
  const totalEarnings = useMemo(() => (items || []).reduce((acc, o) => acc + Number(o.net || 0), 0), [items]);
  const avgCostPerWear = useMemo(() => {
    const wear = totalWear || 1;
    return (totalCost / wear).toFixed(2);
  }, [totalCost, totalWear]);

  const resetForm = () => {
    setName('');
    setCost('');
    setWearCount('');
    setPhotos([]);
  };

  const openAdd = () => { resetForm(); setEditItem(null); setAddOpen(true); };
  const openEdit = (item) => { setEditItem(item); setName(item.name || ''); setCost(String(item.cost || '')); setWearCount(String(item.wearCount || '')); setPhotos(Array.isArray(item.photos) ? item.photos : []); setAddOpen(true); };
  const closeAdd = () => setAddOpen(false);

  const handleSave = async () => {
    const payload = { name: name.trim(), cost: Number(cost || 0), wearCount: Number(wearCount || 0), photos: Array.isArray(photos) ? photos : [] };
    const db = openDb();
    try {
      const saved = editItem ? await updateOutfit(db, { ...editItem, ...payload }) : await insertOutfit(db, payload);
      const next = editItem ? items.map(o => o.id === saved.id ? saved : o) : [saved, ...items];
      setItems(next);
      setToast({ message: editItem ? 'Outfit updated' : 'Outfit added', type: 'success', visible: true });
    } catch (e) {
      console.warn('Save outfit failed', e);
      setToast({ message: 'Save failed', type: 'error', visible: true });
    } finally {
      setAddOpen(false);
      resetForm();
    }
  };

  async function ensureCameraPerms() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setToast({ message: 'Camera permission required', type: 'error', visible: true });
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Camera permission error', e);
      return false;
    }
  }

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      setToast({ message: 'Camera not supported in web preview. Use library.', type: 'info', visible: true });
      return;
    }
    const ok = await ensureCameraPerms();
    if (!ok) return;
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
      if (!res.canceled && res.assets?.length) {
        const uri = res.assets[0].uri;
        setPhotos(prev => [uri, ...prev]);
      }
    } catch (e) {
      console.warn('Launch camera failed', e);
      setToast({ message: 'Failed to open camera', type: 'error', visible: true });
    }
  };

  const pickFromLibrary = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });
      if (!res.canceled && res.assets?.length) {
        const uri = res.assets[0].uri;
        setPhotos(prev => [uri, ...prev]);
      }
    } catch (e) {
      console.warn('Pick from library failed', e);
      setToast({ message: 'Failed to pick photo', type: 'error', visible: true });
    }
  };

  const removePhotoAt = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDelete = async (id) => {
    const db = openDb();
    try {
      await deleteOutfit(db, id);
      setItems(items.filter(o => o.id !== id));
      setToast({ message: 'Outfit deleted', type: 'success', visible: true });
    } catch (e) {
      console.warn('Delete outfit failed', e);
      setToast({ message: 'Delete failed', type: 'error', visible: true });
    }
  };

  const handleWear = async (id) => {
    const db = openDb();
    try {
      const updated = await incrementWearCount(db, id);
      const next = items.map(o => o.id === id ? (updated || { ...o, wearCount: Number(o.wearCount || 0) + 1 }) : o);
      setItems(next);
    } catch (e) {
      console.warn('Increment wear failed', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Wardrobe & ROI</Text>
      <View style={styles.cards}>
        <Card title="Total Cost" value={`$${totalCost.toFixed(2)}`} accent="#ffd166" />
        <Card title="Total Wears" value={`${totalWear}`} accent="#06d6a0" />
        <Card title="Total Earnings" value={`$${totalEarnings.toFixed(2)}`} accent="#ff2d90" />
        <Card title="Avg Cost / Wear" value={`$${avgCostPerWear}`} accent="#8b5cf6" />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: '#ccc' }}>Manage outfits, track wear count, and earnings.</Text>
        <Button label="Add Outfit" onPress={openAdd} />
      </View>
      <FlatList
        data={(items || []).slice().sort((a, b) => (b.net || 0) - (a.net || 0))}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <OutfitRow item={item} venues={venues} onWear={() => handleWear(item.id)} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
        )}
        style={{ marginTop: 12 }}
      />

      {addOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editItem ? 'Edit Outfit' : 'Add Outfit'}</Text>
            <Input placeholder="Name" value={name} onChangeText={setName} />
            <Input placeholder="Cost e.g. 250" value={cost} onChangeText={setCost} keyboardType="numeric" />
            <Input placeholder="Initial Wear Count" value={wearCount} onChangeText={setWearCount} keyboardType="numeric" />
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#ccc', fontSize: 12 }}>Photos</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(photos || []).map((uri, idx) => (
                  <TouchableOpacity key={`${uri}-${idx}`} onLongPress={() => removePhotoAt(idx)} accessibilityRole="button" accessibilityLabel="Remove photo">
                    <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Take Photo" onPress={takePhoto} />
                <Button label={Platform.OS === 'web' ? 'Choose File' : 'Choose from Library'} variant="ghost" onPress={pickFromLibrary} />
              </View>
              {Platform.OS === 'web' ? (
                <Text style={{ color: '#777', fontSize: 12 }}>Camera is not available in web preview. Use file picker.</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Save" onPress={handleSave} />
              <Button label="Cancel" variant="ghost" onPress={closeAdd} />
            </View>
          </View>
        </View>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onAction={() => setToast({ ...toast, visible: false })} actionLabel="Close" />
      <Text style={styles.note}>{Platform.OS === 'web' ? 'Using web localStorage fallback.' : 'Using on-device SQLite database.'}</Text>
    </View>
  );
}

function OutfitRow({ item, venues = [], onWear, onEdit, onDelete }) {
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start(); }, []);
  const favVenue = Array.isArray(item.favorites) && item.favorites.length ? (getVenueById(item.favorites[0]) || venues.find(v => v.id === item.favorites[0])) : null;
  const cpw = Number(item.wearCount || 0) > 0 ? (Number(item.cost || 0) / Number(item.wearCount)).toFixed(2) : '—';
  
  // Earnings data
  const income = Number(item.income || 0);
  const expense = Number(item.expense || 0);
  const net = Number(item.net || 0);
  const transactionCount = Number(item.transactionCount || 0);
  
  return (
    <Animated.View style={[styles.row, { opacity: fade }]}> 
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {Array.isArray(item.photos) && item.photos.length ? (
          <Image source={{ uri: item.photos[0] }} style={{ width: 48, height: 48, borderRadius: 8 }} />
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={styles.outfitName}>{item.name}</Text>
            {favVenue ? <Tag text={favVenue.name} backgroundColor="#222" color="#ccc" /> : null}
            {net > 0 ? <Tag text={`+$${net.toFixed(0)}`} backgroundColor="#06d6a0" color="#000" /> : null}
            {net < 0 ? <Tag text={`-$${Math.abs(net).toFixed(0)}`} backgroundColor="#ff6b6b" color="#fff" /> : null}
          </View>
          <Text style={styles.meta}>
            Cost ${item.cost} • Wears {item.wearCount} • Cost/Wear {cpw === '—' ? '—' : `$${cpw}`}
          </Text>
          {transactionCount > 0 ? (
            <Text style={[styles.meta, { color: '#06d6a0', fontSize: 11 }]}>
              {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} • Income ${income.toFixed(0)} • Expenses ${expense.toFixed(0)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Platform.OS !== 'web' ? <Ionicons name="shirt-outline" size={14} color="#ffd166" /> : null}
        <Button label="Wear +1" variant="ghost" onPress={onWear} />
        <Button label="Edit" variant="ghost" onPress={onEdit} />
        <Button label="Delete" variant="danger" onPress={onDelete} />
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
  cards: { flexDirection: 'row', gap: 12 },
  row: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  outfitName: { color: '#ffd166', fontSize: 16, fontWeight: '700' },
  meta: { color: '#ccc', fontSize: 12, marginTop: 4 },
  separator: { height: 12 },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  modalSheet: { width: '90%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, gap: 10 },
  modalTitle: { color: '#f5f5f5', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  note: { color: '#777', fontSize: 12, marginTop: 12 },
});