import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/Colors';

export const GradientCard = ({ 
  children, 
  style, 
  variant = 'default', // 'default', 'accent', 'glow', 'minimal', 'warm', 'coral'
  padding = 'medium', // 'small', 'medium', 'large'
  ...props 
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'accent':
        return [Colors.accent, Colors.accentSecondary];
      case 'warm':
        return ['rgba(232, 168, 124, 0.15)', 'rgba(242, 196, 161, 0.08)', 'rgba(37, 37, 37, 0.95)'];
      case 'coral':
        return ['rgba(255, 107, 157, 0.12)', 'rgba(125, 211, 252, 0.06)', 'rgba(37, 37, 37, 0.95)'];
      case 'glow':
        return ['rgba(177, 156, 217, 0.12)', 'rgba(212, 196, 232, 0.06)', 'rgba(37, 37, 37, 0.95)'];
      case 'minimal':
        return ['rgba(37, 37, 37, 0.98)', 'rgba(47, 47, 47, 0.95)'];
      default:
        return ['rgba(37, 37, 37, 0.95)', 'rgba(42, 31, 42, 0.85)', 'rgba(37, 37, 37, 0.98)'];
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
    } else if (variant === 'warm') {
      baseStyle.push(styles.cardWarm);
    } else if (variant === 'coral') {
      baseStyle.push(styles.cardCoral);
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
    borderColor: Colors.accent,
    ...Shadows.neon,
  },
  cardWarm: {
    borderColor: Colors.borderWarm,
    shadowColor: Colors.glowWarm,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cardCoral: {
    borderColor: Colors.neon,
    shadowColor: Colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  gradient: {
    minHeight: 60,
  },
});

export default GradientCard;