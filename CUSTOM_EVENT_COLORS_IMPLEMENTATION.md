# Custom Event Colors Implementation - December 29, 2025

## Overview

Implemented **dynamic color assignment** for events, allowing TTR (or any funnel) to send custom colors for events instead of hardcoding color cases in Aurea CRM.

**Key Feature:** Events can now specify their color in two ways:
1. **Color name** (e.g., `'fuchsia'`, `'cyan'`, `'yellow'`) - SDK auto-generates Tailwind classes
2. **Full Tailwind classes** (e.g., `'bg-pink-100 text-pink-800 border-pink-200'`) - Used as-is

---

## How It Works

### Flow Diagram

```
TTR Component
  ↓ registers event with color
sdk.registerEventCategories({
  'high_engagement_detected': {
    category: 'high_engagement',
    color: 'fuchsia'  ← Color specified here
  }
})
  ↓
SDK sends to Aurea
{
  eventName: 'high_engagement_detected',
  properties: {
    _category: 'high_engagement',
    _color: 'fuchsia',  ← Sent to backend
    ...
  }
}
  ↓
Aurea Inngest extracts
const eventColor = evt.properties?._color || null;
  ↓
Aurea Database stores
FunnelEvent.eventColor = 'fuchsia'
  ↓
Aurea CRM reads & renders
getCategoryColor(category, isConversion, 'fuchsia')
  ↓ generates
'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/20...'
```

---

## Changes Made

### 1. SDK Updates (aurea-tracking-sdk)

#### **A. Added `color` field to `EventCategoryConfig`**

```typescript
interface EventCategoryConfig {
  category: EventCategory;
  advanceTo?: string;
  value?: number;
  description?: string;
  trackOnce?: boolean;
  color?: string; // NEW: Custom color for this event
}
```

#### **B. Updated `trackEvent()` to accept color**

```typescript
trackEvent(
  eventName: string, 
  properties?: Record<string, any>,
  options?: {
    category?: EventCategory;
    value?: number;
    advanceTo?: FunnelStage;
    description?: string;
    color?: string; // NEW
  }
)
```

#### **C. SDK sends color in properties**

```typescript
this.track(eventName, {
  ...properties,
  _category: category,
  _value: value,
  _description: description,
  _color: color, // NEW: Send to backend
  _currentStage: this.currentStage,
  _categoryStats: Object.fromEntries(this.eventCategoryStats),
  _trackedOnce: trackOnce,
});
```

**Version:** `1.3.1` → `1.3.2`

---

### 2. Database Updates (Aurea CRM)

#### **Added `eventColor` field to Prisma schema**

```prisma
model FunnelEvent {
  // ... existing fields
  
  // Funnel tracking
  funnelStage          String?
  isMicroConversion    Boolean      @default(false)
  microConversionType  String?
  microConversionValue Float?
  eventCategory        String?
  eventDescription     String?
  eventColor           String?      // NEW: Custom color
  
  // ... rest of fields
}
```

**Migration:** `20251229022403_add_event_color`

```sql
ALTER TABLE "FunnelEvent" ADD COLUMN "eventColor" TEXT;
```

---

### 3. Inngest Function Updates

#### **Extract and store color**

```typescript
// File: src/inngest/functions/process-tracking-events.ts

// Extract user-defined event category (from new SDK trackEvent)
const eventCategory = evt.properties?._category || null;
const eventValue = evt.properties?._value || null;
const eventDescription = evt.properties?._description || null;
const eventColor = evt.properties?._color || null; // NEW

// ... later in return statement
return {
  // ... other fields
  eventCategory,
  eventDescription,
  eventColor, // NEW: Store in database
  // ... rest
};
```

---

### 4. Frontend Updates (Events Table)

#### **A. Updated `EventRow` type**

```typescript
type EventRow = {
  // ... existing fields
  eventCategory: string | null;
  eventDescription: string | null;
  eventColor?: string | null; // NEW (optional for backwards compat)
  microConversionValue: number | null;
  isMicroConversion: boolean;
  // ... rest
};
```

#### **B. Updated `getCategoryColor()` function**

```typescript
const getCategoryColor = (
  category: string | null, 
  isConversion: boolean, 
  customColor: string | null // NEW parameter
): string => {
  // Priority 1: Custom color (if provided)
  if (customColor) {
    // Check if it's a full Tailwind class string (contains spaces)
    if (customColor.includes(' ')) {
      return customColor; // Use as-is
    }
    
    // Otherwise, it's a color name - generate Tailwind classes
    return `bg-${customColor}-100 text-${customColor}-800 border-${customColor}-200 dark:bg-${customColor}-900/20 dark:text-${customColor}-400 dark:border-${customColor}-800/30`;
  }
  
  // Priority 2: Conversion override
  if (isConversion) return "bg-green-100 text-green-800...";
  
  // Priority 3: Default category colors
  switch (category) {
    case "viewing": return "bg-blue-100...";
    case "engagement": return "bg-purple-100...";
    // ... etc
  }
};
```

