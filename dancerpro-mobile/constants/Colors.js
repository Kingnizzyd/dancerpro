export const Colors = {
  // Primary Brand Colors - Sophisticated Lavender & Rose Gold
  primary: '#B19CD9', // Digital Lavender
  primaryDark: '#9B7EBD',
  primaryLight: '#D4C4E8',
  secondary: '#E8A87C', // Rose Gold - more appealing to target demographic
  secondaryDark: '#D4956A',
  secondaryLight: '#F2C4A1',
  
  // Feminine Aesthetic Extensions
  softPink: '#F8D7E8',
  softPinkLight: '#FFD9EC',
  deepPurple: '#6A0DAD',
  plum: '#5A189A',
  metallicGold: '#D4AF37',
  metallicRoseGold: '#E4BFB3',
  metallicSilver: '#C0C0C0',
  satinHighlight: '#FFF1F8',
  
  // Accent Colors - Modern & Feminine
  accent: '#FF6B9D', // Coral Pink
  accentSecondary: '#7DD3FC', // Sky Blue
  accentTertiary: '#F59E0B', // Warm Amber
  accentQuaternary: '#10B981', // Emerald Green
  
  // Gradient Colors for Modern Effects
  gradientPrimary: '#B19CD9',
  gradientSecondary: '#E8A87C', // Rose Gold gradient
  gradientTertiary: '#FF6B9D', // Coral gradient
  gradientQuaternary: '#7DD3FC', // Sky blue gradient
  gradientLuxPink: '#F8D7E8',
  gradientDeepPurple: '#6A0DAD',
  gradientMetallicGold: '#D4AF37',
  
  // Background Colors - Sophisticated Dark with Warm Accents
  background: '#0F0F0F', // Deeper black for elegance
  backgroundSecondary: '#1A1A1A', // Warmer secondary
  surface: '#252525', // Elevated surface
  surfaceSecondary: '#2F2F2F', // Higher elevation
  surfaceAccent: '#2A1F2A', // Subtle lavender tint
  surfaceWarm: '#2A2520', // Warm surface variant
  
  // Border & Divider Colors
  border: '#3A3A3A', // Softer borders
  borderLight: '#4A4A4A',
  borderAccent: '#B19CD9',
  borderWarm: '#E8A87C', // Rose gold border
  divider: '#333333',
  
  // Text Colors - Enhanced Readability & Style
  text: '#FFFFFF',
  textLight: '#F0F0F0', // Softer white
  textSecondary: '#C0C0C0', // Better contrast
  textAccent: '#D4C4E8', // Light lavender
  textWarm: '#F2C4A1', // Light rose gold
  textMuted: '#888888', // Improved muted text
  textSubtle: '#666666', // Very subtle text
  white: '#FFFFFF',
  
  // Button Colors - Modern & Appealing
  buttonPrimary: '#B19CD9',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E8A87C', // Rose gold button
  buttonSecondaryText: '#FFFFFF',
  buttonAccent: '#FF6B9D', // Coral button
  buttonAccentText: '#FFFFFF',
  buttonTertiary: '#2F2F2F', // Dark button
  buttonTertiaryText: '#D4C4E8',
  
  // Input Colors - Refined & User-Friendly
  inputBackground: '#252525', // Elevated input background
  inputBorder: '#3A3A3A',
  inputBorderFocus: '#B19CD9',
  inputBorderWarm: '#E8A87C', // Rose gold focus
  inputText: '#FFFFFF',
  inputPlaceholder: '#888888',
  
  // Status Colors - Vibrant & Clear
  success: '#10B981', // Emerald green
  warning: '#F59E0B', // Warm amber
  error: '#EF4444', // Modern red
  info: '#7DD3FC', // Sky blue
  
  // Special Effect Colors - Enhanced Glow
  glow: '#B19CD9',
  glowWarm: '#E8A87C', // Rose gold glow
  shimmer: '#D4C4E8',
  neon: '#FF6B9D', // Coral neon
  
  // Card & Component Colors - Sophisticated
  cardBackground: '#252525', // Elevated card background
  cardBorder: '#3A3A3A',
  cardAccent: '#2A1F2A',
  cardWarm: '#2A2520', // Warm card variant
  
  // Navigation Colors - Modern & Clear
  tabActive: '#B19CD9',
  tabActiveWarm: '#E8A87C', // Rose gold active
  tabInactive: '#666666',
  tabBackground: '#1A1A1A',
  
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