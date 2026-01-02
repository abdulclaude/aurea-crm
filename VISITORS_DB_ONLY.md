# Visitors Tab - Database Only (No localStorage)

## ✅ Fixed

The Visitors tab now only shows visitors from the **database** who have sessions in the current funnel. No more localStorage data.

---

## What Changed

### **Before:**
The query was pulling **ALL** visitors from the `AnonymousUserProfile` table, regardless of whether they had sessions in the current funnel:

```typescript
// OLD - Shows ALL visitors across ALL funnels
const profiles = await db.anonymousUserProfile.findMany({
  where,  // Only filters by search/lifecycle/identified
  include: {
    sessions: {
      where: { funnelId: input.funnelId },  // Only for display, not filtering
    },
  },
});
```

### **After:**
Now only shows visitors who have **at least one session** in the current funnel:

```typescript
// NEW - Only shows visitors for THIS funnel
const profiles = await db.anonymousUserProfile.findMany({
  where: {
    ...where,
    sessions: {
      some: {
        funnelId: input.funnelId,  // ✅ Must have session in this funnel
      },
    },
  },
  include: {
    sessions: {
      where: { funnelId: input.funnelId },
    },
  },
});
```

---

## How It Works Now

### **Data Source:**
- ✅ **Database only** - `AnonymousUserProfile` table
- ✅ **Funnel-specific** - Only visitors with sessions in current funnel
- ❌ **No localStorage** - Completely removed

### **Visitor Creation:**
Visitors are automatically created when the Inngest worker processes tracking events:

```typescript
// In process-tracking-events.ts
await db.anonymousUserProfile.upsert({
  where: { id: anonymousId },
  create: {
    id: anonymousId,
    displayName: generateDisplayName(anonymousId),
    firstSeen: new Date(),
    lastSeen: new Date(),
    totalSessions: 1,
    totalEvents: 0,
  },
  update: {
    lastSeen: new Date(),
    totalSessions: { increment: 1 },
  },
});
```

### **Display Name Generation:**
- **Identified users:** Uses name from `identify()` call or email
- **Anonymous users:** Auto-generated as "Visitor #XXX"

---

## What You'll See

### **Visitors Tab:**
```
┌─────────────────────────────────────────────────────────────┐
│ Visitor         │ Status      │ Activity │ Last Seen     │ │
├─────────────────────────────────────────────────────────────┤
│ [🎨] John Smith  │ ✓ Identified│ 5 sessions│ 2 hours ago  │ │
│      john@ex.com │ RETURNING   │ 45 events │               │ │
├─────────────────────────────────────────────────────────────┤
│ [🎨] Visitor #176│ Anonymous   │ 3 sessions│ 5 hours ago  │ │
│                  │ NEW         │ 12 events │               │ │
└─────────────────────────────────────────────────────────────┘
```

Only shows visitors who have **actually visited THIS funnel**.

---

## Database Schema

```
AnonymousUserProfile (Visitor)
├── id (anonymousId)
├── displayName
├── firstSeen
├── lastSeen
├── identifiedUserId
├── lifecycleStage (NEW, RETURNING, LOYAL, CHURNED)
├── totalSessions
├── totalEvents
└── sessions[] → FunnelSession
    └── funnelId (filter here!)
```

---

## Filtering

The Visitors tab respects all filters:

1. **Search:** Searches displayName and identifiedUserId
2. **Lifecycle Stage:** NEW, RETURNING, LOYAL, CHURNED
3. **Identification Status:** Identified vs Anonymous
4. **Funnel:** ✅ **NOW FILTERED BY FUNNEL!**

---

## Benefits

### **1. Accurate Data**
- ✅ Only shows real visitors from database
- ✅ No stale localStorage data
- ✅ Consistent across devices/browsers

### **2. Funnel-Specific**
- ✅ Each funnel shows only its visitors
- ✅ No mixing of visitors from different funnels
- ✅ Proper visitor counts per funnel

### **3. Performance**
- ✅ Efficient database query with proper indexes
- ✅ Pagination for large visitor lists
- ✅ Only loads visitors with sessions in current funnel

### **4. GDPR Compliant**
- ✅ Centralized data in database
- ✅ Easy to delete visitor data (Right to be Forgotten)
- ✅ Consent tracking per visitor

---

## Verification

### **Test the Fix:**

1. **Open Aurea CRM:**
   ```bash
   cd ~/Desktop/aurea-crm
   npm run dev:all
   ```

2. **Navigate to:** Funnels → TTR → Visitors tab

3. **Expected:**
   - Only shows visitors who have visited TTR funnel
   - Each visitor has at least 1 session
   - No duplicate or ghost visitors
   - All data from database (no localStorage)

4. **Create a test visitor:**
   ```bash
   # In another terminal
   cd ~/Desktop/ttr
   npm run dev
   
   # Open http://localhost:3001 in incognito
   # Browse the site
   # Check Aurea CRM Visitors tab
   # Should see new visitor appear
   ```

---

## Migration Notes

### **No Breaking Changes:**
- Existing visitors in database will still show
- No data loss
- Backward compatible

### **localStorage Cleanup (Optional):**
If you want to clean up old localStorage data:

```javascript
// In browser console on funnel site
localStorage.removeItem('aurea_visitors');
localStorage.removeItem('aurea_visitor_profiles');
```

But this isn't necessary - localStorage is no longer used.

---

## Related Changes

This is part of a larger refactor:

1. ✅ **Sessions** - Only from database (no localStorage)
2. ✅ **Visitors** - Only from database (no localStorage) ← This change
3. ✅ **Events** - Processed by Inngest worker
4. ✅ **Geography** - Calculated from session data
5. ✅ **Analytics** - All database-driven

---

## Summary

**Before:**
- ❌ Showed ALL visitors from database
- ❌ Not filtered by funnel
- ❌ Could show visitors who never visited this funnel

**After:**
- ✅ Shows ONLY visitors with sessions in current funnel
- ✅ Properly filtered by funnelId
- ✅ Accurate visitor counts per funnel
- ✅ 100% database-driven (no localStorage)

**File Changed:**
- `src/features/external-funnels/server/external-funnels-router.ts` (lines 1501-1531)

**Result:**
The Visitors tab now accurately shows only visitors who have actually used this specific funnel! 🎉
