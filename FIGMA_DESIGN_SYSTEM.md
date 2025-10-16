# DancerPro Mobile App - Figma Design System

## Design Philosophy
**Target Audience**: Professional dancers, exotic dancers, and entertainers who need business management tools
**Aesthetic**: Sophisticated, modern, feminine with nightlife edge
**Core Values**: Empowerment, professionalism, financial control

## Color System

### Primary Brand Colors
- **Digital Lavender**: `#B19CD9` - Primary brand color
- **Rose Gold**: `#E8A87C` - Secondary brand color (appealing to target demographic)
- **Coral Pink**: `#FF6B9D` - Accent color
- **Sky Blue**: `#7DD3FC` - Secondary accent

### Gradient System
- **Primary Gradient**: `#B19CD9` → `#E8A87C` (Lavender to Rose Gold)
- **Accent Gradient**: `#FF6B9D` → `#7DD3FC` (Coral to Sky Blue)
- **Warm Gradient**: `#E8A87C` → `#D4956A` (Rose Gold variants)
- **Coral Gradient**: `#FF6B9D` → `#F59E0B` (Coral to Amber)

### Neon Accent Colors
- **Hot Pink**: `#FF1493` - Primary neon accent
- **Electric Purple**: `#BF00FF` - Secondary neon
- **Deep Sky Blue**: `#00BFFF` - Blue neon accent
- **Spring Green**: `#00FF7F` - Green neon accent
- **Electric Yellow**: `#FFFF00` - Yellow neon
- **Orange Red**: `#FF4500` - Orange neon
- **Magenta**: `#FF00FF` - Magenta neon
- **Cyan**: `#00FFFF` - Cyan neon

### Background Colors
- **Background**: `#0A0A0A` - Deep black for maximum contrast
- **Surface**: `#1E1E1E` - Elevated surfaces
- **Glass Effects**: Various rgba values for modern translucent effects

## Typography System

### Font Families
- **Primary**: System default (iOS: System, Android: Roboto)
- **Display Bold**: AvenirNext-Bold / sans-serif-medium
- **Display Heavy**: AvenirNext-Heavy / sans-serif-black
- **Modern Sans**: SFProDisplay-Bold / sans-serif-condensed
- **Rounded**: AvenirNext-DemiBold / sans-serif-rounded

### Text Styles

#### Empowered Headlines
- **Headline Hero**: 64px, 900 weight, 1.1 line height
- **Headline Jumbo**: 48px, 800 weight, 1.2 line height
- **Headline Display**: 36px, 800 weight, 1.3 line height
- **Headline Large**: 28px, 700 weight, 1.3 line height
- **Headline Medium**: 22px, 700 weight, 1.4 line height
- **Headline Small**: 18px, 600 weight, 1.4 line height

#### Body Text
- **Body Large**: 18px, 400 weight, 1.6 line height
- **Body**: 16px, 400 weight, 1.5 line height
- **Body Small**: 14px, 400 weight, 1.4 line height
- **Body Micro**: 12px, 400 weight, 1.4 line height

#### Emphasis & Button Text
- **Emphasis Styles**: 600-700 weight with modern sans font
- **Button Styles**: Uppercase with letter spacing 0.2-0.5
- **Neon Text**: Special effects with text shadows

## Component Specifications

### Buttons (`GradientButton` Component)

#### Variants
- **Primary**: Lavender gradient with medium shadow
- **Secondary**: Rose Gold gradient with warm glow
- **Accent**: Coral gradient with neon effects
- **Warm**: Warm color variant
- **Coral**: Coral color variant

#### Sizes
- **Small**: 36px height, 80px min-width
- **Medium**: 48px height, 120px min-width  
- **Large**: 56px height, 160px min-width

#### States
- **Default**: Full opacity with gradient
- **Hover/Focus**: Slightly elevated with enhanced glow
- **Disabled**: 50% opacity with gray gradient
- **Pressed**: Reduced opacity (0.8)

### Cards (`GradientCard` Component)

#### Variants
- **Default**: Dark gradient with subtle borders
- **Accent**: Coral gradient with neon border
- **Glow**: Enhanced glow effects
- **Minimal**: Clean, minimal styling
- **Warm**: Rose Gold warmth
- **Coral**: Coral color theme

#### Padding Options
- **Small**: 12px padding
- **Medium**: 16px padding  
- **Large**: 24px padding

### Input Fields (`ModernInput` Component)

#### Variants
- **Default**: Standard dark input with subtle borders
- **Glow**: Gradient background with glow effects on focus
- **Minimal**: Clean, minimal styling

#### Sizes
- **Small**: 40px height, 13px font
- **Medium**: 48px height, 15px font
- **Large**: 56px height, 18px font

#### States
- **Default**: `#252525` background, `#3A3A3A` border
- **Focus**: Lavender border with optional glow
- **Error**: Red border with error message
- **Disabled**: Reduced opacity

### Navigation & Icons

#### Icon Specifications
- **Size**: 24x24px grid
- **Stroke**: 2px consistent weight
- **Colors**: Primary brand colors with state variants
- **Categories**: Navigation, Actions, Status, Financial

#### Navigation Structure
- **Bottom Tab Bar**: 5 main sections
- **Icons**: Custom SVG icons for each section
- **Active State**: Lavender or Rose Gold highlight
- **Inactive State**: Gray (`#666666`)

## Layout & Spacing

