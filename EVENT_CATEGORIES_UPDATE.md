# Event Categories Update - December 29, 2025

## Changes Made

### 1. Added New Event Categories

Extended category support from 5 to 8 categories:

| Category | Color | Use Case | Events |
|----------|-------|----------|--------|
| **viewing** | 🔵 Blue | User views content | hero_viewed, testimonials_viewed, stats_viewed |
| **engagement** | 🟣 Purple | User interacts | video_started, video_completed, video_replayed |
| **high_engagement** | 🟣 Fuchsia | High engagement detected | high_engagement_detected |
| **intent** | 🟠 Orange | User shows buying interest | faq_opened, buy_button_clicked |
| **conversion** | 🟢 Green | User converts | checkout_completed |
| **session** | 🔵 Cyan | Session lifecycle | session_start, session_end |
| **performance** | 🟡 Yellow | Web vitals | web_vital (LCP, FID, CLS, etc.) |
| **custom** | ⚪ Gray | Custom tracking | scroll_depth, time_on_page |

### 2. Updated Grouped Event Badges

**Before:**
```tsx
<span className="bg-primary/5 text-primary/80">×2</span>
```

**After:**
```tsx
<span className={getCategoryColor(category, isConversion)}>×2</span>
```

Now the `×N` badge inherits the same color as the parent event for visual consistency.

### 3. Updated TTR Event Registration

Added descriptions for all new event types in `/ttr/src/components/aurea-tracking.tsx`:

#### High Engagement Event
```typescript
'high_engagement_detected': {
  category: 'high_engagement',
  advanceTo: 'desire',
  value: 85,
  description: 'High engagement detected - rapid user interactions',
  trackOnce: true
}
```

#### Session Events
```typescript
'session_start': {
  category: 'session',
  value: 0,
  description: 'User session started',
  trackOnce: false
},
'session_end': {
  category: 'session',
  value: 0,
  description: 'User session ended',
  trackOnce: false
}
```

#### Performance Event
```typescript
'web_vital': {
  category: 'performance',
  value: 0,
  description: 'Core Web Vitals measurement',
  trackOnce: false
}
```

---

## New Color Palette

### Light Mode

```
┌─────────────────────────────────────────────────────────┐
│  VIEWING          │ bg-blue-100    text-blue-800        │
│  ENGAGEMENT       │ bg-purple-100  text-purple-800      │
│  HIGH_ENGAGEMENT  │ bg-fuchsia-100 text-fuchsia-800     │
│  INTENT           │ bg-orange-100  text-orange-800      │
│  CONVERSION       │ bg-green-100   text-green-800       │
│  SESSION          │ bg-cyan-100    text-cyan-800        │
│  PERFORMANCE      │ bg-yellow-100  text-yellow-800      │
│  CUSTOM           │ bg-gray-100    text-gray-800        │
└─────────────────────────────────────────────────────────┘
```

### Dark Mode

All colors include dark mode variants with `dark:bg-{color}-900/20 dark:text-{color}-400 dark:border-{color}-800/30`

---

## Visual Examples

### Before Update
```
┌────────────────────────────────────────────────────┐
│ [video_started]    (purple) │ ×2 (gray)           │
│ [session_start]    (gray)   │ User session started│
│ [web_vital]        (gray)   │ LCP: 1250ms         │
└────────────────────────────────────────────────────┘
```

### After Update
```
┌────────────────────────────────────────────────────┐
│ [video_started]    (purple) │ ×2 (purple)         │
│ [session_start]    (cyan)   │ User session started│
│ [web_vital]        (yellow) │ Core Web Vitals meas│
│ [high_engagement]  (fuchsia)│ High engagement det │
└────────────────────────────────────────────────────┘
```

**Key Improvements:**
✅ Grouped event badge matches parent color  
✅ Session events distinct (cyan vs gray)  
✅ Performance events distinct (yellow vs gray)  
✅ High engagement stands out (fuchsia vs purple)

---

## Code Changes

### Aurea CRM (1 file)

**File:** `src/features/external-funnels/components/events-table.tsx`

**Change 1: Updated `getCategoryColor()` function** (Lines 124-144)
```typescript
const getCategoryColor = (category: string | null, isConversion: boolean): string => {
  if (isConversion) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30";
  
  switch (category) {
    case "viewing":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30";
    case "engagement":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30";
    case "high_engagement": // NEW
      return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800/30";
    case "intent":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30";
    case "conversion":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30";
    case "session": // NEW
      return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/30";
    case "performance": // NEW
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30";
    case "custom":
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30";
    default:
      return "bg-primary/5 text-primary/80 border-primary/10";
  }
};
```

**Change 2: Updated grouped event badge** (Line 186)
```typescript
// Before:
<span className="text-xs font-semibold text-primary/80 bg-primary/5 px-2 py-1 rounded">
  ×{row.original.groupCount}
</span>

// After:
<span className={`text-xs font-semibold px-2 py-1 rounded border ${getCategoryColor(row.original.eventCategory, row.original.isConversion)}`}>
  ×{row.original.groupCount}
</span>
```

### TTR (1 file)

**File:** `src/components/aurea-tracking.tsx`

