# Figma Integration Guide for DancerPro

## Overview

This guide explains how to properly integrate Figma design updates into the DancerPro build pipeline to ensure design changes are reflected in the live Netlify deployment.

## Problem Identified

The current build process was missing a crucial step for processing Figma design assets, causing a discrepancy between the intended modern design and what was deployed to Netlify.

## Solution Implemented

### 1. Asset Processing Pipeline

Created `scripts/process-figma-assets.js` that:
- ✅ Creates proper asset directory structure
- ✅ Processes SVG icons from Figma exports
- ✅ Optimizes images for web deployment
- ✅ Validates design tokens against current implementation
- ✅ Generates asset manifest for tracking

### 2. Updated Build Pipeline

Modified build configurations to include Figma asset processing:

**Netlify (`netlify.toml`):**
```toml
command = "cd netlify/functions && npm install && cd ../.. && npx expo export -p web --output-dir dist && node scripts/process-figma-assets.js && node scripts/add-pwa-assets.js && node scripts/inject-backend-url.js && node scripts/copy-public.js"
```

**GitHub Actions (`.github/workflows/deploy-netlify.yml`):**
```yaml
- name: Process Figma assets
  run: node scripts/process-figma-assets.js
```

**Local Development (`package.json`):**
```json
"export:web": "... && node scripts/process-figma-assets.js && ..."
```

### 3. Asset Directory Structure

```
assets/
├── images/          # Static images (PNG, JPG) - exported at 2x for retina
├── icons/           # SVG icons - optimized and scalable
├── fonts/           # Custom fonts from Figma
├── design-tokens/   # Design system tokens (colors, spacing, typography)
└── figma-exports/   # Direct exports from Figma (staging area)
```

## Figma-to-Deployment Workflow

### Step 1: Export from Figma
1. **Icons**: Export as SVG with consistent naming (`component-variant.svg`)
2. **Images**: Export at 2x resolution for high-DPI displays
3. **Design Tokens**: Extract colors, spacing, and typography values
4. **Components**: Export component specifications and measurements

### Step 2: Place Assets
```bash
# Place exported assets in appropriate directories
assets/
├── icons/button-primary.svg
├── images/hero-background@2x.png
└── design-tokens/colors.json
```

### Step 3: Update Design Tokens
Update `constants/Colors.js` with new values from Figma:
```javascript
export const Colors = {
  // Primary Brand Colors from Figma
  primary: '#B19CD9',    // Digital Lavender
  secondary: '#C7FF00',  // Cyber Lime
  // ... other tokens
};
```

### Step 4: Build and Deploy
```bash
# Local testing
npm run export:web

# Automatic deployment via Git push
git add .
git commit -m "feat: update design assets from Figma"
git push origin main
```

## Current Design System Status

### ✅ Implemented
- Modern color palette (Digital Lavender & Cyber Lime)
- Gradient design system
- Consistent spacing and typography
- Dark theme with colorful accents
- Responsive design tokens

### ❌ Missing (To Be Added)
- Custom fonts from Figma
- Brand-specific icons and illustrations
- Component-specific design tokens
- Automated Figma API sync

## Validation Process

The build pipeline now includes validation:
1. **Design Token Validation**: Ensures Colors.js matches Figma specifications
2. **Asset Integrity**: Verifies all referenced assets exist
3. **Build Consistency**: Confirms local and Netlify builds match

## Troubleshooting

### Design Changes Not Appearing
1. Check if assets are in correct `assets/` directories
2. Verify build pipeline includes `process-figma-assets.js`
3. Clear browser cache (Ctrl+F5)
4. Check Netlify build logs for asset processing errors

### Color Inconsistencies
1. Verify `constants/Colors.js` has latest Figma values
2. Check component imports use Colors constants
3. Validate design tokens with `node scripts/process-figma-assets.js`

### Build Failures
1. Ensure all asset files are properly formatted
2. Check SVG files don't contain invalid characters
3. Verify image files aren't corrupted

## Next Steps for Full Figma Integration

1. **Figma API Integration**: Automate asset sync using Figma REST API
2. **Design Token Automation**: Generate Colors.js from Figma design tokens
3. **Component Library Sync**: Sync React components with Figma components
4. **Visual Regression Testing**: Automated comparison with Figma designs

## Monitoring and Maintenance

- **Asset Manifest**: Check `dist/asset-manifest.json` after builds
- **Build Logs**: Monitor Netlify deployment logs for asset processing
- **Performance**: Track asset loading performance in production
- **Version Control**: Tag releases when major design updates are deployed

---

**Last Updated**: October 2025  
**Status**: ✅ Pipeline Implemented, Ready for Figma Assets