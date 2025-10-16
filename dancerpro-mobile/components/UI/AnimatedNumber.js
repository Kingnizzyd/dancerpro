import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

const AnimatedNumber = ({ 
  value, 
  duration = 1000, 
  format = 'currency',
  style = {},
  variant = 'primary',
  size = 'md',
  animated = true,
  delay = 0,
  ...props 
}) => {
  const [displayValue] = useState(new Animated.Value(0));
  const previousValue = useRef(0);
  const [textValue, setTextValue] = useState('0');

  const formatNumber = (num) => {
    switch (format) {
      case 'currency':
        return `$${num.toFixed(2)}`;
      case 'percent':
        return `${num.toFixed(1)}%`;
      case 'integer':
        return Math.round(num).toString();
      case 'decimal':
        return num.toFixed(2);
      case 'compact':
        if (num >= 1000000) {
          return `$${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
          return `$${(num / 1000).toFixed(1)}K`;
        }
        return `$${Math.round(num)}`;
      default:
        return typeof format === 'function' ? format(num) : num.toString();
    }
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    // Size variants
    switch (size) {
      case 'xs':
        baseStyle.push(styles.textXs);
        break;
      case 'sm':
        baseStyle.push(styles.textSm);
        break;
      case 'lg':
        baseStyle.push(styles.textLg);
        break;
      case 'xl':
        baseStyle.push(styles.textXl);
        break;
      case 'xxl':
        baseStyle.push(styles.textXxl);
        break;
      default:
        baseStyle.push(styles.textMd);
    }

    // Color variants
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.textSecondary);
        break;
      case 'accent':
        baseStyle.push(styles.textAccent);
        break;
      case 'success':
        baseStyle.push(styles.textSuccess);
        break;
      case 'warning':
        baseStyle.push(styles.textWarning);
        break;
      case 'error':
        baseStyle.push(styles.textError);
        break;
      case 'neon':
        baseStyle.push(styles.textNeon);
        break;
      case 'premium':
        baseStyle.push(styles.textPremium);
        break;
      case 'vip':
        baseStyle.push(styles.textVip);
        break;
      case 'elite':
        baseStyle.push(styles.textElite);
        break;
      default:
        baseStyle.push(styles.textPrimary);
    }

    return baseStyle;
  };

  useEffect(() => {
    const numericValue = Number(value) || 0;

    if (!animated) {
      displayValue.setValue(numericValue);
      setTextValue(formatNumber(numericValue));
      return;
    }

    const listenerId = displayValue.addListener(({ value: v }) => {
      try {
        const n = Number(v) || 0;
        setTextValue(formatNumber(n));
      } catch {
        setTextValue(String(v));
      }
    });

    const timer = setTimeout(() => {
      Animated.timing(displayValue, {
        toValue: numericValue,
        duration: duration,
        useNativeDriver: false,
      }).start();
    }, delay);

    previousValue.current = numericValue;

    return () => {
      clearTimeout(timer);
      displayValue.removeListener(listenerId);
    };
  }, [value, duration, animated, delay]);

  return (
    <Animated.Text style={[getTextStyle(), style]} {...props}>
      {textValue}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: 'System',
    fontWeight: '700',
  },
  textXs: {
    fontSize: Colors.typography.xs,
  },
  textSm: {
    fontSize: Colors.typography.sm,
  },
  textMd: {
    fontSize: Colors.typography.md,
  },
  textLg: {
    fontSize: Colors.typography.lg,
  },
  textXl: {
    fontSize: Colors.typography.xl,
  },
  textXxl: {
    fontSize: Colors.typography.xxl,
  },
  textPrimary: {
    color: Colors.text,
  },
  textSecondary: {
    color: Colors.textSecondary,
  },
  textAccent: {
    color: Colors.accent,
  },
  textSuccess: {
    color: Colors.success,
  },
  textWarning: {
    color: Colors.warning,
  },
  textError: {
    color: Colors.error,
  },
  textNeon: {
    color: Colors.textNeon,
    textShadowColor: Colors.textNeon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  textPremium: {
    color: Colors.metallicGold,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  textVip: {
    color: Colors.neonPink,
    textShadowColor: 'rgba(255, 20, 147, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  textElite: {
    color: Colors.neonBlue,
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});

export default AnimatedNumber;