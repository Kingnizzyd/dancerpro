import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/Colors';

/**
 * Lightweight responsive trend chart using SVG on web and simple bars on native.
 * Props:
 * - series: [{ x: Date|string|number, y: number }]
 * - showMA7: boolean
 * - showMA30: boolean
 * - height: number
 */
export const TrendChart = ({ series = [], showMA7 = true, showMA30 = false, height = 220, style, loading = false }) => {
  const [hoverIdx, setHoverIdx] = useState(null);

  const points = useMemo(() => {
    const arr = (series || []).map(p => ({ x: new Date(p.x).getTime(), y: Number(p.y || 0) }))
      .sort((a, b) => a.x - b.x);
    const minY = Math.min(0, ...arr.map(p => p.y));
    const maxY = Math.max(1, ...arr.map(p => p.y));
    return { arr, minY, maxY };
  }, [series]);

  const computeMA = (windowSize) => {
    const out = [];
    const arr = points.arr;
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const slice = arr.slice(start, i + 1);
      const avg = slice.reduce((sum, p) => sum + p.y, 0) / (slice.length || 1);
      out.push({ x: arr[i].x, y: avg });
    }
    return out;
  };

  const ma7 = useMemo(() => computeMA(7), [points.arr]);
  const ma30 = useMemo(() => computeMA(30), [points.arr]);

  const trendSummary = useMemo(() => {
    if (!points.arr.length) return 'no data';
    const first = points.arr[0].y;
    const last = points.arr[points.arr.length - 1].y;
    const delta = last - first;
    const dir = delta > 0 ? 'rising' : delta < 0 ? 'falling' : 'flat';
    return `${dir} by $${Math.abs(Math.round(delta))}`;
  }, [points.arr]);

  // Skeleton placeholder for loading state (cross-platform)
  if (loading) {
    const baseHeights = [24, 48, 36, 64, 40, 58, 30];
    return (
      <View style={[styles.nativeContainer, { height }, style]} accessible accessibilityLabel={`Earnings trend chart loading placeholder`}>
        <View style={styles.nativeBars}>
          {baseHeights.map((hgt, i) => (
            <View key={i} style={styles.nativeBarWrap}>
              <View style={[styles.skeletonBar, { height: hgt }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (Platform.OS !== 'web') {
    // Simple native fallback: bar chart
    const maxY = points.maxY || 1;
    return (
      <View style={[styles.nativeContainer, { height }, style]} accessible accessibilityLabel={`Earnings trend chart, ${trendSummary}`}>
        <View style={styles.nativeBars}>
          {points.arr.map((p, i) => (
            <View key={i} style={styles.nativeBarWrap}>
              <View style={[styles.nativeBar, { height: Math.max(6, (p.y / maxY) * (height - 40)) }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Web SVG rendering
  const width = '100%';
  const padding = 24;
  const h = height;
  const minY = points.minY;
  const maxY = points.maxY || 1;
  const rangeY = Math.max(1, maxY - minY);
  const toY = (y) => h - padding - ((y - minY) / rangeY) * (h - 2 * padding);
  const toX = (i) => padding + i * ((800 - 2 * padding) / Math.max(1, points.arr.length - 1)); // 800 used for path scale; viewBox handles responsive

  const buildPath = (arr) => {
    if (!arr.length) return '';
    return arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.y)}`).join(' ');
  };

  const mainPath = buildPath(points.arr);
  const ma7Path = showMA7 ? buildPath(ma7) : '';
  const ma30Path = showMA30 ? buildPath(ma30) : '';

  return (
    <View style={[styles.container, style]} accessible accessibilityLabel={`Earnings trend chart, ${trendSummary}`}>
      <svg viewBox={`0 0 800 ${h}`} preserveAspectRatio="none" style={{ width, height: h }}>
        <defs>
          <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={Colors.gradientPrimary} stopOpacity="0.35" />
            <stop offset="100%" stopColor={Colors.gradientSecondary} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
          <line key={idx} x1={padding} x2={800 - padding} y1={padding + t * (h - 2 * padding)} y2={padding + t * (h - 2 * padding)} stroke={Colors.border} strokeOpacity="0.3" />
        ))}
        {/* Main series */}
        <path d={mainPath} fill="none" stroke={Colors.primary} strokeWidth="2" />
        {/* Area fill */}
        {points.arr.length > 1 && (
          <path d={`${mainPath} L ${toX(points.arr.length - 1)} ${h - padding} L ${toX(0)} ${h - padding} Z`} fill="url(#gradFill)" opacity="0.35" />
        )}
        {/* Moving averages */}
        {showMA7 && <path d={ma7Path} fill="none" stroke={Colors.accent} strokeWidth="1.5" strokeDasharray="4 3" />}
        {showMA30 && <path d={ma30Path} fill="none" stroke={Colors.neon} strokeWidth="1.5" strokeDasharray="2 4" />}

        {/* Hover points */}
        {points.arr.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.y)} r={hoverIdx === i ? 4 : 2.5} fill={Colors.primary} opacity={hoverIdx === i ? 0.95 : 0.6}
                  onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
        ))}
      </svg>
      {hoverIdx != null && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {new Date(points.arr[hoverIdx].x).toLocaleDateString()} • ${Math.round(points.arr[hoverIdx].y)}
          </Text>
        </View>
      )}
      <View style={styles.legend}>
        <View style={[styles.legendItem]}><View style={[styles.legendSwatch, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>Earnings</Text></View>
        {showMA7 && <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.accent }]} /><Text style={styles.legendText}>MA(7)</Text></View>}
        {showMA30 && <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.neon }]} /><Text style={styles.legendText}>MA(30)</Text></View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  legend: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: BorderRadius.round },
  legendText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
  tooltip: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border },
  tooltipText: { color: Colors.text, fontSize: Typography.fontSize.xs },
  nativeContainer: { width: '100%', backgroundColor: Colors.cardBackground, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.sm },
  nativeBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  nativeBarWrap: { flex: 1, alignItems: 'center' },
  nativeBar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: Colors.gradientPrimary },
});

export default React.memo(TrendChart);