import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/Colors';

export const GradientCard = ({ 
  children, 
  style, 
  variant = 'default', // 'default', 'accent', 'glow', 'minimal'
  padding = 'medium', // 'small', 'medium', 'large'
  ...props 
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'accent':
        return [Colors.accent, Colors.accentSecondary];
      case 'glow':
        return ['rgba(177, 156, 217, 0.1)', 'rgba(230, 179, 255, 0.05)', 'rgba(26, 26, 26, 0.9)'];
      case 'minimal':
        return ['rgba(26, 26, 26, 0.95)', 'rgba(37, 37, 37, 0.9)'];
      default:
        return ['rgba(26, 26, 26, 0.9)', 'rgba(42, 26, 42, 0.8)', 'rgba(26, 26, 26, 0.95)'];
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'small':
        return Spacing.md;
      case 'large':
        return Spacing.xl;
      default:
        return Spacing.lg;
    }
  };

  const getCardStyle = () => {
    const baseStyle = [styles.card];
    
    if (variant === 'glow') {
      baseStyle.push(styles.cardGlow);
    } else if (variant === 'accent') {
      baseStyle.push(styles.cardAccent);
    }

    return baseStyle;
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { padding: getPadding() }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  cardGlow: {
    borderColor: Colors.borderAccent,
    ...Shadows.glow,
  },
  cardAccent: {
    borderColor: Colors.secondary,
    ...Shadows.neon,
  },
  gradient: {
    minHeight: 60,
  },
});

export default GradientCard;