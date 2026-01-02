# Visitor Profile 404 Fix - Complete

## Issues Fixed

1. **404 Error on Visitor Profile Page**
2. **Next.js 15+ Params as Promise**
3. **tRPC Mutation Context Error**

---

## Fix #1: Created Missing Route

**Problem:** `/analytics/funnels/[funnelId]/visitors/[anonymousId]` returned 404

**Solution:** Created proper route structure

**Files Created:**
```
src/app/(dashboard)/funnels/[funnelId]/analytics/visitors/[anonymousId]/
├── page.tsx                      ← Server component (awaits params)
└── visitor-profile-wrapper.tsx   ← Client component wrapper
```

**File Modified:**
- `src/features/external-funnels/components/visitor-profiles.tsx` - Fixed navigation link

---

## Fix #2: Next.js 15+ Params Pattern

**Problem:** Params were undefined because Next.js 15+ changed the API

**Before (Wrong):**
```typescript
interface PageProps {
  params: {
    funnelId: string;
    anonymousId: string;
  };
}

export default function Page({ params }: PageProps) {
  return <Component funnelId={params.funnelId} />; // ❌ params is Promise!
}
```

**After (Correct):**
```typescript
interface PageProps {
  params: Promise<{
    funnelId: string;
    anonymousId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { funnelId, anonymousId } = await params; // ✅ Await the promise
  return <Wrapper funnelId={funnelId} anonymousId={anonymousId} />;
}
```

---

## Fix #3: tRPC Mutation Context Error

**Problem:** `contextMap[utilName] is not a function`

**Root Cause:** Using `useTRPC()` with `.useMutation()` doesn't work in tRPC v11+

**Before (Wrong):**
```typescript
import { useTRPC } from "@/trpc/client";

const trpc = useTRPC();
const mutation = trpc.externalFunnels.exportVisitorData.useMutation({
  // ❌ useMutation() not available on tRPC context
});
```

**After (Correct):**
```typescript
import { useTRPCClient } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

const trpcClient = useTRPCClient();
const mutation = useMutation({
  mutationFn: async (input: { funnelId: string; anonymousId: string }) =>
    trpcClient.externalFunnels.exportVisitorData.mutate(input),
  // ✅ Use React Query's useMutation() with tRPC client
  onSuccess: (data) => { ... },
  onError: (error) => { ... },
});
```

---

## File Structure

```
src/app/(dashboard)/funnels/[funnelId]/analytics/
├── page.tsx                                    ← Main analytics page
└── visitors/[anonymousId]/
    ├── page.tsx                                ← Server component
    └── visitor-profile-wrapper.tsx             ← Client wrapper

src/features/external-funnels/components/
├── visitor-profiles.tsx                        ← List of visitors
├── visitor-profile-detail.tsx                  ← Profile detail (client)
├── visitor-gdpr-settings.tsx                   ← GDPR controls (client)
└── visitor-journey-timeline.tsx                ← Timeline (client)
```

---

## Component Hierarchy

```
Server: page.tsx (awaits params)
  ↓
Client: visitor-profile-wrapper.tsx
  ↓
Client: VisitorProfileDetail (uses tRPC queries)
  ↓
Client: VisitorGDPRSettings (uses tRPC mutations)
```

---

## Testing

```bash
# Start dev server
cd ~/Desktop/aurea-crm
npm dev

# Browser
1. Navigate to External Funnels → Visitors
2. Click "View" on any visitor
3. Should navigate to: /funnels/[id]/analytics/visitors/[anonymousId]
4. ✅ Page loads successfully
5. ✅ Profile data displays
6. ✅ GDPR export/delete buttons work
```

---

## Key Learnings

### 1. **Next.js 15+ Breaking Change**
Params are now async. Always await them in page components.

### 2. **tRPC v11+ Pattern**
- Queries: Use `useTRPC()` with `.useQuery()` or `useSuspenseQuery()`
- Mutations: Use `useTRPCClient()` + React Query's `useMutation()`

### 3. **Server/Client Boundary**
- Page.tsx = Server component (can await params)
- Wrapper = Client component (boundary for hooks)
- Children = Client components (can use hooks)

---

## If Errors Persist

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm dev
   ```

2. **Hard refresh browser:**
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear site data in DevTools

3. **Restart dev server:**
   ```bash
   # Kill all Node processes
   killall node
   npm dev
   ```

---

**All visitor profile issues are now fixed!** 🎉
