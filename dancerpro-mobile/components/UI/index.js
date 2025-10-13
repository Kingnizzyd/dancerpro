import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Platform } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing, Shadows } from '../../constants/Colors';

// Export new modern components
export { GradientButton } from './GradientButton';
export { GradientCard } from './GradientCard';
export { ModernInput } from './ModernInput';

// Tag Component - Updated with modern styling
export const Tag = ({ children, style, variant = 'default', ...props }) => {
  const getTagStyle = () => {
    switch (variant) {
      case 'accent':
        return [styles.tag, styles.tagAccent];
      case 'success':
        return [styles.tag, styles.tagSuccess];
      case 'warning':
        return [styles.tag, styles.tagWarning];
      case 'error':
        return [styles.tag, styles.tagError];
      default:
        return [styles.tag];
    }
  };

  return (
    <View style={[getTagStyle(), style]} {...props}>
      <Text style={[styles.tagText, variant === 'accent' && styles.tagTextDark]}>
        {children}
      </Text>
    </View>
  );
};

// Button Component - Updated with modern styling
export const Button = ({ title, onPress, style, disabled, variant = 'primary', size = 'medium', ...props }) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    }

    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        break;
      case 'accent':
        baseStyle.push(styles.buttonAccent);
        break;
      case 'outline':
        baseStyle.push(styles.buttonOutline);
        break;
      default:
        baseStyle.push(styles.buttonPrimary);
    }

    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];
    
    if (size === 'small') {
      baseStyle.push(styles.buttonTextSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonTextLarge);
    }

    if (variant === 'accent') {
      baseStyle.push(styles.buttonTextDark);
    } else if (variant === 'outline') {
      baseStyle.push(styles.buttonTextOutline);
    }

    if (disabled) {
      baseStyle.push(styles.buttonTextDisabled);
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
      <Text style={getTextStyle()}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// Input Component
export const Input = ({ placeholder, value, onChangeText, style, ...props }) => (
  <TextInput
    style={[styles.input, style]}
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    {...props}
  />
);

// Card Component
export const Card = ({ children, style, ...props }) => (
  <View style={[styles.card, style]} {...props}>
    {children}
  </View>
);

// Toast Component
export const Toast = ({ message, type = 'info', visible, onAction, actionLabel }) => {
  if (!visible || !message) return null;
  
  return (
    <View style={[styles.toast, type === 'error' && styles.toastError]}>
      <Text style={styles.toastText}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.toastAction}>
          <Text style={styles.toastActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Segmented Component
export const Segmented = ({ options, selectedIndex, onSelectionChange, style, value, onChange }) => {
  // Support both old API (selectedIndex/onSelectionChange) and new API (value/onChange)
  const currentValue = value !== undefined ? value : selectedIndex;
  const handleChange = onChange || onSelectionChange;
  
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option, index) => {
        const isObject = typeof option === 'object';
        const optionValue = isObject ? option.value : option;
        const optionLabel = isObject ? option.label : option;
        const isSelected = value !== undefined 
          ? optionValue === currentValue 
          : index === selectedIndex;
        
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.segmentedOption,
              isSelected && styles.segmentedOptionSelected
            ]}
            onPress={() => {
              if (value !== undefined) {
                handleChange(optionValue);
              } else {
                handleChange(index);
              }
            }}
          >
            <Text
              style={[
                styles.segmentedText,
                isSelected && styles.segmentedTextSelected
              ]}
            >
              {optionLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Tag Styles
  tag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagAccent: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  tagSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  tagWarning: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  tagError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  tagTextDark: {
    color: Colors.background,
  },

  // Button Styles
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...Shadows.small,
  },
  buttonSmall: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  buttonLarge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  buttonPrimary: {
    backgroundColor: Colors.buttonPrimary,
  },
  buttonSecondary: {
    backgroundColor: Colors.buttonSecondary,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  buttonAccent: {
    backgroundColor: Colors.buttonAccent,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.buttonPrimaryText,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  buttonTextSmall: {
    fontSize: Typography.fontSize.sm,
  },
  buttonTextLarge: {
    fontSize: Typography.fontSize.lg,
  },
  buttonTextDark: {
    color: Colors.buttonAccentText,
  },
  buttonTextOutline: {
    color: Colors.primary,
  },
  buttonTextDisabled: {
    color: Colors.textMuted,
  },

  // Input Styles
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.md,
    backgroundColor: Colors.inputBackground,
    color: Colors.inputText,
    minHeight: 48,
  },

  // Segmented Control Styles
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentedOptionSelected: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  segmentedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  segmentedTextSelected: {
    color: Colors.text,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Card Styles
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.medium,
  },

  // Toast Styles
  toast: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    margin: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.large,
  },
  toastError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  toastText: {
    color: Colors.text,
    fontSize: Typography.fontSize.sm,
    flex: 1,
    fontWeight: Typography.fontWeight.medium,
  },
  toastAction: {
    marginLeft: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  toastActionText: {
    color: Colors.textAccent,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});