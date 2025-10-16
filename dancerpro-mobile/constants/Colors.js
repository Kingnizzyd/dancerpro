import { Platform } from 'react-native';

export const Colors = {
  // Primary Brand Colors - Sophisticated Lavender & Rose Gold
  primary: '#B19CD9', // Digital Lavender
  primaryDark: '#9B7EBD',
  primaryLight: '#D4C4E8',
  secondary: '#E8A87C', // Rose Gold - more appealing to target demographic
  secondaryDark: '#D4956A',
  secondaryLight: '#F2C4A1',
  
  // Feminine Aesthetic Extensions - Enhanced with Modern Edge
  softPink: '#F8D7E8',
  softPinkLight: '#FFD9EC',
  deepPurple: '#6A0DAD',
  plum: '#5A189A',
  metallicGold: '#D4AF37',
  metallicRoseGold: '#E4BFB3',
  metallicSilver: '#C0C0C0',
  satinHighlight: '#FFF1F8',
  
  // Accent Colors - Modern & Feminine with High-Contrast Neon
  accent: '#FF6B9D', // Coral Pink
  accentSecondary: '#7DD3FC', // Sky Blue
  accentTertiary: '#F59E0B', // Warm Amber
  accentQuaternary: '#10B981', // Emerald Green
  
  // NEON ACCENTS - Bold & Edgy for Nightlife Aesthetic
  neonPink: '#FF1493', // Hot Pink
  neonPurple: '#BF00FF', // Electric Purple
  neonBlue: '#00BFFF', // Deep Sky Blue
  neonGreen: '#00FF7F', // Spring Green
  neonYellow: '#FFFF00', // Electric Yellow
  neonOrange: '#FF4500', // Orange Red
  neonMagenta: '#FF00FF', // Magenta
  neonCyan: '#00FFFF', // Cyan
  
  // Gradient Colors for Modern Effects - Enhanced with Neon
  gradientPrimary: '#B19CD9',
  gradientSecondary: '#E8A87C', // Rose Gold gradient
  gradientTertiary: '#FF6B9D', // Coral gradient
  gradientQuaternary: '#7DD3FC', // Sky blue gradient
  gradientLuxPink: '#F8D7E8',
  gradientDeepPurple: '#6A0DAD',
  gradientMetallicGold: '#D4AF37',
  
  // New gradient variants for enhanced UI
  gradientWarmStart: '#E8A87C',
  gradientWarmEnd: '#D4956A',
  gradientCoralStart: '#FF6B9D',
  gradientCoralEnd: '#FF8EB4',
  gradientGlowStart: '#B19CD9',
  gradientGlowEnd: '#D4C4E8',
  gradientPremiumStart: '#D4AF37',
  gradientPremiumEnd: '#FFD700',
  gradientVipStart: '#FF1493',
  gradientVipEnd: '#FF6B9D',
  gradientEliteStart: '#00BFFF',
  gradientEliteEnd: '#00FFFF',
  
  // NEON GRADIENTS - Dynamic Visual Impact
  neonPinkPurple: ['#FF1493', '#BF00FF'],
  neonBlueCyan: ['#00BFFF', '#00FFFF'],
  neonGreenYellow: ['#00FF7F', '#FFFF00'],
  neonOrangePink: ['#FF4500', '#FF1493'],
  neonMagentaCyan: ['#FF00FF', '#00FFFF'],
  neonRainbow: ['#FF1493', '#FF4500', '#FFFF00', '#00FF7F', '#00BFFF', '#BF00FF'],
  
  // METALLIC GRADIENTS - Sophisticated Shine
  roseGoldGradient: ['#E8A87C', '#D4AF37'],
  goldSilverGradient: ['#D4AF37', '#C0C0C0'],
  platinumGradient: ['#E5E4E2', '#C0C0C0'],
  
  // Background Colors - Sophisticated Dark with Modern Edge
  background: '#0A0A0A', // Deepest black for maximum contrast
  backgroundSecondary: '#141414', // Enhanced contrast
  surface: '#1E1E1E', // Elevated surface with modern depth
  surfaceSecondary: '#282828', // Higher elevation
  surfaceAccent: '#2A1F2A', // Subtle lavender tint
  surfaceWarm: '#2A2520', // Warm surface variant
  
  // GLASS MORPHISM SURFACES - Modern Translucent Effects
  glassDark: 'rgba(20, 20, 20, 0.8)',
  glassMedium: 'rgba(30, 30, 30, 0.7)',
  glassLight: 'rgba(40, 40, 40, 0.6)',
  glassAccent: 'rgba(177, 156, 217, 0.2)',
  glassNeon: 'rgba(255, 20, 147, 0.15)',
  
  // NEON OVERLAYS - For Dynamic Background Effects
  neonOverlayPink: 'rgba(255, 20, 147, 0.1)',
  neonOverlayPurple: 'rgba(191, 0, 255, 0.1)',
  neonOverlayBlue: 'rgba(0, 191, 255, 0.1)',
  neonOverlayGreen: 'rgba(0, 255, 127, 0.1)',
  
  // Border & Divider Colors - Enhanced with Neon Accents
  border: '#2A2A2A', // Stronger borders for contrast
  borderLight: '#3A3A3A',
  borderAccent: '#B19CD9',
  borderWarm: '#E8A87C', // Rose gold border
  borderNeon: '#FF1493', // Hot pink neon border
  borderNeonSecondary: '#00BFFF', // Blue neon border
  divider: '#252525',
  
  // NEON BORDER EFFECTS - For Interactive Elements
  neonGlowBorder: '#FF1493',
  neonGlowBorderSecondary: '#00BFFF',
  neonGlowBorderTertiary: '#00FF7F',
  
  // Text Colors - Enhanced Readability & Style with Neon Vibrancy
  text: '#FFFFFF',
  textLight: '#F0F0F0', // Softer white
  textSecondary: '#CCCCCC', // Better contrast
  textAccent: '#D4C4E8', // Light lavender
  textWarm: '#F2C4A1', // Light rose gold
  textNeon: '#FF1493', // Hot pink neon text
  textNeonSecondary: '#00BFFF', // Blue neon text
  textNeonTertiary: '#00FF7F', // Green neon text
  textNeonQuaternary: '#FFFF00', // Yellow neon text
  textMuted: '#888888', // Improved muted text
  textSubtle: '#666666', // Very subtle text
  white: '#FFFFFF',
  
  // TEXT GLOW EFFECTS - For Dynamic Typography
  textGlowPrimary: '#B19CD9',
  textGlowNeon: '#FF1493',
  textGlowSecondary: '#00BFFF',
  
  // Button Colors - Modern & Appealing with Neon Edge
  buttonPrimary: '#B19CD9',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E8A87C', // Rose gold button
  buttonSecondaryText: '#FFFFFF',
  buttonAccent: '#FF6B9D', // Coral button
  buttonAccentText: '#FFFFFF',
  buttonNeon: '#FF1493', // Hot pink neon button
  buttonNeonText: '#FFFFFF',
  buttonNeonSecondary: '#00BFFF', // Blue neon button
  buttonNeonSecondaryText: '#FFFFFF',
  buttonTertiary: '#2F2F2F', // Dark button
  buttonTertiaryText: '#D4C4E8',
  
  // GLASS BUTTONS - Modern Translucent Effects
  buttonGlass: 'rgba(255, 255, 255, 0.1)',
  buttonGlassText: '#FFFFFF',
  buttonGlassBorder: 'rgba(255, 255, 255, 0.2)',
  
  // GRADIENT BUTTONS - Dynamic Visual Impact
  buttonGradientPrimary: ['#B19CD9', '#9B7EBD'],
  buttonGradientNeon: ['#FF1493', '#BF00FF'],
  buttonGradientSecondary: ['#E8A87C', '#D4956A'],
  
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
      // Modern extended sizes for bold typography
      micro: 9,
      hero: 64,
      jumbo: 80,
    },
    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    // Alias for compatibility with older references
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
      // Modern line heights
      ultraTight: 1.1,
      headline: 1.3,
      spacious: 2.0,
    },
    // Modern font families (platform-specific fallbacks)
    fontFamily: {
      primary: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
      // Bold display fonts for empowerment
      displayBold: Platform.select({
        ios: 'AvenirNext-Bold',
        android: 'sans-serif-medium',
        default: 'Arial-Bold',
      }),
      displayHeavy: Platform.select({
        ios: 'AvenirNext-Heavy',
        android: 'sans-serif-black',
        default: 'Arial-Black',
      }),
      // Modern sans-serif alternatives
      modernSans: Platform.select({
        ios: 'SFProDisplay-Bold',
        android: 'sans-serif-condensed',
        default: 'Helvetica-Bold',
      }),
      // Rounded friendly fonts
      rounded: Platform.select({
        ios: 'AvenirNext-DemiBold',
        android: 'sans-serif-rounded',
        default: 'Arial-Rounded',
      }),
    },
    // Modern text styles for empowerment theme
    textStyles: {
      // EMPOWERED HEADLINES - Bold and commanding
      headlineHero: {
        fontSize: 64,
        fontWeight: '900',
        lineHeight: 1.1,
        fontFamily: 'displayHeavy',
        letterSpacing: -1.5,
      },
      headlineJumbo: {
        fontSize: 48,
        fontWeight: '800',
        lineHeight: 1.2,
        fontFamily: 'displayBold',
        letterSpacing: -1,
      },
      headlineDisplay: {
        fontSize: 36,
        fontWeight: '800',
        lineHeight: 1.3,
        fontFamily: 'displayBold',
        letterSpacing: -0.5,
      },
      headlineLarge: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 1.3,
        fontFamily: 'displayBold',
        letterSpacing: -0.3,
      },
      headlineMedium: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 1.4,
        fontFamily: 'modernSans',
        letterSpacing: -0.2,
      },
      headlineSmall: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 1.4,
        fontFamily: 'modernSans',
        letterSpacing: -0.1,
      },
      
      // BODY TEXT - Readable yet modern
      bodyLarge: {
        fontSize: 18,
        fontWeight: '400',
        lineHeight: 1.6,
        fontFamily: 'primary',
        letterSpacing: 0.1,
      },
      body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 1.5,
        fontFamily: 'primary',
        letterSpacing: 0.1,
      },
      bodySmall: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 1.4,
        fontFamily: 'primary',
        letterSpacing: 0.1,
      },
      bodyMicro: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 1.4,
        fontFamily: 'primary',
        letterSpacing: 0.2,
      },
      
      // EMPHASIS & ACCENT TEXT
      emphasisLarge: {
        fontSize: 18,
        fontWeight: '600',
        lineHeight: 1.4,
        fontFamily: 'modernSans',
        letterSpacing: 0.2,
      },
      emphasis: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 1.4,
        fontFamily: 'modernSans',
        letterSpacing: 0.2,
      },
      emphasisSmall: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 1.3,
        fontFamily: 'modernSans',
        letterSpacing: 0.2,
      },
      
      // CAPTIONS & LABELS
      caption: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 1.3,
        fontFamily: 'primary',
        letterSpacing: 0.3,
      },
      captionMicro: {
        fontSize: 10,
        fontWeight: '500',
        lineHeight: 1.2,
        fontFamily: 'primary',
        letterSpacing: 0.4,
      },
      label: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 1.3,
        fontFamily: 'modernSans',
        letterSpacing: 0.2,
      },
      labelSmall: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 1.2,
        fontFamily: 'modernSans',
        letterSpacing: 0.3,
      },
      
      // BUTTON TEXT STYLES
      buttonLarge: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 1.2,
        fontFamily: 'modernSans',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      },
      button: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 1.2,
        fontFamily: 'modernSans',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      },
      buttonSmall: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 1.2,
        fontFamily: 'modernSans',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
      },
      
      // SPECIAL EFFECTS TEXT
      neonText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 1.3,
        fontFamily: 'modernSans',
        letterSpacing: 1,
        textShadowColor: 'rgba(255, 20, 147, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      },
      glowText: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 1.3,
        fontFamily: 'modernSans',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(191, 0, 255, 0.6)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
      },
      gradientText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 1.3,
        fontFamily: 'modernSans',
        letterSpacing: 0.3,
      },
    },
    // Letter spacing variations
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      extraWide: 1,
      ultraWide: 2,
      // Modern specific
      headlineTight: -1.5,
      displayWide: 0.8,
      buttonSpacing: 0.3,
      neonSpacing: 1,
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