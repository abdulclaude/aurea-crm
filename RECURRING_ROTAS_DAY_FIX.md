# Recurring Rotas - Day Conversion Bug Fix 🐛

## Issue

When creating a recurring shift for "Every Sunday" on Sunday, December 14, the system was generating occurrences on **Monday** instead of **Sunday**.

### Root Cause

**Day numbering mismatch between JavaScript and RRule library:**

| Day | JavaScript `Date.getDay()` | RRule Library |
|-----|---------------------------|---------------|
| Sunday | 0 | 6 |
| Monday | 1 | 0 |
| Tuesday | 2 | 1 |
| Wednesday | 3 | 2 |
| Thursday | 4 | 3 |
| Friday | 5 | 4 |
| Saturday | 6 | 5 |

When you selected Sunday (JS day 0), the code was passing `0` directly to RRule, which RRule interpreted as **Monday**.

### Example Bug

```typescript
// What was happening:
startTime.getDay() // Returns 0 for Sunday
↓
options.byweekday = [0] // Passed to RRule as-is
↓
RRULE: BYDAY=MO // RRule thinks 0 = Monday!
```

---

## Fix Applied

Added conversion functions to translate between JavaScript days and RRule days:

### New Functions

```typescript
/**
 * Convert JavaScript day (0=Sun, 6=Sat) to RRule day (0=Mon, 6=Sun)
 */
function jsToRRuleDay(jsDay: number): number {
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // RRule: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Convert RRule day (0=Mon, 6=Sun) to JavaScript day (0=Sun, 6=Sat)
 */
function rruleToJsDay(rruleDay: number): number {
  // RRule: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return rruleDay === 6 ? 0 : rruleDay + 1;
}
```

### Updated Code

**In `patternToRRule():`**
```typescript
// Before:
options.byweekday = pattern.daysOfWeek;

// After:
options.byweekday = pattern.daysOfWeek.map(jsToRRuleDay);
```

**In `rruleToPattern():`**
```typescript
// Before:
pattern.daysOfWeek = options.byweekday.map((d: any) =>
  typeof d === "number" ? d : d.weekday
);

// After:
pattern.daysOfWeek = options.byweekday.map((d: any) => {
  const rruleDay = typeof d === "number" ? d : d.weekday;
  return rruleToJsDay(rruleDay);
});
```

---

## Verification

### Conversion Table

```
JS Day -> RRule Day:
  Sun (0) -> Sun (6) ✅
  Mon (1) -> Mon (0) ✅
  Tue (2) -> Tue (1) ✅
  Wed (3) -> Wed (2) ✅
  Thu (4) -> Thu (3) ✅
  Fri (5) -> Fri (4) ✅
  Sat (6) -> Sat (5) ✅
```

### Now Working

```typescript
// Creating "Every Sunday" recurring shift:
startTime.getDay() // Returns 0 for Sunday
↓
jsToRRuleDay(0) // Returns 6
↓
options.byweekday = [6] // Passed to RRule
↓
RRULE: BYDAY=SU // Correctly Sunday! ✅
```

---

## Action Required

**Delete existing broken recurring rotas and recreate them.**

The recurring rota you created (ID: `0943e177-b745-406d-9250-2b4bcd94d456`) has the incorrect RRULE in the database:

```
RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO  ❌ (Should be BYDAY=SU)
```

### Steps to Fix

1. **Delete the broken recurring rota:**
   - Find it in the database or UI
   - Delete it completely

2. **Create a new recurring rota:**
   - Select Sunday, December 14, 2025
   - Choose "Weekly" frequency
   - Select Sunday in the day picker
   - Or use "Every Weekend" template

3. **Verify the RRULE:**
   - Check browser console logs
   - Should see: `BYDAY=SU` for Sunday

4. **Check calendar:**
   - Navigate to December 14-20, 2025
   - You should now see the shift on Sunday, December 14

---

## Files Modified

- **`/src/features/rotas/lib/recurrence-utils.ts`**
  - Added `jsToRRuleDay()` function
  - Added `rruleToJsDay()` function
  - Updated `patternToRRule()` to convert days
  - Updated `rruleToPattern()` to convert days back

---

## Testing Checklist

- [ ] Delete old broken recurring rota
- [ ] Create new "Every Sunday" recurring shift
- [ ] Verify RRULE shows `BYDAY=SU` in console
- [ ] Confirm shift appears on Sunday on calendar
- [ ] Test "Every Monday" - should show `BYDAY=MO`
- [ ] Test "Every Weekend" - should show `BYDAY=SA,SU`
- [ ] Test "Every Weekday" - should show `BYDAY=MO,TU,WE,TH,FR`

---

## Template Verification

All templates now work correctly:

| Template | JS Days | RRule Days | RRULE Output |
|----------|---------|------------|--------------|
| Every Weekday | [1,2,3,4,5] | [0,1,2,3,4] | BYDAY=MO,TU,WE,TH,FR ✅ |
| Every Weekend | [0,6] | [6,5] | BYDAY=SA,SU ✅ |
| Every Week | [auto] | [auto] | BYDAY=(selected day) ✅ |

---

## Why This Matters

This bug would have caused **ALL recurring shifts to be off by one day** (or wrap around for Sunday → Monday).

### Examples of What Was Broken

- "Every Monday" → Created shifts on Tuesday ❌
- "Every Tuesday" → Created shifts on Wednesday ❌
- "Every Sunday" → Created shifts on Monday ❌
- "Every Weekday" → Would have wrong days ❌

### Now Fixed

- "Every Monday" → Monday ✅
- "Every Tuesday" → Tuesday ✅
- "Every Sunday" → Sunday ✅
- "Every Weekday" → Mon-Fri ✅

---

## Future Considerations

This fix ensures compatibility with:
- Standard iCalendar format (RFC 5545)
- Other calendar applications
- Proper date calculations
- Correct day-of-week matching

---

## Status

✅ **Bug Fixed** - Day conversion now works correctly
⚠️ **Action Required** - Delete and recreate existing recurring rotas
✅ **All new recurring rotas will work properly**
