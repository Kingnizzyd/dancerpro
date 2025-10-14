# DancerPro Assets Directory

This directory contains design assets exported from Figma and other design sources.

## Directory Structure

```
assets/
├── images/          # Static images (PNG, JPG)
├── icons/           # SVG icons and icon sets
├── fonts/           # Custom fonts
├── design-tokens/   # Design system tokens
└── figma-exports/   # Direct exports from Figma
```

## Figma Integration Workflow

### 1. Export Assets from Figma
- Export icons as SVG for scalability
- Export images at 2x resolution for high-DPI displays
- Use consistent naming convention: `component-name-variant.svg`

### 2. Design Tokens
- Colors should be defined in `design-tokens/colors.js`
- Typography scales in `design-tokens/typography.js`
- Spacing system in `design-tokens/spacing.js`

### 3. Build Integration
Assets in this directory are automatically processed during build:
- SVGs are optimized and inlined where appropriate
- Images are compressed and responsive variants generated
- Design tokens are validated against Figma specifications

## Current Status
- ❌ No Figma assets currently integrated
- ❌ Missing design token validation
- ❌ No automated asset processing pipeline
- ✅ Basic favicon and PWA assets present

## Next Steps
1. Set up Figma API integration for automated asset sync
2. Create design token validation system
3. Implement asset optimization pipeline
4. Add responsive image generation