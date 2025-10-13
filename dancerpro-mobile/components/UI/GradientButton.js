import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius, Shadows } from '../../constants/Colors';

export const GradientButton = ({ 
  title, 
  onPress, 
  style, 
  textStyle,
  disabled = false,
  variant = 'primary', // 'primary', 'secondary', 'accent'
  size = 'medium', // 'small', 'medium', 'large'
  ...props 
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'secondary':
        return [Colors.gradientSecondary, Colors.gradientTertiary];
      case 'accent':
        return [Colors.accent, Colors.accentSecondary];
      default:
        return [Colors.gradientPrimary, Colors.gradientSecondary];
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    } else {
      baseStyle.push(styles.buttonMedium);
    }

    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];
    
    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.textLarge);
    } else {
      baseStyle.push(styles.textMedium);
    }

    if (variant === 'accent') {
      baseStyle.push(styles.textDark);
    }

    if (disabled) {
      baseStyle.push(styles.textDisabled);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <LinearGradient
        colors={disabled ? ['#666666', '#444444'] : getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  buttonSmall: {
    height: 36,
    minWidth: 80,
  },
  buttonMedium: {
    height: 48,
    minWidth: 120,
  },
  buttonLarge: {
    height: 56,
    minWidth: 160,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  textSmall: {
    fontSize: Typography.fontSize.sm,
  },
  textMedium: {
    fontSize: Typography.fontSize.md,
  },
  textLarge: {
    fontSize: Typography.fontSize.lg,
  },
  textDark: {
    color: Colors.background,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default GradientButton;