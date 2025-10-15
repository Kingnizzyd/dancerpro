import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientCard, GradientButton } from '../components/UI';
import { Colors } from '../constants/Colors';

export default function AIInsights() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const insights = [
    {
      id: 1,
      type: 'performance',
      title: 'Peak Performance Days',
      insight: 'Your best earning days are Friday and Saturday nights',
      confidence: 92,
      icon: 'trending-up-outline',
      color: Colors.success
    },
    {
      id: 2,
      type: 'optimization',
      title: 'Outfit ROI Analysis',
      insight: 'Midnight Sparkle outfit shows 340% ROI - consider similar styles',
      confidence: 87,
      icon: 'sparkles-outline',
      color: Colors.primary
    },
    {
      id: 3,
      type: 'prediction',
      title: 'Revenue Forecast',
      insight: 'Based on trends, expect $1,200-1,500 this weekend',
      confidence: 78,
      icon: 'analytics-outline',
      color: Colors.accent
    },
    {
      id: 4,
      type: 'client',
      title: 'Client Behavior',
      insight: 'VIP clients prefer bookings 2-3 days in advance',
      confidence: 85,
      icon: 'people-outline',
      color: Colors.warning
    }
  ];

  const recommendations = [
    {
      id: 1,
      title: 'Schedule More Weekend Shifts',
      description: 'Your weekend earnings are 240% higher than weekdays',
      priority: 'high',
      action: 'View Schedule'
    },
    {
      id: 2,
      title: 'Invest in Similar Outfits',
      description: 'Sparkly/sequined outfits show highest ROI',
      priority: 'medium',
      action: 'Browse Outfits'
    },
    {
      id: 3,
      title: 'Focus on VIP Clients',
      description: '20% of clients generate 60% of revenue',
      priority: 'high',
      action: 'View Clients'
    }
  ];

  const metrics = [
    { label: 'AI Confidence', value: '87%', icon: 'checkmark-circle-outline' },
    { label: 'Predictions Made', value: '24', icon: 'bulb-outline' },
    { label: 'Accuracy Rate', value: '91%', icon: 'speedometer-outline' },
    { label: 'Insights Generated', value: '156', icon: 'stats-chart-outline' }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics-outline" size={28} color="white" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Insights</Text>
              <Text style={styles.headerSubtitle}>Intelligent performance analysis</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        <Text style={styles.sectionTitle}>Analysis Period</Text>
        <View style={styles.periodButtons}>
          {['7d', '30d', '90d'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Metrics */}
      <View style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <GradientCard key={index} variant="minimal" padding="small" style={styles.metricCard}>
            <View style={styles.metricContent}>
              <Ionicons name={metric.icon} size={24} color={Colors.primary} />
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          </GradientCard>
        ))}
      </View>

      {/* Key Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {insights.map((insight) => (
          <GradientCard key={insight.id} variant="glow" padding="medium" style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIcon}>
                <Ionicons name={insight.icon} size={20} color={insight.color} />
              </View>
              <View style={styles.insightTitleContainer}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceText}>{insight.confidence}% confidence</Text>
                </View>
              </View>
            </View>
            <Text style={styles.insightText}>{insight.insight}</Text>
          </GradientCard>
        ))}
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        
        {recommendations.map((rec) => (
          <GradientCard key={rec.id} variant="warm" padding="medium" style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
              </View>
              <View style={[
                styles.priorityBadge,
                rec.priority === 'high' ? styles.priorityHigh : styles.priorityMedium
              ]}>
                <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
              </View>
            </View>
            <GradientButton
              title={rec.action}
              onPress={() => {}}
              style={styles.actionButton}
            />
          </GradientCard>
        ))}
      </View>

      {/* AI Learning Status */}
      <GradientCard style={styles.learningCard} variant="accent" padding="large">
        <View style={styles.learningHeader}>
          <Ionicons name="school-outline" size={24} color={Colors.primary} />
          <Text style={styles.learningTitle}>AI Learning Progress</Text>
        </View>
        <Text style={styles.learningText}>
          Your AI assistant is continuously learning from your performance data to provide better insights.
        </Text>
        <View style={styles.learningProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '87%' }]} />
          </View>
          <Text style={styles.progressText}>87% Complete</Text>
        </View>
      </GradientCard>
    </ScrollView>
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
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodSelector: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodButtonTextActive: {
    color: 'white',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 16,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  metricLabel: {
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
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  insightCard: {
    padding: 16,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTitleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confidenceContainer: {
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  insightText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  recommendationCard: {
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationContent: {
    flex: 1,
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityHigh: {
    backgroundColor: Colors.error + '20',
  },
  priorityMedium: {
    backgroundColor: Colors.warning + '20',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
  },
  actionButton: {
    marginTop: 8,
  },
  learningCard: {
    margin: 20,
    padding: 20,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  learningText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  learningProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});

