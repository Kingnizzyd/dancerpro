import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientCard, GradientButton } from '../components/UI';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/formatters';

export default function AnalyticsScreen() {
  const sampleKPIs = {
    totalEarnings: 48250,
    totalShifts: 128,
    avgPerShift: 377.34,
    bestDay: 'Sat',
  };

  const sampleTrends = [
    { label: 'W1', value: 3200 },
    { label: 'W2', value: 4100 },
    { label: 'W3', value: 2800 },
    { label: 'W4', value: 5200 },
    { label: 'W5', value: 4500 },
  ];

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundSecondary, Colors.surfaceAccent]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={[Colors.gradientPrimary, Colors.gradientSecondary]} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="stats-chart" size={32} color={Colors.white} />
                <View>
                  <Text style={styles.heading}>Analytics</Text>
                  <Text style={styles.subheading}>Deep dive into your performance</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Refresh analytics">
                  <Ionicons name="refresh" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <GradientCard variant="accent" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="cash" size={24} color={Colors.accent} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{formatCurrency(sampleKPIs.totalEarnings)}</Text>
                <Text style={styles.kpiLabel}>Total Earnings</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="glow" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="calendar" size={24} color={Colors.secondary} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{sampleKPIs.totalShifts}</Text>
                <Text style={styles.kpiLabel}>Total Shifts</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="default" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="trending-up" size={24} color={Colors.success} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{formatCurrency(sampleKPIs.avgPerShift)}</Text>
                <Text style={styles.kpiLabel}>Avg per Shift</Text>
              </View>
            </View>
          </GradientCard>

          <GradientCard variant="accent" style={styles.kpiCard}>
            <View style={styles.kpiContent}>
              <View style={styles.kpiIcon}>
                <Ionicons name="sunny" size={24} color={Colors.warning} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiValue}>{sampleKPIs.bestDay}</Text>
                <Text style={styles.kpiLabel}>Best Day</Text>
              </View>
            </View>
          </GradientCard>
        </View>

        {/* Earnings Trend */}
        <GradientCard variant="glow" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earnings Trend</Text>
            <GradientButton title="Export" variant="secondary" size="small" onPress={() => {}} />
          </View>
          <View style={styles.trendChart}>
            {sampleTrends.map((t, idx) => (
              <View key={idx} style={styles.trendBar}>
                <View style={[styles.trendFill, { height: Math.min(120, Math.max(8, (t.value / 5200) * 120)) }]} />
                <Text style={styles.trendLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </GradientCard>

        {/* Breakdowns */}
        <View style={styles.breakdownGrid}>
          <GradientCard variant="minimal" style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>By Venue</Text>
            <View style={styles.breakdownList}>
              {['Velvet Lounge', 'Neon Room', 'Crystal Palace'].map((v, i) => (
                <View key={i} style={styles.breakdownRow}>
                  <Text style={styles.breakdownName}>{v}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(5200 - i * 600)}</Text>
                </View>
              ))}
            </View>
          </GradientCard>

          <GradientCard variant="minimal" style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>By Outfit</Text>
            <View style={styles.breakdownList}>
              {['Midnight Sparkle', 'Rose Quartz', 'Onyx Flair'].map((v, i) => (
                <View key={i} style={styles.breakdownRow}>
                  <Text style={styles.breakdownName}>{v}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(4200 - i * 550)}</Text>
                </View>
              ))}
            </View>
          </GradientCard>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: Colors.spacing.md },
  header: { marginBottom: Colors.spacing.md },
  headerGradient: { borderRadius: Colors.borderRadius.lg, overflow: 'hidden' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Colors.spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Colors.spacing.md },
  heading: { color: Colors.white, fontSize: Colors.typography.fontSize.xl, fontWeight: Colors.typography.fontWeight.bold },
  subheading: { color: Colors.white, opacity: 0.85, fontSize: Colors.typography.fontSize.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Colors.spacing.sm },
  refreshButton: { padding: Colors.spacing.sm, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Colors.borderRadius.md },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Colors.spacing.md },
  kpiCard: { flex: 1, minWidth: 160 },
  kpiContent: { flexDirection: 'row', alignItems: 'center', gap: Colors.spacing.md },
  kpiIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  kpiText: { flex: 1 },
  kpiValue: { color: Colors.text, fontSize: Colors.typography.fontSize.lg, fontWeight: Colors.typography.fontWeight.bold },
  kpiLabel: { color: Colors.textMuted, fontSize: Colors.typography.fontSize.xs },

  sectionCard: { marginTop: Colors.spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Colors.spacing.sm },
  sectionTitle: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.md, fontWeight: Colors.typography.fontWeight.semibold },

  trendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: Colors.spacing.sm, minHeight: 160 },
  trendBar: { alignItems: 'center', flex: 1 },
  trendFill: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: Colors.gradientPrimary, marginBottom: 6 },
  trendLabel: { color: Colors.textMuted, fontSize: 10 },

  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Colors.spacing.md, marginTop: Colors.spacing.md },
  breakdownCard: { flex: 1, minWidth: 220 },
  breakdownTitle: { color: Colors.textSecondary, fontSize: Colors.typography.fontSize.sm, fontWeight: Colors.typography.fontWeight.medium, marginBottom: Colors.spacing.sm },
  breakdownList: { gap: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownName: { color: Colors.text, fontSize: Colors.typography.fontSize.sm },
  breakdownValue: { color: Colors.text, fontSize: Colors.typography.fontSize.sm, fontWeight: Colors.typography.fontWeight.semibold },
});