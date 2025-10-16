import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/Colors';

/**
 * Simple responsive bar chart with hover tooltip (web) and fallback bars (native).
 * Props:
 * - data: [{ label: string, value: number, color?: string }]
 * - height?: number
 */
export const BarChart = ({ data = [], height = 180, style }) => {
  const [hoverIdx, setHoverIdx] = useState(null);

  const series = useMemo(() => {
    const arr = (data || []).map(d => ({ label: String(d.label || ''), value: Number(d.value || 0), color: d.color || Colors.primary }));
    const max = Math.max(1, ...arr.map(a => a.value));
    return { arr, max };
  }, [data]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.nativeContainer, { height }, style]}>
        <View style={styles.nativeBars}>
          {series.arr.map((d, i) => (
            <View key={i} style={styles.nativeBarWrap}>
              <View style={[styles.nativeBar, { height: Math.max(6, (d.value / series.max) * (height - 40)), backgroundColor: d.color }]} />
              <Text style={styles.nativeLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Web SVG
  const width = 800;
  const padX = 24;
  const padY = 20;
  const h = height;
  const barW = Math.max(12, (width - 2 * padX) / Math.max(1, series.arr.length) - 8);
  const toX = (i) => padX + i * ((width - 2 * padX) / Math.max(1, series.arr.length));
  const toH = (v) => Math.max(4, (v / series.max) * (h - 2 * padY));

  return (
    <View style={[styles.container, style]}>
      <svg viewBox={`0 0 ${width} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((t, idx) => (
          <line key={idx} x1={padX} x2={width - padX} y1={padY + t * (h - 2 * padY)} y2={padY + t * (h - 2 * padY)} stroke={Colors.border} strokeOpacity="0.3" />
        ))}
        {series.arr.map((d, i) => (
          <g key={i} transform={`translate(${toX(i)}, ${h - padY - toH(d.value)})`}>
            <rect width={barW} height={toH(d.value)} fill={d.color} rx="4"
              onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
            <text x={barW / 2} y={toH(d.value) + 14} fontSize="10" fill={Colors.textSecondary} textAnchor="middle">{d.label}</text>
          </g>
        ))}
      </svg>
      {hoverIdx != null && (
        <View style={styles.tooltip}><Text style={styles.tooltipText}>{series.arr[hoverIdx].label}: {Math.round(series.arr[hoverIdx].value)}</Text></View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  nativeContainer: { width: '100%', backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.sm },
  nativeBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  nativeBarWrap: { flex: 1, alignItems: 'center' },
  nativeBar: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  nativeLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 4 },
  tooltip: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  tooltipText: { color: Colors.text, fontSize: Typography.fontSize.xs },
});

export default BarChart;