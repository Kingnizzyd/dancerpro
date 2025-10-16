# Figma Icon Design Guidelines

## Icon Design Principles

### Target Audience: Confident Women 18-35 (Nightlife Entertainment)
- **Bold & Empowering**: Strong, confident shapes that convey professionalism
- **Modern & Edgy**: Contemporary styling with subtle nightlife influences
- **Sophisticated**: Clean, refined details that maintain business appropriateness

## Design Specifications

### Grid & Canvas Size
- **Base Size**: 24x24px grid
- **Export Sizes**: 24px, 32px, 48px (1x, 1.33x, 2x)
- **Safe Area**: 20x20px (2px padding)
- **Stroke Weight**: 2px consistent

### Color System
```javascript
// Primary Icon Colors
fill: '#B19CD9'      // Digital Lavender (Primary)
stroke: '#C7FF00'    // Cyber Lime (Accent)

// State Variations
active: '#FF6B9D'    // Neon Pink (Active state)
inactive: '#666666'  // Muted Gray (Inactive)
disabled: '#444444'   // Dark Gray (Disabled)

// Special Effects
glow: 'rgba(199, 255, 0, 0.3)'  // Cyber Lime glow
```

### Icon Categories

#### Navigation Icons
- **Home**: Simple house outline with subtle gradient
- **Dashboard**: Bar chart with modern styling
- **Transactions**: Dollar sign with clean lines
- **Outfits**: Hanger icon with stylish curve
- **Clients**: People silhouette with professional touch
- **Settings**: Gear icon with precise detailing

#### Action Icons
- **Add**: Plus sign with rounded corners
- **Edit**: Pencil with smooth stroke
- **Delete**: Trash can with modern design
- **Search**: Magnifying glass with clean lines
- **Filter**: Funnel icon with gradient effect
- **Download**: Arrow down with subtle motion

#### Status Icons
- **Success**: Checkmark with positive styling
- **Error**: X mark with attention-grabbing design
- **Warning**: Exclamation with caution styling
- **Info**: Information icon with clean circle

#### Financial Icons
- **Money**: Dollar bill with modern lines
- **Cash**: Stack of bills with clean design
- **Card**: Credit card outline
- **Bank**: Building with financial styling

## Export Guidelines

### SVG Export Settings
- **Format**: SVG
- **SVG Profile**: SVG 1.1
- **Font**: Convert to outlines
- **CSS Properties**: Presentation Attributes
- **Decimal Places**: 2
- **Minify**: Yes
- **Responsive**: Yes

### Naming Convention
```
icon-[name]-[variant]-[size].svg

Examples:
icon-home-primary-24.svg
icon-dashboard-active-32.svg  
icon-add-secondary-48.svg
```

### File Structure
```
assets/icons/
├── navigation/
│   ├── icon-home-primary-24.svg
│   ├── icon-home-active-24.svg
│   └── icon-home-inactive-24.svg
├── actions/
│   ├── icon-add-primary-24.svg
│   ├── icon-edit-primary-24.svg
│   └── icon-delete-primary-24.svg
├── status/
│   ├── icon-success-primary-24.svg
│   ├── icon-error-primary-24.svg
│   └── icon-warning-primary-24.svg
└── financial/
    ├── icon-money-primary-24.svg
    ├── icon-cash-primary-24.svg
    └── icon-card-primary-24.svg
```

## Design Best Practices

### Consistency
- Maintain 2px stroke weight throughout
- Use consistent corner radius (2px)
- Keep visual weight balanced
- Ensure optical alignment

### Accessibility
- Minimum 4.5:1 contrast ratio
- Clear visual distinction between states
- Adequate touch target size (44px minimum)
- Clear focus states

### Performance
- Optimize SVG paths (remove unnecessary nodes)
- Minimize file size through optimization
- Use semantic grouping in SVG structure
- Remove metadata and comments

## Implementation Notes

### React Native Integration
```javascript
// Example usage
import HomeIcon from '../assets/icons/navigation/icon-home-primary-24.svg';

<HomeIcon width={24} height={24} fill={Colors.primary} />
```

### Animation Ready
- Design icons with animation in mind
- Use separate layers for animated parts
- Consider motion design principles
- Test animation feasibility

### Testing Checklist
- [ ] All icons export correctly
- [ ] File sizes optimized (<2KB each)
- [ ] Colors match design system
- [ ] Accessibility requirements met
- [ ] Consistent styling across set
- [ ] Proper naming convention followed
- [ ] All variants created (active/inactive/disabled)

## Version Control

### Design File Organization
- **Main File**: `DancerPro-Icons.fig`
- **Components**: Organized by category
- **Export Settings**: Pre-configured
- **Version History**: Maintained in Figma

### Export Process
1. Design icons in Figma
2. Apply proper naming convention
3. Set export settings
4. Export to appropriate directory
5. Run optimization script
6. Validate against design system

---

**Last Updated**: January 2025  
**Status**: 🚧 Ready for Icon Design