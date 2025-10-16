import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/Colors';

const GradientCard = ({ 
  children, 
  style = {}, 
  variant = 'primary', 
  onPress,
  animated = false,
  hoverEffect = false,
  ...props 
}) => {
  const [scale] = useState(new Animated.Value(1));
  const [opacity] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.98,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'secondary':
        return [Colors.surfaceSecondary, Colors.surfaceTertiary];
      case 'accent':
        return [Colors.accent, Colors.accentSecondary];
      case 'warm':
        return [Colors.gradientWarmStart, Colors.gradientWarmEnd];
      case 'coral':
        return [Colors.gradientCoralStart, Colors.gradientCoralEnd];
      case 'glow':
        return [Colors.gradientGlowStart, Colors.gradientGlowEnd];
      case 'minimal':
        return ['transparent', 'transparent'];
      case 'glass':
        return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
      case 'premium':
        return [Colors.gradientPremiumStart, Colors.gradientPremiumEnd];
      case 'vip':
        return [Colors.gradientVipStart, Colors.gradientVipEnd];
      case 'elite':
        return [Colors.gradientEliteStart, Colors.gradientEliteEnd];
      default:
        return [Colors.gradientPrimary, Colors.gradientSecondary];
    }
  };

  const getBorderStyle = () => {
    if (variant === 'minimal') {
      return {
        borderWidth: 1,
        borderColor: Colors.border,
      };
    }
    if (variant === 'glass') {
      return {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };
    }
    return {};
  };

  const getShadowStyle = () => {
    if (variant === 'glass') {
      return {
        shadowColor: Colors.glow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      };
    }
    return {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    };
  };

  const content = (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        style={[
          styles.card,
          getBorderStyle(),
          getShadowStyle(),
          hoverEffect && styles.hoverEffect,
          style,
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={animated ? 1 : 0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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