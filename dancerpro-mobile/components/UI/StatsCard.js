import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import GradientCard from './GradientCard';
import AnimatedNumber from './AnimatedNumber';

const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  variant = 'primary',
  format = 'currency',
  trend,
  trendValue,
  size = 'md',
  animated = true,
  loading = false,
  style = {},
  onPress
}) => {
  const formatValueForAccessibility = (val, fmt) => {
    try {
      if (fmt === 'currency') {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val || 0));
      }
      if (fmt === 'integer') {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(val || 0));
      }
      return String(val ?? '');
    } catch (e) {
      return String(val ?? '');
    }
  };

  const accessibilityLabel = [
    title,
    formatValueForAccessibility(value, format),
    subtitle ? `, ${subtitle}` : '',
    trend && trendValue !== undefined ? `, ${trend === 'up' ? 'up' : 'down'} ${Math.abs(trendValue)}${trendValue.toString().includes('%') ? '' : '%'}` : ''
  ].join('');
  const getTrendColor = () => {
    if (!trend) return Colors.textSecondary;
    return trend === 'up' ? Colors.success : Colors.error;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? '↑' : '↓';
  };

  // Loading skeleton state
  if (loading) {
    return (
      <GradientCard
        variant={variant}
        style={[styles.card, style]}
        animated={animated}
        onPress={onPress}
        accessible
        accessibilityRole={onPress ? 'button' : 'summary'}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
          </View>
          <View style={styles.skeletonValue} />
          <View style={styles.footer}>
            <View style={styles.skeletonSubtitle} />
            <View style={styles.skeletonTrend} />
          </View>
        </View>
      </GradientCard>
    );
  }

  return (
    <GradientCard
      variant={variant}
      style={[styles.card, style]}
      animated={animated}
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </View>
        
        <AnimatedNumber
          value={value}
          format={format}
          size={size}
          variant={variant === 'glass' ? 'primary' : variant}
          animated={animated}
          style={styles.value}
        />
        
        {(subtitle || trend) && (
          <View style={styles.footer}>
            {subtitle && (
              <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
            
            {trend && trendValue && (
              <View style={styles.trendContainer}>
                <Text style={[styles.trendText, { color: getTrendColor() }]}>
                  {getTrendIcon()} {Math.abs(trendValue)}{trendValue.toString().includes('%') ? '' : '%'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 120,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Colors.spacing.sm,
  },
  title: {
    fontSize: Colors.typography.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  iconContainer: {
    marginLeft: Colors.spacing.sm,
  },
  value: {
    fontSize: Colors.typography.xl,
    fontWeight: '700',
    marginBottom: Colors.spacing.xs,
  },
  // Skeleton styles
  skeletonValue: {
    height: 28,
    borderRadius: Colors.borderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
    marginVertical: Colors.spacing.xs,
  },
  skeletonSubtitle: {
    width: '40%',
    height: 12,
    borderRadius: Colors.borderRadius.xs,
    backgroundColor: Colors.surfaceSecondary,
  },
  skeletonTrend: {
    width: 50,
    height: 12,
    borderRadius: Colors.borderRadius.xs,
    backgroundColor: Colors.surfaceSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Colors.spacing.xs,
  },
  subtitle: {
    fontSize: Colors.typography.xs,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: Colors.typography.xs,
    fontWeight: '600',
  },
});

export default React.memo(StatsCard);