#### **C. Updated cell renderers**

```typescript
// Event name badge
<span className={`... ${getCategoryColor(
  row.original.eventCategory, 
  row.original.isConversion, 
  row.original.eventColor || null // NEW: Pass custom color
)}`}>

// Grouped event badge (×2, ×3, etc.)
<span className={`... ${getCategoryColor(
  row.original.eventCategory, 
  row.original.isConversion, 
  row.original.eventColor || null // NEW: Pass custom color
)}`}>
```

---

### 5. TTR Configuration Updates

#### **Added colors to event registrations**

```typescript
// File: /ttr/src/components/aurea-tracking.tsx

sdk.registerEventCategories({
  // HIGH_ENGAGEMENT category
  'high_engagement_detected': {
    category: 'high_engagement',
    color: 'fuchsia', // NEW: Bright/vibrant
    advanceTo: 'desire',
    value: 85,
    description: 'High engagement detected - rapid user interactions',
    trackOnce: true
  },
  
  // SESSION category
  'session_start': {
    category: 'session',
    color: 'cyan', // NEW: Cool neutral for system events
    value: 0,
    description: 'User session started',
    trackOnce: false
  },
  'session_end': {
    category: 'session',
    color: 'cyan', // NEW
    value: 0,
    description: 'User session ended',
    trackOnce: false
  },
  
  // PERFORMANCE category
  'web_vital': {
    category: 'performance',
    color: 'yellow', // NEW: Warning/monitoring color
    value: 0,
    description: 'Core Web Vitals measurement',
    trackOnce: false
  },
});
```

---

## Usage Examples

### Example 1: Color Name (SDK Auto-Generates Classes)

```typescript
sdk.registerEventCategories({
  'special_promo_clicked': {
    category: 'custom',
    color: 'pink', // Just the color name
    value: 70,
    description: 'User clicked special promo banner'
  }
});
```

**Result in Aurea CRM:**
```
Badge classes: bg-pink-100 text-pink-800 border-pink-200 
               dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/30
```

### Example 2: Full Tailwind Classes (Custom Styling)

```typescript
sdk.registerEventCategories({
  'vip_action': {
    category: 'custom',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-600',
    value: 90,
    description: 'VIP user action'
  }
});
```

**Result in Aurea CRM:**
```
Badge classes: bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-600
               (used exactly as specified)
```

### Example 3: Inline Color (No Registration)

```typescript
sdk.trackEvent('limited_time_offer_viewed', {
  userId: user.id,
  offerId: 'summer-sale'
}, {
  category: 'intent',
  color: 'rose', // Inline color
  value: 75,
  description: 'User viewed limited time offer'
});
```

---

## Color Priority System

The `getCategoryColor()` function uses this priority order:

1. **Custom Color** (highest priority)
   - If `eventColor` is set, use it
   - Short name → Auto-generate Tailwind classes
   - Full classes → Use as-is

2. **Conversion Override**
   - If `isConversion === true`, force green

3. **Default Category Colors** (lowest priority)
   - viewing → blue
   - engagement → purple
   - intent → orange
   - etc.

### Priority Examples

```typescript
// Case 1: Custom color overrides category default
{
  category: 'engagement', // Would normally be purple
  color: 'fuchsia'        // Overrides to fuchsia
}
→ Result: Fuchsia badge

// Case 2: Conversion overrides everything
{
  category: 'custom',
  color: 'pink',
  isConversion: true
}
→ Result: Green badge (conversion always wins)

// Case 3: No color, use category default
{
  category: 'viewing',
  color: null
}
→ Result: Blue badge (category default)
```

---

## Available Tailwind Colors

Any standard Tailwind color works:

```
slate, gray, zinc, neutral, stone,
red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose
```

**Pattern:** `bg-{color}-100 text-{color}-800 border-{color}-200`

---

## Testing

### 1. Test Color Name

```typescript
// In TTR aurea-tracking.tsx
'test_event_1': {
  category: 'custom',
  color: 'rose', // Test rose color
  value: 50,
  description: 'Test event with rose color'
}

// Trigger event
sdk.trackEvent('test_event_1');

// Expected in Aurea CRM:
// Rose badge: bg-rose-100 text-rose-800 border-rose-200
```

### 2. Test Full Tailwind Classes

```typescript
'test_event_2': {
  category: 'custom',
  color: 'bg-indigo-200 text-indigo-900 border-indigo-400',
  value: 60,
  description: 'Test event with custom Tailwind classes'
}

// Trigger event
sdk.trackEvent('test_event_2');

// Expected in Aurea CRM:
// Exact classes: bg-indigo-200 text-indigo-900 border-indigo-400
```

