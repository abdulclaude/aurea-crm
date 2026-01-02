# Event Categorization - Visual Guide

## Before vs After

### Before Implementation
```
┌──────────────────────────────────────────────────────────────────┐
│ Event                    | User        | Device  | Time           │
├──────────────────────────────────────────────────────────────────┤
│ video_started            | Emerald Fox | Desktop | Dec 29 at 2:32 │
│ buy_button_clicked       | Emerald Fox | Desktop | Dec 29 at 2:35 │
│ conversion               | Emerald Fox | Desktop | Dec 29 at 2:38 │
└──────────────────────────────────────────────────────────────────┘
```
*All events look the same - hard to distinguish types at a glance*

---

### After Implementation
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Event                    | Category    | Description              | Value  | Time       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [video_started]          | engagement  | User started intro video | 25/100 | Dec 29 2:32│
│  (purple badge)          |             |                          |        |            │
│                          |             |                          |        |            │
│ [buy_button_clicked]     | intent      | User clicked main CTA    | 80/100 | Dec 29 2:35│
│  (orange badge)          |             |                          |        |            │
│                          |             |                          |        |            │
│ [conversion]             | conversion  | Checkout completed       |100/100 | Dec 29 2:38│
│  (green badge)           |             |                          |        |            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
*Events are color-coded and provide context about their purpose*

---

## Color Palette

### Light Mode

```
┌─────────────────────────────────────────────────────────┐
│  VIEWING     │ [event_name]  │ Blue Badge with Border  │
│              │  bg-blue-100  │ text-blue-800           │
│              │  border-blue-200                         │
├─────────────────────────────────────────────────────────┤
│  ENGAGEMENT  │ [event_name]  │ Purple Badge with Border│
│              │  bg-purple-100│ text-purple-800         │
│              │  border-purple-200                       │
├─────────────────────────────────────────────────────────┤
│  INTENT      │ [event_name]  │ Orange Badge with Border│
│              │  bg-orange-100│ text-orange-800         │
│              │  border-orange-200                       │
├─────────────────────────────────────────────────────────┤
│  CONVERSION  │ [event_name]  │ Green Badge with Border │
│              │  bg-green-100 │ text-green-800          │
│              │  border-green-200                        │
├─────────────────────────────────────────────────────────┤
│  CUSTOM      │ [event_name]  │ Gray Badge with Border  │
│              │  bg-gray-100  │ text-gray-800           │
│              │  border-gray-200                         │
├─────────────────────────────────────────────────────────┤
│  UNCATEGORIZED│[event_name]  │ Primary Badge (default) │
│              │  bg-primary/5 │ text-primary/80         │
│              │  border-primary/10                       │
└─────────────────────────────────────────────────────────┘
```

### Dark Mode

```
┌─────────────────────────────────────────────────────────┐
│  VIEWING     │ [event_name]  │ Dark Blue Badge         │
│              │  dark:bg-blue-900/20                     │
│              │  dark:text-blue-400                      │
│              │  dark:border-blue-800/30                 │
├─────────────────────────────────────────────────────────┤
│  ENGAGEMENT  │ [event_name]  │ Dark Purple Badge       │
│              │  dark:bg-purple-900/20                   │
│              │  dark:text-purple-400                    │
│              │  dark:border-purple-800/30               │
├─────────────────────────────────────────────────────────┤
│  INTENT      │ [event_name]  │ Dark Orange Badge       │
│              │  dark:bg-orange-900/20                   │
│              │  dark:text-orange-400                    │
│              │  dark:border-orange-800/30               │
├─────────────────────────────────────────────────────────┤
│  CONVERSION  │ [event_name]  │ Dark Green Badge        │
│              │  dark:bg-green-900/20                    │
│              │  dark:text-green-400                     │
│              │  dark:border-green-800/30                │
├─────────────────────────────────────────────────────────┤
│  CUSTOM      │ [event_name]  │ Dark Gray Badge         │
│              │  dark:bg-gray-900/20                     │
│              │  dark:text-gray-400                      │
│              │  dark:border-gray-800/30                 │
└─────────────────────────────────────────────────────────┘
```

