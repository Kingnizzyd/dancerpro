import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/Colors';

/**
 * Minimal donut chart using SVG stroke segments (web) and stacked rings (native).
 * Props:
 * - data: [{ label: string, value: number, color?: string }]
 * - size?: number
 */
export const DonutChart = ({ data = [], size = 180, style, centerLabel }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const series = useMemo(() => {
    const arr = (data || []).map(d => ({ label: String(d.label || ''), value: Number(d.value || 0), color: d.color || Colors.primary }));
    const total = Math.max(1, arr.reduce((s, a) => s + a.value, 0));
    return { arr, total };
  }, [data]);

  if (Platform.OS !== 'web') {
    // Native fallback: render legend only
    return (
      <View style={[styles.nativeContainer, style]}>
        <Text style={styles.centerText}>{centerLabel || 'Breakdown'}</Text>
        {series.arr.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>{d.label}: {Math.round(d.value)}</Text>
          </View>
        ))}
      </View>
    );
  }

  const radius = size / 2 - 12;
  const cx = size / 2; const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <View style={[styles.container, style]}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={radius} fill={Colors.surface} stroke={Colors.border} strokeWidth={1} />
        {series.arr.map((d, i) => {
          const frac = d.value / series.total;
          const dash = frac * circumference;
          const offset = circumference - offsetAcc;
          offsetAcc += dash;
          return (
            <circle key={i}
              cx={cx} cy={cy} r={radius}
              fill="transparent"
              stroke={d.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={Colors.textSecondary}>{centerLabel || 'Total'}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={Colors.textSecondary}>{Math.round(series.total)}</text>
      </svg>
      {hoverIdx != null && (
        <View style={styles.tooltip}><Text style={styles.tooltipText}>{series.arr[hoverIdx].label}: {Math.round(series.arr[hoverIdx].value)}</Text></View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  nativeContainer: { width: '100%', backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: BorderRadius.round },
  legendText: { color: Colors.text, fontSize: Typography.fontSize.sm },
  centerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  tooltip: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  tooltipText: { color: Colors.text, fontSize: Typography.fontSize.xs },
});

export default DonutChart;