### 3. Test Grouped Events

```typescript
// Trigger multiple times
sdk.trackEvent('video_started');
sdk.trackEvent('video_started');

// Expected in Aurea CRM:
// [video_started] (purple)  ×2 (purple)  ← Both match
```

---

## Migration Path

### For Existing Events (No Color)

```typescript
// Old registration (still works!)
'faq_opened': {
  category: 'intent',
  value: 50,
  description: 'User opened FAQ'
  // No color specified
}

→ Result: Uses category default (orange for 'intent')
```

### Adding Colors to Existing Events

```typescript
// Updated registration
'faq_opened': {
  category: 'intent',
  color: 'amber', // NEW: Custom color
  value: 50,
  description: 'User opened FAQ'
}

→ Result: Uses amber instead of default orange
```

---

## Files Modified

### SDK (`/Users/abdul/Desktop/aurea-tracking-sdk`)
1. `src/index.ts`
   - Added `color?: string` to `EventCategoryConfig` interface (line 17)
   - Added `color?: string` to `trackEvent()` options (line 409)
   - Extract color from config (line 417)
   - Send `_color` in properties (line 449)
2. `package.json`
   - Version: `1.3.1` → `1.3.2`

### Aurea CRM (`/Users/abdul/Desktop/aurea-crm`)
1. `prisma/schema.prisma`
   - Added `eventColor String?` field to `FunnelEvent` model (line 2597)
2. `src/inngest/functions/process-tracking-events.ts`
   - Extract `eventColor` from properties (line 107)
   - Store `eventColor` in database (line 170)
3. `src/features/external-funnels/components/events-table.tsx`
   - Added `eventColor?: string | null` to `EventRow` type (line 38)
   - Updated `getCategoryColor()` to accept `customColor` parameter (line 125)
   - Pass `eventColor` to `getCategoryColor()` in event badge (line 196)
   - Pass `eventColor` to `getCategoryColor()` in grouped badge (line 204)

### TTR (`/Users/abdul/Desktop/ttr`)
1. `src/components/aurea-tracking.tsx`
   - Added `color: 'fuchsia'` to `high_engagement_detected` (line 256)
   - Added `color: 'cyan'` to `session_start` and `session_end` (lines 266, 273)
   - Added `color: 'yellow'` to `web_vital` (line 282)
2. `package.json`
   - Updated: `aurea-tracking-sdk` dependency to `1.3.2`

---

## Deployment Checklist

### 1. SDK
- [x] Add `color` field to `EventCategoryConfig`
- [x] Update `trackEvent()` options
- [x] Send `_color` in properties
- [x] Build SDK (`npm run build`)
- [x] Update version to `1.3.2`

### 2. Aurea CRM
- [x] Add `eventColor` to Prisma schema
- [x] Create migration
- [x] Apply migration
- [x] Generate Prisma client
- [x] Update Inngest to extract color
- [x] Update EventRow type
- [x] Update getCategoryColor() function
- [x] Update cell renderers

### 3. TTR
- [x] Install SDK `1.3.2`
- [x] Add colors to event registrations
- [ ] Test with real events

---

## Advantages

### Before (Hardcoded Categories)
```typescript
// In Aurea CRM events-table.tsx
switch (category) {
  case "viewing": return "blue";
  case "engagement": return "purple";
  case "custom_type_1": return "pink"; // Have to add every custom type!
  case "custom_type_2": return "rose"; // Another hardcoded case...
  // ... endless cases
}
```

**Problem:** Every new custom event type requires code changes in Aurea CRM.

### After (Dynamic Colors)
```typescript
// In TTR (or any funnel)
'my_special_event': {
  category: 'custom',
  color: 'pink', // Just specify the color!
  value: 80,
  description: 'My special event'
}
```

**Benefit:** No Aurea CRM code changes needed for custom event colors!

---

## Benefits

✅ **Flexible** - Each funnel can define its own color scheme  
✅ **No Hardcoding** - Don't need to update Aurea CRM for new event types  
✅ **Two Modes** - Color name (auto-generated) or full Tailwind classes  
✅ **Backwards Compatible** - Existing events without colors still work  
✅ **Consistent** - Grouped events inherit parent color automatically  
✅ **Override System** - Custom color → Conversion green → Category default  

---

## Summary

**What Changed:**
- SDK can now send custom colors per event
- Database stores `eventColor` field
- Frontend uses custom color if provided, falls back to category defaults
- TTR specifies colors for special events (high_engagement, session, performance)

**Result:**
- No more hardcoded color cases for custom events
- Each funnel can customize its color scheme
- Easier to add new event types without touching Aurea CRM code

**Version Updates:**
- SDK: `1.3.1` → `1.3.2`
- Database: Added `eventColor` field via migration

---

**Implementation Complete!** 🎨