**Change: Added new event category registrations** (Lines 253-288)
```typescript
// HIGH_ENGAGEMENT category - Detected high engagement patterns
'high_engagement_detected': {
  category: 'high_engagement',
  advanceTo: 'desire',
  value: 85,
  description: 'High engagement detected - rapid user interactions',
  trackOnce: true
},

// SESSION category - Session lifecycle events
'session_start': {
  category: 'session',
  value: 0,
  description: 'User session started',
  trackOnce: false
},
'session_end': {
  category: 'session',
  value: 0,
  description: 'User session ended',
  trackOnce: false
},

// PERFORMANCE category - Web vitals and performance metrics
'web_vital': {
  category: 'performance',
  value: 0,
  description: 'Core Web Vitals measurement',
  trackOnce: false
},
```

---

## Why These Categories?

### 1. **high_engagement** (Fuchsia)
- **Why separate from engagement?** High engagement is a special detected pattern (rapid interactions, high score) that deserves visual distinction
- **Color choice:** Fuchsia is similar to purple (engagement) but brighter/more vibrant to indicate "heightened" engagement
- **Use case:** Automatically triggered when user shows 50+ engagement score (rapid clicks, scrolls, key presses)

### 2. **session** (Cyan)
- **Why not custom?** Session events are core SDK functionality, not user-defined tracking
- **Color choice:** Cyan is cool/neutral, distinct from user actions (blue/purple/orange)
- **Use case:** Track session lifecycle (start/end) separately from user behavior

### 3. **performance** (Yellow)
- **Why not custom?** Web vitals are standardized performance metrics (LCP, FID, CLS, FCP, TTFB)
- **Color choice:** Yellow indicates "warning/monitoring" - fits performance tracking theme
- **Use case:** Monitor Core Web Vitals and page performance metrics

### 4. **custom** (Gray) - Narrowed Scope
- **Now only for:** User-defined scroll depth and time-on-page milestones
- **Color remains gray:** Neutral color for miscellaneous tracking

---

## Event Categorization Decision Tree

```
Is it a conversion? → GREEN (conversion)
  ↓ No
Is it session lifecycle? → CYAN (session)
  ↓ No
Is it web vitals/performance? → YELLOW (performance)
  ↓ No
Is it high engagement detection? → FUCHSIA (high_engagement)
  ↓ No
Is it user viewing content? → BLUE (viewing)
  ↓ No
Is it user interacting? → PURPLE (engagement)
  ↓ No
Is it showing buying intent? → ORANGE (intent)
  ↓ No
Is it custom tracking? → GRAY (custom)
  ↓ No
Uncategorized → PRIMARY (default)
```

---

## Real-World Examples

### Session Journey with New Categories

```
1. [session_start]          🔵 Cyan     → Session begins
2. [hero_viewed]            🔵 Blue     → Landing
3. [video_started]          🟣 Purple   → Engagement
4. [high_engagement]        🟣 Fuchsia  → Detected rapid interactions!
5. [web_vital]              🟡 Yellow   → LCP: 1250ms (good)
6. [buy_button_clicked]     🟠 Orange   → Intent signal
7. [conversion]             🟢 Green    → Sale!
8. [session_end]            🔵 Cyan     → Session ends
```

### Performance Monitoring

```
Event: web_vital
Category: performance (yellow)
Description: Core Web Vitals measurement
Properties:
  - lcp: 1250ms
  - fid: 45ms
  - cls: 0.05
  - rating: "good"
```

### High Engagement Detection

```
Event: high_engagement_detected
Category: high_engagement (fuchsia)
Description: High engagement detected - rapid user interactions
Properties:
  - engagementScore: 65
  - interactionCount: 12
  - interactionType: "click"
```

---

## Testing Checklist

### Visual Testing
- [ ] High engagement events show fuchsia badge
- [ ] Session events show cyan badge
- [ ] Performance events show yellow badge
- [ ] Grouped event badges match parent color (×2, ×3, etc.)
- [ ] Dark mode colors display correctly
- [ ] All events have descriptions in Description column

### Functionality Testing
- [ ] Sort by category includes new categories
- [ ] Filter/search works with new categories
- [ ] Column visibility works
- [ ] Category column displays: "high_engagement", "session", "performance"

### Data Integrity
- [ ] TTR sends high_engagement_detected with category
- [ ] SDK sends session_start/session_end with category
- [ ] SDK sends web_vital with category
- [ ] All events have descriptions populated

---

## Deployment Notes

### No Database Migration Required
All fields already exist - just updating category values.

### Files to Deploy

**Aurea CRM:**
- `src/features/external-funnels/components/events-table.tsx`

**TTR:**
- `src/components/aurea-tracking.tsx`

### Environment Variables
No new environment variables needed.

---

## Summary

**Added:**
- ✅ 3 new event categories (high_engagement, session, performance)
- ✅ Grouped event badges now match parent color
- ✅ Descriptions for all TTR events
- ✅ Better visual distinction between event types

**Files Modified:**
- `aurea-crm/src/features/external-funnels/components/events-table.tsx`
- `ttr/src/components/aurea-tracking.tsx`

**Total Categories:** 8 (was 5)
- viewing (blue)
- engagement (purple)
- high_engagement (fuchsia) ⭐ NEW
- intent (orange)
- conversion (green)
- session (cyan) ⭐ NEW
- performance (yellow) ⭐ NEW
- custom (gray)

**Impact:**
- Better visual distinction for special event types
- Easier to spot high-value engagement patterns
- Session lifecycle tracking is more visible
- Performance monitoring events stand out
- Consistent grouped event styling

---

**Update Complete!** 🎉
