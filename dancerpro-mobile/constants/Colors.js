export const Colors = {
  // Primary Brand Colors - Digital Lavender & Cyber Lime
  primary: '#B19CD9', // Digital Lavender
  primaryDark: '#9B7EBD',
  secondary: '#C7FF00', // Cyber Lime
  secondaryDark: '#A3D900',
  
  // Accent Colors
  accent: '#FF6B9D',
  accentSecondary: '#00E6FF',
  
  // Gradient Colors for Modern Effects
  gradientPrimary: '#B19CD9',
  gradientSecondary: '#E6B3FF', 
  gradientTertiary: '#FFB3E6',
  
  // Background Colors - Modern Dark with Colorful Accents
  background: '#0a0a0a',
  backgroundSecondary: '#121212',
  surface: '#1a1a1a',
  surfaceSecondary: '#252525',
  surfaceAccent: '#2a1a2a', // Subtle purple tint
  
  // Border & Divider Colors
  border: '#333333',
  borderLight: '#404040',
  borderAccent: '#B19CD9',
  divider: '#2a2a2a',
  
  // Text Colors
  text: '#ffffff',
  textLight: '#e0e0e0',
  textSecondary: '#b3b3b3',
  textAccent: '#E6B3FF',
  textMuted: '#808080',
  white: '#ffffff',
  
  // Button Colors
  buttonPrimary: '#B19CD9',
  buttonPrimaryText: '#ffffff',
  buttonSecondary: '#2a2a2a',
  buttonSecondaryText: '#E6B3FF',
  buttonAccent: '#C7FF00',
  buttonAccentText: '#000000',
  
  // Input Colors
  inputBackground: '#1a1a1a',
  inputBorder: '#333333',
  inputBorderFocus: '#B19CD9',
  inputText: '#ffffff',
  inputPlaceholder: '#808080',
  
  // Status Colors - Modern & Vibrant
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4757',
  info: '#00E6FF',
  
  // Special Effect Colors
  glow: '#B19CD9',
  shimmer: '#E6B3FF',
  neon: '#C7FF00',
  
  // Card & Component Colors
  cardBackground: '#1a1a1a',
  cardBorder: '#333333',
  cardAccent: '#2a1a2a',
  
  // Navigation Colors
  tabActive: '#B19CD9',
  tabInactive: '#666666',
  tabBackground: '#121212',
  
  // Nested objects for spacing, typography, etc.
  // Spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 50,
    full: 999,
  },
  
  typography: {
    // Direct numeric sizes (backward compatibility)
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
    // Nested objects used by modern styles
    fontSize: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
      xxxl: 36,
      display: 48,
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    // Alias for compatibility with older references
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#B19CD9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    neon: {
      shadowColor: '#C7FF00',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
};

export const Typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#B19CD9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  neon: {
    shadowColor: '#C7FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const Animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};