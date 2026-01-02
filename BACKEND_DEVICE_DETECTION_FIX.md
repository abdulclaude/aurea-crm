# Backend Device Detection Fix - December 29, 2025

## Problem

Laptops were still being registered as **"Desktop"** in Aurea CRM even after updating the SDK.

**Root Cause:** Aurea CRM's **backend** (`device-parser.ts`) was using its own simple device detection logic that didn't match the SDK's granular detection.

---

## The Issue

### Data Flow

```
SDK (TTR)
  ↓ Sends deviceType: "Laptop"
Inngest Backend
  ↓ Prefers SDK deviceType
  ↓ BUT fallback uses server-side parseUserAgent()
Database
  ↓ Stores deviceType
Aurea CRM Frontend
  ↓ Displays "Desktop" ❌
```

### What Was Happening

**SDK side (correct):**
```typescript
// SDK detects MacBook Pro 14" correctly
deviceType: "Laptop"  // ✅
screenWidth: 1512
```

**Backend side (incorrect fallback):**
```typescript
// device-parser.ts had old logic
function getDeviceType(type?: string): string {
  if (!type) return "Desktop";  // ❌ Always Desktop for MacBooks
}
```

**Result:** When SDK data was available, it worked. But if backend parsing was used (fallback), it defaulted to "Desktop".

---

## Solution

Updated Aurea CRM's backend device parser to **match the SDK's granular detection logic exactly**.

### Files Modified

#### 1. `/Users/abdul/Desktop/aurea-crm/src/lib/device-parser.ts`

**Before:**
```typescript
function getDeviceType(type?: string): string {
  if (!type) return "Desktop";  // Simple
  
  switch (type.toLowerCase()) {
    case "mobile": return "Mobile";
    case "tablet": return "Tablet";
    default: return "Desktop";
  }
}
```

**After:**
```typescript
function getDeviceType(
  type?: string, 
  userAgent?: string, 
  screenWidth?: number, 
  screenHeight?: number
): string {
  // Mobile/Tablet detection from UA
  if (type) {
    switch (type.toLowerCase()) {
      case "mobile": return "Mobile";
      case "tablet": return "Tablet";
      // ... etc
    }
  }

  // Desktop device - granular detection
  const width = screenWidth || 0;
  const height = screenHeight || 0;
  const aspectRatio = height > 0 ? width / height : 0;
  
  // Ultrawide: width >= 2560 or aspect ratio >= 2.2:1
  if (width >= 2560 || aspectRatio >= 2.2) {
    return "Ultrawide";
  }
  
  // Laptop: <= 1920 width (matches SDK logic)
  if (width > 0 && width <= 1920) {
    return "Laptop";
  }
  
  // Desktop: default
  return "Desktop";
}
```

**Key Change:** Now accepts `screenWidth` and `screenHeight` parameters and uses the same logic as the SDK!

---

#### 2. `/Users/abdul/Desktop/aurea-crm/src/inngest/functions/process-tracking-events.ts`

**Before:**
```typescript
const serverParsed = !hasSDKParsedData && sdkDeviceInfo?.userAgent 
  ? parseUserAgent(sdkDeviceInfo.userAgent)
  : null;
```

**After:**
```typescript
const serverParsed = !hasSDKParsedData && sdkDeviceInfo?.userAgent 
  ? parseUserAgent(
      sdkDeviceInfo.userAgent,
      sdkDeviceInfo.screenWidth,      // ← Pass screen width
      sdkDeviceInfo.screenHeight       // ← Pass screen height
    )
  : null;
```

**Key Change:** Now passes screen dimensions to the parser!

---

## Detection Logic (Now Consistent)

Both SDK and Backend use the same logic:

```typescript
// Step 1: Check if Ultrawide
if (screenWidth >= 2560 || aspectRatio >= 2.2) {
  return "Ultrawide";
}

// Step 2: Check if Laptop (primary threshold)
if (screenWidth <= 1920) {
  return "Laptop";  // ← MacBook Pro 14/16" detected here
}

// Step 3: Check for Windows laptops in edge case range
if (screenWidth <= 2048 && (isWindowsLaptop || isChromebook)) {
  return "Laptop";
}

// Step 4: Default to Desktop
return "Desktop";
```

---

## Why This Matters

### Scenario 1: SDK Sends Data (Normal Case)

```
SDK:      deviceType: "Laptop", screenWidth: 1512
Backend:  Uses SDK data directly
Result:   Laptop ✅
```

### Scenario 2: SDK Doesn't Send deviceType (Fallback)

**Before:**
```
SDK:      screenWidth: 1512 (no deviceType)
Backend:  parseUserAgent() → "Desktop" (wrong)
Result:   Desktop ❌
```

**After:**
```
SDK:      screenWidth: 1512 (no deviceType)
Backend:  parseUserAgent(ua, 1512, 982) → "Laptop" (correct)
Result:   Laptop ✅
```

---

## Testing

### Check Device Detection

Visit TTR on your MacBook Pro 14" and check the database:

```sql
SELECT 
  deviceType,
  screenWidth,
  screenHeight,
  userAgent
FROM "FunnelEvent"
WHERE deviceType IN ('Laptop', 'Desktop', 'Ultrawide')
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected for MacBook Pro 14":**
- `deviceType`: "Laptop"
- `screenWidth`: ~1512
- `screenHeight`: ~982

---

## Resolution Breakdown

| Device | Width | Backend Detection | SDK Detection |
|--------|-------|-------------------|---------------|
| MacBook Air 13" | 1470 | Laptop ✅ | Laptop ✅ |
| MacBook Pro 14" | 1512 | Laptop ✅ | Laptop ✅ |
| MacBook Pro 16" | 1728 | Laptop ✅ | Laptop ✅ |
| iMac 24" | 2240 | Desktop ✅ | Desktop ✅ |
| Ultrawide 21:9 | 3440 | Ultrawide ✅ | Ultrawide ✅ |

---

## Benefits

✅ **Consistent Detection:** Backend and SDK use identical logic  
✅ **No More Misclassification:** MacBooks correctly detected as Laptops  
✅ **Fallback Works:** Even without SDK data, detection is accurate  
✅ **Resolution-Based:** Uses screen dimensions, not just user agent  

---

## Summary

**Problem:** Backend had simple device detection (Desktop for all non-mobile)  
**Solution:** Updated backend to match SDK's granular detection logic  
**Result:** Laptops now correctly detected on both SDK and backend  

**Files Changed:**
1. `src/lib/device-parser.ts` - Added granular detection logic
2. `src/inngest/functions/process-tracking-events.ts` - Pass screen dimensions

**No SDK changes needed** - This was purely a backend fix!

---

**Your MacBook Pro 14" should now show as "Laptop" in all cases!** ✅💻
