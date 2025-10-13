import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { outfits as sampleOutfits } from '../data/sampleData';
import { openDb, getAllOutfits, getAllOutfitsWithEarnings, insertOutfit, updateOutfit, deleteOutfit, incrementWearCount, getAllVenues } from '../lib/db';
import { GradientCard, GradientButton, ModernInput, Toast } from '../components/UI';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

export default function Outfits() {
  const [items, setItems] = useState(sampleOutfits || []);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [wearCount, setWearCount] = useState('');
  const [photos, setPhotos] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  const [venues, setVenues] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const db = openDb();
    (async () => {
      try {
        const rows = await getAllOutfitsWithEarnings(db);
        setItems(rows);
      } catch (e) {
        console.warn('Load outfits with earnings failed, trying regular outfits', e);
        try {
          const rows = await getAllOutfits(db);
          setItems(rows);
        } catch (e2) {
          console.warn('Load outfits failed, using fallback', e2);
          setItems(sampleOutfits || []);
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

  const analytics = useMemo(() => {
    const outfits = items || [];
    const totalCost = outfits.reduce((acc, o) => acc + Number(o.cost || 0), 0);
    const totalWear = outfits.reduce((acc, o) => acc + Number(o.wearCount || 0), 0);
    const totalEarnings = outfits.reduce((acc, o) => acc + Number(o.net || 0), 0);
    const avgCostPerWear = totalWear > 0 ? totalCost / totalWear : 0;
    const roi = totalCost > 0 ? ((totalEarnings - totalCost) / totalCost) * 100 : 0;
    
    return {
      totalOutfits: outfits.length,
      totalCost,
      totalWear,
      totalEarnings,
      avgCostPerWear,
      roi,
      profitableOutfits: outfits.filter(o => (o.net || 0) > (o.cost || 0)).length
    };
  }, [items]);

  const topPerformers = useMemo(() => {
    return (items || [])
      .filter(outfit => outfit.net && outfit.cost)
      .map(outfit => ({
        ...outfit,
        roi: outfit.cost > 0 ? ((outfit.net - outfit.cost) / outfit.cost) * 100 : 0,
        profitPerWear: outfit.wearCount > 0 ? outfit.net / outfit.wearCount : 0
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3);
  }, [items]);

  const categories = ['all', 'high-roi', 'new', 'frequent'];
  
  const filteredOutfits = useMemo(() => {
    let filtered = items || [];
    
    switch (selectedCategory) {
      case 'high-roi':
        filtered = filtered.filter(outfit => {
          const roi = outfit.cost > 0 ? ((outfit.net - outfit.cost) / outfit.cost) * 100 : 0;
          return roi > 100;
        });
        break;
      case 'new':
        filtered = filtered.filter(outfit => (outfit.wearCount || 0) <= 2);
        break;
      case 'frequent':
        filtered = filtered.filter(outfit => (outfit.wearCount || 0) >= 5);
        break;
      default:
        break;
    }
    
    return filtered;
  }, [items, selectedCategory]);

  async function handleDeleteOutfit(outfitId) {
    try {
      const db = openDb();
      if (db) {
        await deleteOutfit(db, outfitId);
        const rows = await getAllOutfitsWithEarnings(db);
        setItems(rows);
      } else {
        const nextList = items.filter(item => item.id !== outfitId);
        setItems(nextList);
      }
      setToast({ message: 'Outfit deleted', type: 'success', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    } catch (e) {
      console.error('Delete outfit failed:', e);
      setToast({ message: 'Delete failed', type: 'error', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    }
  }

  async function handleWearOutfit(outfitId) {
    try {
      const db = openDb();
      if (db) {
        await incrementWearCount(db, outfitId);
        const rows = await getAllOutfitsWithEarnings(db);
        setItems(rows);
      } else {
        const nextList = items.map(item => 
          item.id === outfitId 
            ? { ...item, wearCount: (item.wearCount || 0) + 1 }
            : item
        );
        setItems(nextList);
      }
      setToast({ message: 'Wear count updated', type: 'success', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    } catch (e) {
      console.error('Update wear count failed:', e);
      setToast({ message: 'Update failed', type: 'error', visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 2500);
    }
  }

  function renderOutfitCard(outfit) {
    const roi = outfit.cost > 0 ? ((outfit.net - outfit.cost) / outfit.cost) * 100 : 0;
    const profitPerWear = outfit.wearCount > 0 ? outfit.net / outfit.wearCount : 0;
    const isProfit = roi > 0;

    return (
      <GradientCard key={outfit.id} style={styles.outfitCard}>
        <View style={styles.outfitHeader}>
          <View style={styles.outfitInfo}>
            <Text style={styles.outfitName}>{outfit.name || 'Unnamed Outfit'}</Text>
            <Text style={styles.outfitCost}>Cost: {formatCurrency(outfit.cost || 0)}</Text>
          </View>
          <View style={[styles.roiBadge, isProfit ? styles.profitBadge : styles.lossBadge]}>
            <Text style={styles.roiText}>{roi.toFixed(0)}% ROI</Text>
          </View>
        </View>

        <View style={styles.outfitMetrics}>
          <View style={styles.metric}>
            <Ionicons name="repeat" size={16} color={Colors.primary} />
            <Text style={styles.metricText}>{outfit.wearCount || 0} wears</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="trending-up" size={16} color={Colors.success} />
            <Text style={styles.metricText}>{formatCurrency(outfit.net || 0)} earned</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="calculator" size={16} color={Colors.accent} />
            <Text style={styles.metricText}>{formatCurrency(profitPerWear)} per wear</Text>
          </View>
        </View>

        <View style={styles.outfitActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleWearOutfit(outfit.id)}
          >
            <Ionicons name="add-circle" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Wear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setEditItem(outfit);
              setName(outfit.name || '');
              setCost(String(outfit.cost || ''));
              setWearCount(String(outfit.wearCount || ''));
              setPhotos(Array.isArray(outfit.photos) ? outfit.photos : []);
              setAddOpen(true);
            }}
          >
            <Ionicons name="pencil" size={16} color={Colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteOutfit(outfit.id)}
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
            <Ionicons name="shirt" size={28} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Outfits</Text>
              <Text style={styles.headerSubtitle}>Track your wardrobe ROI</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              setEditItem(null);
              setName('');
              setCost('');
              setWearCount('');
              setPhotos([]);
              setAddOpen(true);
            }}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Analytics Cards */}
        <View style={styles.analyticsContainer}>
          <GradientCard style={styles.analyticsCard}>
            <View style={styles.analyticsContent}>
              <Ionicons name="shirt-outline" size={24} color={Colors.primary} />
              <Text style={styles.analyticsValue}>{analytics.totalOutfits}</Text>
              <Text style={styles.analyticsLabel}>Total Outfits</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.analyticsCard}>
            <View style={styles.analyticsContent}>
              <Ionicons name="cash-outline" size={24} color={Colors.success} />
              <Text style={styles.analyticsValue}>{formatCurrency(analytics.totalEarnings)}</Text>
              <Text style={styles.analyticsLabel}>Total Earned</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.analyticsCard}>
            <View style={styles.analyticsContent}>
              <Ionicons name="trending-up-outline" size={24} color={analytics.roi > 0 ? Colors.success : Colors.error} />
              <Text style={[styles.analyticsValue, { color: analytics.roi > 0 ? Colors.success : Colors.error }]}>
                {analytics.roi.toFixed(0)}%
              </Text>
              <Text style={styles.analyticsLabel}>Overall ROI</Text>
            </View>
          </GradientCard>
          
          <GradientCard style={styles.analyticsCard}>
            <View style={styles.analyticsContent}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Colors.warning} />
              <Text style={styles.analyticsValue}>{analytics.profitableOutfits}</Text>
              <Text style={styles.analyticsLabel}>Profitable</Text>
            </View>
          </GradientCard>
        </View>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Performers</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topPerformersScroll}>
              {topPerformers.map((outfit) => (
                <GradientCard key={outfit.id} style={styles.topPerformerCard}>
                  <Text style={styles.topPerformerName}>{outfit.name}</Text>
                  <View style={styles.topPerformerMetrics}>
                    <Text style={styles.topPerformerROI}>{outfit.roi.toFixed(0)}% ROI</Text>
                    <Text style={styles.topPerformerEarnings}>{formatCurrency(outfit.net)}</Text>
                  </View>
                  <Text style={styles.topPerformerWears}>{outfit.wearCount} wears</Text>
                </GradientCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category Filter */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>
                  {category === 'all' ? 'All' : 
                   category === 'high-roi' ? 'High ROI' :
                   category === 'new' ? 'New' : 'Frequent'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Outfits Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Outfits' : 
               selectedCategory === 'high-roi' ? 'High ROI Outfits' :
               selectedCategory === 'new' ? 'New Outfits' : 'Frequently Worn'}
            </Text>
            <Text style={styles.countText}>{filteredOutfits.length} items</Text>
          </View>
          
          {filteredOutfits.length === 0 ? (
            <GradientCard style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Ionicons name="shirt-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyTitle}>No outfits yet</Text>
                <Text style={styles.emptySubtitle}>Add your first outfit to start tracking ROI</Text>
                <GradientButton
                  title="Add Outfit"
                  onPress={() => {
                    setEditItem(null);
                    setName('');
                    setCost('');
                    setWearCount('');
                    setPhotos([]);
                    setAddOpen(true);
                  }}
                  style={styles.emptyButton}
                />
              </View>
            </GradientCard>
          ) : (
            <View style={styles.outfitsGrid}>
              {filteredOutfits.map((outfit) => renderOutfitCard(outfit))}
            </View>
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
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  analyticsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  analyticsCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 16,
  },
  analyticsContent: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  countText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  topPerformersScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  topPerformerCard: {
    width: 140,
    padding: 12,
    marginRight: 12,
  },
  topPerformerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  topPerformerMetrics: {
    marginBottom: 4,
  },
  topPerformerROI: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  topPerformerEarnings: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topPerformerWears: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  outfitsGrid: {
    gap: 12,
  },
  outfitCard: {
    padding: 16,
    marginBottom: 12,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  outfitCost: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profitBadge: {
    backgroundColor: Colors.success + '20',
  },
  lossBadge: {
    backgroundColor: Colors.error + '20',
  },
  roiText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  outfitMetrics: {
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
  outfitActions: {
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