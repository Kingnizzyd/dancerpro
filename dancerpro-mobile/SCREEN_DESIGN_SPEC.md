# DancerPro Mobile App - Screen Design Specification

## Design Philosophy
Modern, sophisticated, and feminine aesthetic with nightlife-edge appeal. Clean, intuitive interfaces with gradient-rich visuals and subtle animations.

## Color System
Based on <mcfile name="Colors.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\constants\Colors.js"></mcfile>
- **Primary**: Deep purple (#6B46C1) to magenta (#D53F8C) gradients
- **Secondary**: Teal (#319795) to blue (#3182CE) gradients  
- **Accent**: Coral (#ED8936) to pink (#F56565) gradients
- **Background**: Dark charcoal (#1A202C) with subtle gradients

## Typography
- **Headings**: Inter SemiBold (18-24px)
- **Body**: Inter Regular (14-16px)
- **Labels**: Inter Medium (12-14px)
- **Numbers**: Inter Medium (16-20px)

---

## Screen 1: Login Screen

### Current Implementation Status: ✅ COMPLETE
**File**: <mcfile name="LoginScreen.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\LoginScreen.js"></mcfile>

### Design Features:
- Full-screen gradient background (purple to magenta)
- Centered app logo and welcome text
- Email/password form with modern input fields
- Quick login options for test accounts:
  - **User 1**: test.user1@dancerpro.com (Premium Dancer)
  - **User 2**: test.user2@dancerpro.com (VIP Dancer) 
  - **User 3**: test.user3@dancerpro.com (Elite Dancer)
- Signup link and password reset options
- Role-based styling for test account buttons

### Visual Elements:
- Gradient buttons with hover/focus states
- Smooth transitions and micro-interactions
- Error states with subtle animations
- Loading indicators during authentication

---

## Screen 2: Dashboard

### Current Implementation Status: ⚡ PARTIAL
**File**: <mcfile name="Dashboard.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\Dashboard.js"></mcfile>

### Design Vision:
**Layout**: Card-based dashboard with key metrics at a glance

### Key Sections:

#### 1. Header Area
- Welcome message with user name/role
- Quick stats summary (today's earnings, shifts)
- Notifications/alert indicators

#### 2. Performance Metrics Cards
```
┌─────────────────────────────────┐
│          TOTAL EARNINGS          │
│   $2,450.00  ↗ 12% vs last week  │
│   ────────────────────────────   │
│   This Week: $2,450 | Last: $2,189│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           TOP VENUE             │
│   💎 Diamond Club               │
│   $1,240.00 (51% of total)      │
│   ────────────────────────────   │
│   Avg per shift: $310           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│         OUTFIT ROI              │
│   347% Return on Investment     │
│   ────────────────────────────   │
│   Total Cost: $580 | Profit: $2,015│
└─────────────────────────────────┘
```

#### 3. Recent Activity Feed
- Last 5 shifts with venue and earnings
- Quick add new transaction button
- Performance trends (sparkline charts)

#### 4. Quick Actions Bar
- Start new shift
- Add expense/income
- View calendar
- Settings access

### Visual Design:
- Gradient card backgrounds with subtle shadows
- Iconography using Ionicons with brand colors
- Animated number counters for metrics
- Hover effects on interactive elements
- Color-coded performance indicators (green/red)

---

## Screen 3: Money/Transactions

### Current Implementation Status: ⚡ PARTIAL  
**File**: <mcfile name="Money.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\Money.js"></mcfile>

### Design Vision:
Comprehensive financial tracking with intuitive filtering and quick entry

### Layout Structure:

#### 1. Header with Summary
- Period selector (Today, Week, Month, Custom)
- Total income, expenses, net profit
- Comparison to previous period

#### 2. Transaction List
```
┌─────────────────────────────────────────────────────┐
│ FILTERS: [All] [Income] [Expenses] [Category] [Date] │
├─────────────────────────────────────────────────────┤
│ 💎 Diamond Club - VIP Dance      Aug 15   $300.00   │
│ 🛍️ Outfit Purchase              Aug 14   -$85.00   │
│ 🥂 Champagne Room - Bottle       Aug 13   $450.00   │
│ 🚗 Uber to venue                Aug 12   -$25.00   │
│ 💃 Stage Tips                   Aug 11   $120.00   │
└─────────────────────────────────────────────────────┘
```

#### 3. Quick Add Floating Button
- Slide-up form for rapid transaction entry
- Smart category suggestions based on history
- Location/venue auto-detection

#### 4. Analytics Section
- Category breakdown (pie chart)
- Income vs expenses over time (line chart)
- Top earning categories

### Visual Elements:
- Color-coded transactions (green/red)
- Category icons with consistent styling
- Smooth scrolling with sticky headers
- Animated charts using react-native-svg-charts
- Swipe actions for edit/delete

---

## Screen 4: Outfits Management

### Current Implementation Status: ⚡ PARTIAL
**File**: <mcfile name="Outfits.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\Outfits.js"></mcfile>

### Design Vision:
Visual outfit catalog with ROI tracking and performance analytics

### Layout Structure:

#### 1. Outfit Gallery View
- Grid layout (2-3 columns depending on screen size)
- Each card shows outfit photo, name, and key metrics
- Filter options: All, High ROI, New, Frequent Use

#### 2. Outfit Detail Card Design
```
┌─────────────────────────────────┐
│          [Outfit Photo]          │
├─────────────────────────────────┤
│ "Black Sequin Dress"             │
│ ROI: 427% | Worn: 8 times        │
│ Total Earned: $1,850            │
│ Cost: $350 | Profit: $1,500     │
│ ────────────────────────────     │
│ 🎯 Mark Worn | 📊 Analytics      │
└─────────────────────────────────┘
```

#### 3. Analytics Overview
- Total investment in outfits
- Average ROI across all outfits
- Most profitable outfits
- Cost per wear analysis

#### 4. Add/Edit Outfit Form
- Photo upload with camera/gallery access
- Cost and purchase details
- Category tagging (e.g., "Stage", "VIP", "Bottle")  
- Initial wear count setup

### Visual Design:
- Masonry grid layout for outfit photos
- Gradient overlays on photo cards
- ROI indicators with color coding (green = profitable)
- Smooth image loading and transitions
- Drag-and-drop photo organization

---

## Screen 5: Clients Management

### Current Implementation Status: ⚡ PARTIAL
**File**: <mcfile name="Clients.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\Clients.js"></mcfile>

### Design Vision:
CRM-style client management with spending analytics and interaction history

### Layout Structure:

#### 1. Client List View
- Searchable list with alphabetical indexing
- Client cards with photo, name, and spending summary
- Favorite/starred clients section

#### 2. Client Detail Card
```
┌─────────────────────────────────┐
│        [Client Photo]           │
├─────────────────────────────────┤
│ "Michael Richardson"            │
│ 💎 VIP Client | Total: $3,240   │
│ ────────────────────────────     │
│ Last Visit: Aug 15, 2023        │
│ Avg Spend: $540 per visit       │
│ Favorite: Champagne, VIP dances │
│ Contact: michael@email.com       │
│ ────────────────────────────     │
│ 📞 Contact | 📅 Schedule         │
└─────────────────────────────────┘
```

#### 3. Interaction History
- Timeline of visits and transactions
- Spending patterns and preferences
- Notes and reminders system

#### 4. Analytics Section
- Client lifetime value tracking
- Visit frequency analysis
- Preferred services/venues

### Visual Design:
- Circular client avatars with gradient borders
- Spending tier badges (Bronze, Silver, Gold, Platinum)
- Interactive timeline with expandable details
- Quick contact actions (call, message, email)
- Color-coded visit frequency indicators

---

## Screen 6: Venues Management

### Current Implementation Status: ⚡ PARTIAL
**File**: <mcfile name="Venues.js" path="C:\Users\hasbe\dancerpro\dancerpro-mobile\screens\Venues.js"></mcfile>

### Design Vision:
Venue performance tracking with location-based analytics and shift planning

### Layout Structure:

#### 1. Venues Map View
- Interactive map showing venue locations
- Cluster markers for nearby venues
- Performance heatmap overlay

#### 2. Venue List & Analytics
```
┌─────────────────────────────────┐
│ 💎 Diamond Club                 │
│ ★★★★★ (4.8) | Avg: $620/shift  │
│ ────────────────────────────     │
│ This Month: $2,480 (4 shifts)   │
│ Best Night: Saturday            │
│ Tips: High bottle service       │
│ ────────────────────────────     │
│ 📅 Plan Shift | 📊 Analytics    │
└─────────────────────────────────┘
```

#### 3. Shift Planning Calendar
- Weekly schedule view
- Drag-and-drop shift assignment
- Earnings projections based on historical data

#### 4. Venue Comparison Tools
- Side-by-side performance metrics
- Best times/days analysis
- Travel time and cost calculations

### Visual Design:
- Map integration with custom venue markers
- Performance scorecards with trend indicators
- Calendar interface with color-coded shifts
- Comparison charts and graphs
- Location-based recommendations

---

## Navigation & User Experience

### Tab Bar Design:
- Bottom navigation with 5 main tabs
- Animated icon transitions
- Badge indicators for notifications
- Active state highlighting

### Gesture Support:
- Swipe between screens
- Pull-to-refresh on lists
- Swipe actions on list items
- Pinch-to-zoom on charts

### Loading States:
- Skeleton screens for content loading
- Progressive image loading
- Smooth transitions between states

### Empty States:
- Illustrations for no data scenarios
- Action prompts for first-time use
- Educational tooltips

---

## Responsive Design

### Mobile Breakpoints:
- **Compact**: 320px - 480px (iPhone SE)
- **Medium**: 481px - 768px (iPhone Pro)
- **Large**: 769px+ (iPad, tablets)

### Adaptive Layouts:
- Dynamic grid columns (1-3 based on screen size)
- Responsive typography scaling
- Conditional element visibility
- Touch-friendly tap targets

---

## Accessibility Features

### Visual Accessibility:
- High contrast mode support
- Large text compatibility
- Reduced motion preferences
- Screen reader support

### Interaction Accessibility:
- Keyboard navigation support
- Voice control compatibility
- Haptic feedback options
- Focus indicators

---

## Implementation Guidelines

### Component Structure:
- Reusable UI components in `/components/UI/`
- Screen-specific components in each screen file
- Shared hooks for data fetching and state management

### Performance Optimization:
- Lazy loading for images and lists
- Memoization for expensive calculations
- Efficient re-rendering patterns
- Background data synchronization

### Testing Requirements:
- Visual regression testing
- Interaction testing with Playwright
- Performance benchmarking
- Cross-browser compatibility

---

## Next Steps for Implementation

1. **Complete Dashboard visual design** - Add charts, animations, and polish
2. **Enhance Money screen UX** - Improve filtering and quick actions  
3. **Build Outfits visual gallery** - Implement photo management and ROI displays
4. **Develop Clients CRM interface** - Create detailed client profiles and analytics
5. **Implement Venues map integration** - Add location services and shift planning
6. **Add micro-interactions** - Smooth animations and transitions throughout
7. **Optimize for performance** - Ensure fast loading and smooth scrolling
8. **Accessibility audit** - Verify WCAG compliance and screen reader support

This design specification provides a comprehensive roadmap for completing the visual and experiential design of all main app screens while maintaining consistency with the existing design system and codebase architecture.