---

## Column Breakdown

### 1. Event Column (Always Visible)
- **Display**: Event name in color-coded badge
- **Color**: Based on category (see palette above)
- **Border**: Subtle border matching category color
- **Conversions**: Always green (overrides category)
- **Grouping**: Shows `×N` badge for grouped events

### 2. Category Column (New)
- **Display**: Category name (viewing, engagement, intent, conversion, custom)
- **Style**: Small text, capitalized, primary color
- **Empty**: Shows `—` if no category
- **Sortable**: ✅ Yes (alphabetically)

### 3. Description Column (New)
- **Display**: User-defined description of event
- **Style**: Small text, muted color, max-width 300px
- **Truncation**: Long descriptions are truncated with ellipsis
- **Empty**: Shows `—` if no description
- **Sortable**: ❌ No

### 4. Value Column (New)
- **Display**: Micro-conversion impact score
- **Format**: `X/100` (e.g., "25/100", "80/100")
- **Style**: Small text, primary color
- **Empty**: Shows `—` if no value
- **Sortable**: ✅ Yes (numerically)

---

## Real-World Examples

### TTR Funnel Events

#### 1. Viewing Events (Blue)
```
┌─────────────────────────────────────────────────────────┐
│ [hero_viewed]           │ viewing   │ User landed on    │
│  Blue badge             │           │ hero section      │
│                         │           │                   │
│ [testimonials_viewed]   │ viewing   │ User scrolled to  │
│  Blue badge             │           │ testimonials      │
│                         │           │                   │
│ [pricing_section_viewed]│ viewing   │ User viewed       │
│  Blue badge             │           │ pricing details   │
└─────────────────────────────────────────────────────────┘
```

#### 2. Engagement Events (Purple)
```
┌─────────────────────────────────────────────────────────┐
│ [video_started]         │ engagement│ User started      │
│  Purple badge           │           │ watching video    │
│  Value: 25/100          │           │                   │
│                         │           │                   │
│ [video_50_percent]      │ engagement│ User watched half │
│  Purple badge           │           │ of the video      │
│  Value: 50/100          │           │                   │
│                         │           │                   │
│ [video_completed]       │ engagement│ User watched full │
│  Purple badge           │           │ video             │
│  Value: 75/100          │           │                   │
└─────────────────────────────────────────────────────────┘
```

#### 3. Intent Events (Orange)
```
┌─────────────────────────────────────────────────────────┐
│ [faq_opened]            │ intent    │ User opened FAQ   │
│  Orange badge           │           │ section           │
│  Value: 60/100          │           │                   │
│                         │           │                   │
│ [cta_hovered]           │ intent    │ User hovered over │
│  Orange badge           │           │ CTA button        │
│  Value: 70/100          │           │                   │
│                         │           │                   │
│ [buy_button_clicked]    │ intent    │ User clicked main │
│  Orange badge           │           │ CTA               │
│  Value: 80/100          │           │                   │
└─────────────────────────────────────────────────────────┘
```

#### 4. Conversion Events (Green)
```
┌─────────────────────────────────────────────────────────┐
│ [conversion]            │ conversion│ Checkout          │
│  Green badge            │           │ completed         │
│  Value: 100/100         │           │                   │
│  Revenue: $997.00       │           │                   │
└─────────────────────────────────────────────────────────┘
```

#### 5. Custom Events (Gray)
```
┌─────────────────────────────────────────────────────────┐
│ [scroll_depth_75]       │ custom    │ User scrolled 75% │
│  Gray badge             │           │ of page           │
│                         │           │                   │
│ [time_on_page_60]       │ custom    │ User spent 60s on │
│  Gray badge             │           │ page              │
└─────────────────────────────────────────────────────────┘
```

---

## Sorting Behavior

### Sort by Category (Alphabetical)
```
Ascending:  conversion → custom → engagement → intent → viewing → (null)
Descending: viewing → intent → engagement → custom → conversion → (null)
```

