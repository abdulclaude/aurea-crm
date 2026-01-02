# Visual Guide - Event Colors & Categories

## At a Glance

When you open the Events table in Aurea CRM, you'll see:

```
🔵 Blue      - viewing        (hero_viewed, testimonials_viewed)
🟣 Purple    - engagement     (video_started, video_completed)
🟣 Fuchsia   - high_engagement (high_engagement_detected)
🟠 Orange    - intent         (buy_button_clicked, faq_opened)
🟢 Green     - conversion     (checkout_completed)
🔵 Cyan      - session        (session_start, session_end)
🟡 Yellow    - performance    (web_vital)
⚪ Gray      - custom         (scroll_depth, time_on_page)
```

## Key Improvements

### ✅ Grouped Event Badges Match Color
```
Before: [video_started] (purple)  ×2 (gray)
After:  [video_started] (purple)  ×2 (purple)  ← Consistent!
```

### ✅ Session Events Stand Out
```
Before: [session_start] (gray)   ← Lost in custom events
After:  [session_start] (cyan)   ← Distinct tracking
```

### ✅ Performance Events Visible
```
Before: [web_vital] (gray)       ← Generic
After:  [web_vital] (yellow)     ← Performance monitoring
```

### ✅ High Engagement Pops
```
Before: [high_engagement_detected] (gray)    ← Buried
After:  [high_engagement_detected] (fuchsia) ← Vibrant!
```

## Complete Journey Example

```
2:30  [session_start]          🔵 Cyan    Session begins
2:30  [hero_viewed]            🔵 Blue    Landing
2:31  [video_started] ×2       🟣 Purple  Engagement
2:32  [high_engagement]        🟣 Fuchsia High engagement!
2:32  [web_vital]              🟡 Yellow  Performance check
2:34  [buy_button_clicked]     🟠 Orange  Intent signal
2:36  [conversion]             🟢 Green   Sale! 🎉
2:36  [session_end]            🔵 Cyan    Session ends
```

**Files Changed:**
- `aurea-crm/src/features/external-funnels/components/events-table.tsx`
- `ttr/src/components/aurea-tracking.tsx`

**Documentation:**
- `EVENT_CATEGORIES_UPDATE.md` - Full technical details
