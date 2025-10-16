# DancerPro Figma Design System Specification

## Overview
This document outlines the complete design system for DancerPro mobile application, targeting confident women aged 18-35 in the nightlife entertainment industry.

## Design Philosophy
- **Bold & Confident**: Empowering aesthetic that reflects strength and professionalism
- **Modern & Edgy**: High-contrast neon elements with sophisticated dark themes
- **Intuitive & Professional**: Clean interfaces that prioritize usability and business functionality

## Color System

### Primary Brand Colors
- **Digital Lavender**: `#B19CD9` - Main brand color, sophisticated yet modern
- **Cyber Lime**: `#C7FF00` - High-contrast accent for energy and visibility

### Gradient System
```javascript
// Primary Gradients
gradientPrimary: '#B19CD9',    // Digital Lavender
gradientSecondary: '#C7FF00',  // Cyber Lime
gradientTertiary: '#FF6B9D',   // Neon Pink
gradientQuaternary: '#00D4FF', // Electric Blue

// Metallic Gradients
metallicGold: ['#FFD700', '#D4AF37']
metallicSilver: ['#C0C0C0', '#A8A8A8']
metallicRose: ['#FFC0CB', '#E6B8B8']
```

### Neon Accent Colors
- Hot Pink: `#FF6B9D`
- Electric Blue: `#00D4FF`
- Cyber Green: `#00FF9D`
- Vibrant Yellow: `#FFEA00`
- Neon Orange: `#FF9500`
- Magenta: `#FF00FF`
- Cyan: `#00FFFF`

## Typography System

### Font Families
```javascript
// Platform-specific font selection
fontFamily: Platform.select({
  ios: {
    primary: 'System',
    displayBold: 'Avenir Next',
    displayHeavy: 'Avenir Next Heavy',
    modernSans: 'SF Pro Display',
    rounded: 'SF Pro Rounded'
  },
  android: {
    primary: 'Roboto',
    displayBold: 'Roboto Condensed',
    displayHeavy: 'Roboto Black',
    modernSans: 'Product Sans',
    rounded: 'Google Sans'
  }
})
```

### Text Styles
- **Headline Styles**: Bold, tight letter spacing for impact
- **Body Styles**: Readable with modern proportions
- **Special Effects**: Neon text, glow effects, gradient text

## Component Specifications

### Buttons
**Variants**:
- Primary (Gradient: Lavender → Lime)
- Secondary (Gradient: Pink → Blue)
- Accent (Solid neon colors)
- Warm (Gold metallic)
- Coral (Pink coral gradient)

**Sizes**:
- Small: 36px height, 80px min-width
- Medium: 48px height, 120px min-width  
- Large: 56px height, 160px min-width

### Cards
**Variants**:
- Default: Dark glass morphism
- Accent: Neon border glow
- Glow: Soft lavender glow
- Minimal: Clean, reduced styling
- Warm: Gold metallic accents
- Coral: Pink coral gradient

**Padding Options**:
- Small: 16px
- Medium: 24px  
- Large: 32px

### Input Fields
- Modern rounded design with subtle borders
- Focus states with neon glow effects
- Clear validation states (success/error)
- Placeholder styling with reduced opacity

## Navigation & Icons

### Navigation Bar
- Bottom tab navigation with custom icons
- Active state: Neon glow effect
- Inactive state: Muted with subtle gradients

### Icon System
- Custom SVG icons designed for clarity
- Consistent stroke weight (2px)
- Neon glow effects on active states
- Responsive sizing system

## Layout & Spacing

### Grid System
- 8px baseline grid
- Consistent margins and padding
- Responsive breakpoints for different devices

### Spacing Scale
```javascript
spacing: {
  xs: 4,    // 4px
  sm: 8,    // 8px  
  md: 16,   // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
  xxl: 48,  // 48px
  xxxl: 64  // 64px
}
```

## Effects & Animations

### Shadows
- **Medium**: Standard elevation for cards
- **Glow**: Neon glow effects for interactive elements
- **Neon**: Intense glow for accent elements

### Glass Morphism
- Translucent backgrounds with blur
- Border effects for depth
- Subtle gradient overlays

### Micro-interactions
- Button press animations
- Loading states with neon pulses
- Success/error feedback animations

## Accessibility

### Contrast Ratios
- Minimum 4.5:1 for text
- Enhanced contrast for important elements
- Color-blind friendly palette options

### Touch Targets
- Minimum 44px touch targets
- Adequate spacing between interactive elements
- Clear focus indicators

## Export Specifications

### SVG Icons
- Export at 24x24px, 32x32px, 48x48px
- Optimized for web with clean paths
- Consistent naming convention: `icon-name-variant.svg`

### Images
- Export at 2x resolution for retina displays
- WebP format for better compression
- Responsive image variants

### Design Tokens
- JSON format for easy integration
- Version controlled with codebase
- Automated validation against implementation

## Implementation Guidelines

### React Native Integration
- Use `LinearGradient` from expo-linear-gradient
- Implement platform-specific font loading
- Optimize performance with memoized components

### Build Pipeline
- Automated asset processing
- Design token validation
- Performance optimization for assets

### Testing
- Visual regression testing
- Accessibility testing
- Performance testing with assets

---

**Last Updated**: January 2025  
**Status**: ✅ Design System Defined | 🚧 Implementation in Progress