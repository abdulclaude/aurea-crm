# Quick Start - Custom Event Colors

## What You Need to Do

### 1. Restart Both Servers

```bash
# Terminal 1 - Aurea CRM
cd /Users/abdul/Desktop/aurea-crm
npm run dev:all

# Terminal 2 - TTR
cd /Users/abdul/Desktop/ttr
npm run dev
```

### 2. Test It

Visit TTR and interact with the page:
```
http://localhost:3001
```

Then check Aurea CRM events:
```
http://localhost:3000/external-funnels/[funnel-id]/events
```

---

## What You'll See

### Events with Custom Colors

```
[high_engagement_detected]  🟣 Fuchsia  (bright magenta)
[session_start]             🔵 Cyan     (light blue)
[session_end]               🔵 Cyan     (light blue)
[web_vital]                 🟡 Yellow   (warning color)
```

### Grouped Events Match

```
[video_started] (purple)  ×2 (purple)  ← Both match!
```

---

## How to Add Your Own Colors

### Option 1: Color Name (SDK Auto-Generates)

```typescript
// In TTR src/components/aurea-tracking.tsx
'my_event': {
  category: 'custom',
  color: 'pink',  // SDK generates: bg-pink-100 text-pink-800...
  value: 70,
  description: 'My custom event'
}
```

### Option 2: Full Tailwind Classes

```typescript
'my_event': {
  category: 'custom',
  color: 'bg-indigo-200 text-indigo-900 border-indigo-400',
  value: 70,
  description: 'My custom event'
}
```

---

## Available Colors

```
rose, pink, fuchsia, purple, violet, indigo, blue, sky, cyan, teal,
emerald, green, lime, yellow, amber, orange, red, slate, gray, zinc
```

---

## No Breaking Changes

- ✅ Old events without colors still work (use category defaults)
- ✅ Existing functionality unchanged
- ✅ Database migration already applied
- ✅ SDK updated to 1.3.2

---

## Files Modified

**SDK:** Built and installed `aurea-tracking-sdk@1.3.2`  
**Database:** Migration applied (added `eventColor` field)  
**TTR:** Updated with custom colors for special events  
**Aurea CRM:** Updated to render custom colors  

---

**Just restart and test!** 🎨
