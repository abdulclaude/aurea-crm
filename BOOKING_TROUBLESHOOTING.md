# Booking System Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: "Invalid option" error for status field

**Error Message:**
```
Invalid option: expected one of "PENDING"|"CONFIRMED"|"CANCELLED"|"RESCHEDULED"|"NO_SHOW"|"COMPLETED"
```

**Cause:** The status parameter is being passed as `null` or an empty string instead of `undefined` when no filter is selected.

**Solution:** 
Updated `bookings-table.tsx` line 58 to:
```typescript
status: status ? (status as any) : undefined,
```

This ensures `undefined` is passed when no status filter is selected, rather than `null`.

### Issue 2: TypeScript errors after schema changes

**Symptoms:**
- "Property 'booking' does not exist on Prisma client"
- "Module has no exported member 'BookingStatus'"

**Solution:**
1. Delete `.next` folder:
   ```bash
   rm -rf .next
   ```

2. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

### Issue 3: crypto.randomUUID not found

**Error:** `Cannot find name 'crypto'`

**Solution:** Import from Node.js crypto module:
```typescript
import { randomUUID } from "crypto";
```

Then use `randomUUID()` instead of `crypto.randomUUID()`.

### Issue 4: Enum import errors

**Error:** `Module '"@prisma/client"' has no exported member 'BookingStatus'`

**Solution:** Use string literal unions instead:
```typescript
// Instead of:
import { BookingStatus } from "@prisma/client";
z.nativeEnum(BookingStatus)

// Use:
z.enum(["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULED", "NO_SHOW", "COMPLETED"])
```

### Issue 5: JSON field type errors

**Error:** `Type 'Record<string, unknown>' is not assignable to InputJsonValue`

**Solution:** Use proper typing:
```typescript
// Instead of:
z.record(z.unknown())

// Use:
z.record(z.string(), z.any())
```

## Complete Reset Procedure

If you're experiencing persistent issues after schema changes:

```bash
# 1. Stop the dev server (Ctrl+C)

# 2. Clean build artifacts
rm -rf .next
rm -rf node_modules/.cache

# 3. Regenerate Prisma client
npx prisma generate

# 4. (Optional) Reset database if needed
npx prisma migrate reset

# 5. Restart dev server
npm run dev
```

## Verification Steps

After fixing issues, verify the system works:

1. **Navigate to Bookings**
   - Go to `/bookings`
   - Should load without errors

2. **Test Filters**
   - Try searching for a booking
   - Try filtering by status
   - Try filtering by event type

3. **Create a Booking**
   - Click "New booking"
   - Fill in form
   - Submit successfully

4. **Check Browser Console**
   - Open DevTools (F12)
   - Look for any errors in Console tab
   - Check Network tab for failed API calls

## Dev Server Issues

### Server won't start

```bash
# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9

# Clear cache and restart
rm -rf .next
npm run dev
```

### Hot reload not working

```bash
# Restart with clean cache
npm run dev
```

### TypeScript errors persist

```bash
# Restart TypeScript server in VS Code
# Command Palette (Cmd/Ctrl + Shift + P)
# Type: "TypeScript: Restart TS Server"
```

## Database Issues

### Migration errors

```bash
# Check migration status
npx prisma migrate status

# If needed, reset database (WARNING: deletes data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --name fix_booking_schema
```

### Prisma client out of sync

```bash
# Force regenerate
npx prisma generate --force
```

## Browser Issues

### Cached data causing problems

1. **Hard refresh:** Cmd/Ctrl + Shift + R
2. **Clear browser cache:** DevTools → Network → "Disable cache"
3. **Incognito mode:** Test in private browsing window

## Still Having Issues?

### Check these files for correct imports:

1. **src/features/bookings/server/bookings-router.ts**
   - Should import `{ randomUUID } from "crypto"`
   - Should NOT import enums from `@prisma/client`
   - Should use `z.enum([...])` for status/location

2. **src/features/bookings/components/bookings-table.tsx**
   - Line 58 should have: `status: status ? (status as any) : undefined`
   - Should NOT pass `null` values to query

3. **prisma/schema.prisma**
   - Check that `BookingStatus` enum exists
   - Check that `BookingLocationType` enum exists
   - Check that all three models exist (Booking, BookingEventType, CalComCredential)

### Verify Prisma Client Generation

```bash
# Should show booking models
ls node_modules/@prisma/client/index.d.ts | head -100
```

Look for:
- `BookingStatus` enum
- `BookingLocationType` enum
- `Booking` model
- `BookingEventType` model
- `CalComCredential` model

## Error Patterns & Quick Fixes

| Error Pattern | Quick Fix |
|---------------|-----------|
| "Invalid option" for enum | Pass `undefined` instead of `null` |
| "Property does not exist on Prisma" | `npx prisma generate` |
| "Cannot find name 'crypto'" | `import { randomUUID } from "crypto"` |
| "Module has no exported member" | Use string literal unions |
| TypeScript errors persist | Restart TS server + dev server |
| Schema changes not reflected | Delete `.next` + regenerate |

## Prevention Tips

1. **Always regenerate after schema changes:**
   ```bash
   npx prisma generate
   ```

2. **Clean restart when in doubt:**
   ```bash
   rm -rf .next && npm run dev
   ```

3. **Use proper null handling:**
   ```typescript
   // Good
   value: value || undefined
   
   // Bad
   value: value || null
   ```

4. **Check TypeScript errors before running:**
   ```bash
   npx tsc --noEmit
   ```

## Getting Help

If issues persist:

1. Check browser console for specific errors
2. Check terminal for server errors
3. Verify database connection
4. Check Prisma schema is valid: `npx prisma validate`
5. Review this troubleshooting guide

## Contact

For additional help, refer to:
- `BOOKING_SYSTEM_FINAL_SUMMARY.md` - Complete implementation guide
- `BOOKING_QUICK_START.md` - Quick start guide
- Cal.com API Docs: https://cal.com/docs/api-reference