### Sort by Value (Numeric)
```
Ascending:  0/100 → 25/100 → 50/100 → 75/100 → 100/100 → (null)
Descending: 100/100 → 75/100 → 50/100 → 25/100 → 0/100 → (null)
```

### Sort by Time (Default)
```
Descending: Most recent → Oldest (default)
Ascending:  Oldest → Most recent
```

---

## User Journey Visualization

Imagine a TTR visitor's journey:

```
1. [hero_viewed]          (Blue)    → Landing - Awareness
2. [video_started]        (Purple)  → Engagement begins
3. [video_50_percent]     (Purple)  → Deeper engagement
4. [testimonials_viewed]  (Blue)    → Social proof check
5. [faq_opened]           (Orange)  → Showing intent
6. [pricing_section_viewed] (Blue)  → Evaluating offer
7. [cta_hovered]          (Orange)  → High intent
8. [buy_button_clicked]   (Orange)  → Very high intent
9. [conversion]           (Green)   → Sale completed! 🎉
```

**Visual Pattern:**
- **Blue** (viewing) → User exploring
- **Purple** (engagement) → User actively engaging
- **Orange** (intent) → User showing buying signals
- **Green** (conversion) → User converted!

---

## Testing Scenarios

### Scenario 1: New Event Without Category
```
Event: "custom_button_click"
Category: null
Description: null
Value: null

Expected Display:
┌─────────────────────────────────────────────────────────┐
│ [custom_button_click]   │ —         │ —                 │
│  Primary badge (gray)   │           │                   │
│  No border highlighting │           │                   │
└─────────────────────────────────────────────────────────┘
```

### Scenario 2: Conversion Overrides Category
```
Event: "checkout_completed"
Category: "custom"
isConversion: true
Value: 100

Expected Display:
┌─────────────────────────────────────────────────────────┐
│ [conversion]            │ custom    │ Checkout complete │
│  GREEN badge            │           │ 100/100           │
│  (not gray!)            │           │                   │
└─────────────────────────────────────────────────────────┘
```
*Note: Even though category is "custom" (gray), conversion events always show green*

### Scenario 3: Long Description Truncation
```
Event: "video_completed"
Description: "User successfully completed watching the entire 15-minute product demonstration video showcasing all premium features"

Expected Display:
┌─────────────────────────────────────────────────────────┐
│ [video_completed]       │ engagement│ User successfully │
│  Purple badge           │           │ completed watch...│
│                         │           │ (truncated)       │
└─────────────────────────────────────────────────────────┘
```

---

## Mobile Responsiveness

On smaller screens, columns may be hidden to fit:

### Desktop View (All Columns)
```
Event | Category | Description | Value | Page | User | Device | Revenue | Time
```

### Tablet View (Some Hidden)
```
Event | Category | Value | User | Time
```

### Mobile View (Minimal)
```
Event | User | Time
```

*Users can toggle column visibility via toolbar*

---

## Accessibility Notes

✅ **Color is not the only indicator**
- Category column provides text label
- Description provides context
- Screen readers can read category text

✅ **Keyboard Navigation**
- Column sorting works with keyboard
- Column visibility toggle accessible

✅ **High Contrast**
- Borders on badges ensure visibility
- Dark mode colors maintain contrast ratios

---

## Quick Reference

| Category | Badge Color | Use Case | Example Events |
|----------|-------------|----------|----------------|
| **viewing** | 🔵 Blue | User sees content | hero_viewed, testimonials_viewed |
| **engagement** | 🟣 Purple | User interacts | video_started, video_completed |
| **high_engagement** | 🟣 Fuchsia | High engagement detected | high_engagement_detected |
| **intent** | 🟠 Orange | User shows interest | faq_opened, buy_button_clicked |
| **conversion** | 🟢 Green | User converts | checkout_completed |
| **session** | 🔵 Cyan | Session tracking | session_start, session_end |
| **performance** | 🟡 Yellow | Web vitals | web_vital |
| **custom** | ⚪ Gray | User-defined | scroll_depth_75, time_on_page |
| **null** | ⚪ Primary | Uncategorized | Any event without category |

---

**Implementation Complete!** 🎉

Ready to test with real TTR funnel data.
