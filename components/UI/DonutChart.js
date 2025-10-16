import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Colors } from '../../constants/Colors';

// Simple, lightweight DonutChart for distribution visuals (clients/venues/etc.)
// Props:
// - data: Array<{ label: string, value: number, color?: string }>
// - size: number (px), default 160
// - thickness: number (ring width), default 18
// - showCenterTotal: boolean
// - centerLabel: string (optional)
// - loading: boolean (renders skeleton ring and placeholder labels)
// - accessibilityLabel: string (optional)
// - style: ViewStyle
// - legend: boolean (renders simple legend under chart)
// - maxSlices: number (combine small slices into "Other")
const DonutChart = ({
  data = [],
  size = 160,
  thickness = 18,
  showCenterTotal = true,
  centerLabel,
  loading = false,
  accessibilityLabel,
  style,
  legend = true,
  maxSlices = 6,
}) => {
  const radius = size / 2;
  const innerRadius = radius - thickness;

  const processed = useMemo(() => {
    if (!data || data.length === 0) return { slices: [], total: 0 };
    const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    if (total <= 0) return { slices: [], total: 0 };

    // Sort by value desc
    const sorted = [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
    // Limit slices, group remainder as Other
    const top = sorted.slice(0, maxSlices);
    const remainder = sorted.slice(maxSlices);
    const otherValue = remainder.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const slices = [...top];
    if (otherValue > 0) {
      slices.push({ label: 'Other', value: otherValue, color: Colors.gray[500] || '#888' });
    }
    return { slices, total };
  }, [data, maxSlices]);

  const paths = useMemo(() => {
    const { slices, total } = processed;
    if (loading) return [];
    if (!slices.length || total <= 0) return [];
    let startAngle = -Math.PI / 2; // start at top
    const res = [];
    slices.forEach((s) => {
      const angle = (s.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;
      const x0 = radius + innerRadius * Math.cos(startAngle);
      const y0 = radius + innerRadius * Math.sin(startAngle);
      const x1 = radius + innerRadius * Math.cos(endAngle);
      const y1 = radius + innerRadius * Math.sin(endAngle);
      const xo = radius + radius * Math.cos(startAngle);
      const yo = radius + radius * Math.sin(startAngle);
      const x2 = radius + radius * Math.cos(endAngle);
      const y2 = radius + radius * Math.sin(endAngle);
      const d = [
        `M ${x0} ${y0}`,
        `L ${xo} ${yo}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x1} ${y1}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x0} ${y0}`,
        'Z',
      ].join(' ');
      res.push({ d, color: s.color || Colors.chart?.slice || Colors.accent, label: s.label, value: s.value, pct: (s.value / total) * 100 });
      startAngle = endAngle;
    });
    return res;
  }, [processed, loading, radius, innerRadius]);

  const totalLabel = useMemo(() => {
    const t = processed.total || 0;
    // Format compact currency style by default
    if (t >= 1_000_000) return `$${(t / 1_000_000).toFixed(1)}M`;
    if (t >= 1_000) return `$${(t / 1_000).toFixed(1)}K`;
    return `$${Math.round(t)}`;
  }, [processed.total]);

  const accessibilityText = useMemo(() => {
    if (accessibilityLabel) return accessibilityLabel;
    if (!processed.total) return 'Donut chart: no data';
    const parts = processed.slices.map(s => `${s.label} ${Math.round((s.value / processed.total) * 100)} percent`).join(', ');
    return `Donut chart showing distribution: ${parts}. Total ${processed.total}.`;
  }, [accessibilityLabel, processed]);

  const skeletonColor = Colors.skeleton?.background || 'rgba(200,200,200,0.25)';
  const skeletonShimmer = Colors.skeleton?.highlight || 'rgba(255,255,255,0.35)';

  return (
    <View style={[{ alignItems: 'center' }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityText}
    >
      {loading ? (
        <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: skeletonColor, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size - 8, height: size - 8, borderRadius: radius - 4, borderWidth: thickness, borderColor: skeletonShimmer }} />
        </View>
      ) : (
        <Svg width={size} height={size}>
          <G>
            {/* Background ring */}
            <Circle cx={radius} cy={radius} r={radius} fill={Colors.chart?.background || Colors.card} />
            <Circle cx={radius} cy={radius} r={innerRadius} fill={Colors.background || '#111'} />
            {/* Slices */}
            {paths.map((p, idx) => (
              <Path key={`slice-${idx}`} d={p.d} fill={p.color} />
            ))}
          </G>
        </Svg>
      )}
      {showCenterTotal && (
        <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18 }}>{centerLabel || 'Total'}</Text>
          <Text style={{ color: Colors.textSecondary, fontWeight: '700', fontSize: 16 }}>{totalLabel}</Text>
        </View>
      )}
      {legend && (
        <View style={{ marginTop: 10, width: '100%' }}>
          {processed.slices.map((s, idx) => (
            <View key={`legend-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color || Colors.accent, marginRight: 8 }} />
              <Text style={{ color: Colors.text, fontWeight: '600', flex: 1 }}>{s.label}</Text>
              <Text style={{ color: Colors.textSecondary }}>{Math.round((s.value / (processed.total || 1)) * 100)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default React.memo(DonutChart);