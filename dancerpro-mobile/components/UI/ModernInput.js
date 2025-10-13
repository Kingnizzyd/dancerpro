import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/Colors';

export const ModernInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  style, 
  label,
  error,
  variant = 'default', // 'default', 'glow', 'minimal'
  size = 'medium', // 'small', 'medium', 'large'
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getBorderColor = () => {
    if (error) return Colors.error;
    if (isFocused) return Colors.primary;
    return Colors.inputBorder;
  };

  const getInputStyle = () => {
    const baseStyle = [styles.input];
    
    if (size === 'small') {
      baseStyle.push(styles.inputSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.inputLarge);
    } else {
      baseStyle.push(styles.inputMedium);
    }

    if (variant === 'glow' && isFocused) {
      baseStyle.push(styles.inputGlow);
    }

    return baseStyle;
  };

  const renderInput = () => {
    if (variant === 'glow') {
      return (
        <View style={[styles.gradientContainer, { borderColor: getBorderColor() }]}>
          <LinearGradient
            colors={isFocused ? [Colors.gradientPrimary, Colors.gradientSecondary] : ['rgba(26, 26, 26, 0.9)', 'rgba(26, 26, 26, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <TextInput
              style={[getInputStyle(), styles.gradientInput]}
              placeholder={placeholder}
              placeholderTextColor={Colors.inputPlaceholder}
              value={value}
              onChangeText={onChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />
          </LinearGradient>
        </View>
      );
    }

    return (
      <TextInput
        style={[
          getInputStyle(),
          { borderColor: getBorderColor() },
          style
        ]}
        placeholder={placeholder}
        placeholderTextColor={Colors.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[
          styles.label,
          isFocused && styles.labelFocused,
          error && styles.labelError
        ]}>
          {label}
        </Text>
      )}
      {renderInput()}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  labelFocused: {
    color: Colors.primary,
  },
  labelError: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.md,
    color: Colors.inputText,
    fontWeight: Typography.fontWeight.regular,
  },
  inputSmall: {
    height: 40,
    fontSize: Typography.fontSize.sm,
  },
  inputMedium: {
    height: 48,
  },
  inputLarge: {
    height: 56,
    fontSize: Typography.fontSize.lg,
  },
  inputGlow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
  },
  gradientInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default ModernInput;