### Spacing Scale
- **xs**: 4px - Micro spacing
- **sm**: 8px - Small spacing
- **md**: 12px - Medium spacing
- **lg**: 16px - Large spacing
- **xl**: 24px - Extra large spacing
- **xxl**: 32px - Double extra large
- **xxxl**: 48px - Triple extra large

### Border Radius
- **xs**: 4px - Subtle rounding
- **sm**: 8px - Small rounding
- **md**: 12px - Medium rounding
- **lg**: 16px - Large rounding
- **xl**: 20px - Extra large rounding
- **xxl**: 24px - Double extra large rounding
- **round**: 50px - Circular elements
- **full**: 999px - Pill shapes

### Grid System
- **Mobile First**: Responsive design for iOS and Android
- **8px Grid**: All measurements based on 8px increments
- **Consistent Margins**: 16-24px side margins
- **Section Spacing**: 24-32px between sections

## Effects & Animations

### Shadows
- **Small**: 2px elevation, subtle depth
- **Medium**: 4px elevation, moderate depth
- **Large**: 8px elevation, significant depth
- **Glow**: Colored glow effects (Lavender, Neon)
- **Neon**: Vibrant neon glow effects

### Glass Morphism
- **Glass Dark**: `rgba(20, 20, 20, 0.8)`
- **Glass Medium**: `rgba(30, 30, 30, 0.7)`
- **Glass Light**: `rgba(40, 40, 40, 0.6)`
- **Glass Accent**: `rgba(177, 156, 217, 0.2)`
- **Glass Neon**: `rgba(255, 20, 147, 0.15)`

### Animations
- **Fast**: 150ms duration - Quick interactions
- **Normal**: 250ms duration - Standard transitions
- **Slow**: 350ms duration - Emphasis animations
- **Easing**: Standard easing curves for smooth motion

## Accessibility

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive**: Clear visual feedback
- **Focus States**: Visible focus indicators

### Text Readability
- **Minimum Size**: 11px for body text
- **Line Height**: 1.4-1.6 for optimal reading
- **Font Weight**: Medium (500) minimum for important text
- **Spacing**: Adequate spacing between elements

### Interactive Elements
- **Touch Targets**: Minimum 44x44px
- **Spacing**: 8px minimum between touch targets
- **Feedback**: Visual feedback for all interactions
- **State Indication**: Clear disabled/active states

## Export Specifications

### SVG Icons
- **Format**: SVG with optimized paths
- **ViewBox**: 0 0 24 24
- **Stroke**: 2px consistent weight
- **Colors**: CSS variables for theme support
- **Naming**: `icon-{name}-{color}-{size}.svg`

### Design Tokens
- **Format**: JSON/JavaScript constants
- **Organization**: By category (colors, spacing, etc.)
- **Naming**: Semantic names (primary, secondary, etc.)
- **Values**: Actual values with comments

### Component Library
- **Figma Components**: Organized by category
- **Variants**: All states and sizes
- **Documentation**: Usage guidelines and examples
- **Export Ready**: Optimized for development

## Implementation Guidelines

### React Native Specifics
- **StyleSheet**: Use StyleSheet.create for performance
- **Platform**: Platform-specific styling where needed
- **Responsive**: Flexbox-based layouts
- **Performance**: Optimized re-renders

### Theme Support
- **Dark Theme**: Current implementation
- **Light Theme**: Future consideration
- **Custom Themes**: Extensible color system

### Component Props
- **Consistent**: Similar props across components
- **Documented**: JSDoc comments for all props
- **Default Values**: Sensible defaults provided
- **Validation**: PropTypes where appropriate

---

*This design system serves as the single source of truth for all UI components and styling in the DancerPro mobile application. All new components should adhere to these guidelines.*
## DonutChart component (UI Visuals)

Purpose: Visualize proportional distributions (e.g., earnings by client or by venue) with an accessible donut chart.

Props
- data: Array of { label: string, value: number, color?: string }
- size: number (default 160)
- thickness: number (default 18)
- centerLabel: string (optional, e.g., "Net")
- showCenterTotal: boolean (default true)
- loading: boolean (shows skeleton ring)
- legend: boolean (default true)
- maxSlices: number (default 6, combines remainder into "Other")

Design and Accessibility
- Use design tokens from Colors for slice colors when available; otherwise fallback to accent palette.
- Provide an accessibilityLabel summarizing slice percentages and total.
- Maintain minimum tap target spacing for legend rows; use color chips 10x10 with 8px spacing.
- Show center total with compact currency formatting (K/M abbreviations for large values).

States
- Loading: light background ring + shimmer colored inner ring mimicking skeleton.
- Empty: do not render chart; display "No data" message in the surrounding card.

Usage Example
```
<DonutChart
  data={snapshot.byClient.slice(0, 8).map(c => ({
    label: clients.find(x => x.id === c.clientId)?.name || 'Unknown',
    value: Number(c.net || 0),
  }))}
  size={180}
  thickness={18}
  centerLabel="Net"
  loading={refreshing && !snapshot}
  legend
/>
```

## TrendChart (update)
- Added `loading` prop to show skeleton placeholder while data refreshes.
- Memoized calculations to reduce re-renders.
- Accessibility: Provides a summary of trend (up/down/flat) with moving average context.

## StatsCard (update)
- Added `loading` prop to display skeleton placeholders for title/value/trend.
- Accessibility: `accessibilityRole="summary"` with a well-formed label (e.g., "Total Earnings: $12.3K, Trend up 12% vs last period").
- Performance: Wrapped with React.memo to prevent unnecessary re-renders.