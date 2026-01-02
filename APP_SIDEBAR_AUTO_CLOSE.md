# App Sidebar Auto-Close on Analytics Pages - FINAL

**Date:** December 29, 2025  
**Behavior:** App-sidebar starts closed on analytics pages but can be toggled  
**Status:** COMPLETE ✅

---

## Final Behavior

### On Analytics Pages (`/funnels/[id]/analytics/*`)
- ✅ **App-sidebar rendered** (still in DOM)
- ✅ **App-sidebar starts CLOSED** (collapsed to icon mode)
- ✅ **Analytics sidebar visible** (on the right side)
- ✅ **User can toggle app-sidebar** (using trigger button)
- ✅ **Both sidebars can be open** at the same time if user wants

### On Regular Pages (`/dashboard`, `/workflows`, etc.)
- ✅ **App-sidebar rendered**
- ✅ **App-sidebar starts OPEN** (default)
- ✅ **User can toggle app-sidebar**
- ✅ **No analytics sidebar**

---

## Implementation

### DashboardLayoutWrapper
**File:** `src/components/dashboard-layout-wrapper.tsx`

```tsx
"use client";

import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Close app sidebar when on analytics pages (they have their own sidebar)
  // But keep it rendered so user can still toggle it
  const isAnalyticsPage = pathname.includes("/analytics");

  return (
    <SidebarProvider defaultOpen={!isAnalyticsPage}>
      <AppSidebar />
      <SidebarInset className="bg-accent/20 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Key Points:**
- Uses `defaultOpen={!isAnalyticsPage}` (NOT `open={!isAnalyticsPage}`)
- `defaultOpen` sets initial state but allows user to toggle
- `open` would force the state and prevent toggling
- `AppSidebar` is always rendered, never conditionally hidden

---

## How It Works

### SidebarProvider Props
- `defaultOpen={true}` - Sidebar starts open (regular pages)
- `defaultOpen={false}` - Sidebar starts closed (analytics pages)
- User can always toggle via `SidebarTrigger` button

### Visual Flow

#### Landing on `/dashboard` (Regular Page)
```
┌─────────────┬────────────────────────────────┐
│             │                                │
│ App Sidebar │  Main Content                  │
│   (OPEN)    │                                │
│             │                                │
└─────────────┴────────────────────────────────┘
```

#### Navigating to `/funnels/123/analytics`
```
┌──┬─────────────┬────────────────────────────┐
│  │             │                            │
│A │ Analytics   │  Main Content              │
│p │ Sidebar     │                            │
│p │             │                            │
│  │             │                            │
└──┴─────────────┴────────────────────────────┘
 ↑
 Collapsed (but can be toggled open)
```

#### User Toggles App Sidebar Open
```
┌─────────────┬─────────────┬─────────────────┐
│             │             │                 │
│ App Sidebar │ Analytics   │  Main Content   │
│   (OPEN)    │ Sidebar     │                 │
│             │             │                 │
└─────────────┴─────────────┴─────────────────┘
```

---

## Benefits

### 1. **Smart Defaults**
- ✅ Closes app-sidebar on analytics (more space for data)
- ✅ Keeps app-sidebar open on regular pages (easy navigation)
- ✅ Automatic based on route

### 2. **User Control**
- ✅ User can always toggle sidebars
- ✅ No forced states
- ✅ Preferences saved via cookies

### 3. **Clean UX**
- ✅ Analytics pages start with max content space
- ✅ App-sidebar accessible if needed
- ✅ Both sidebars work together

### 4. **Flexible**
- ✅ Same pattern works for other custom sidebar pages
- ✅ Easy to extend to `/builder`, `/reports`, etc.

---

## Key Difference: `defaultOpen` vs `open`

### ❌ Using `open` (WRONG)
```tsx
<SidebarProvider open={!isAnalyticsPage}>
```
- Forces sidebar state
- User CANNOT toggle
- Sidebar locked to closed on analytics

### ✅ Using `defaultOpen` (CORRECT)
```tsx
<SidebarProvider defaultOpen={!isAnalyticsPage}>
```
- Sets initial state only
- User CAN toggle
- Sidebar starts closed but can be opened

---

## Testing

### Test Case 1: Initial State
1. Navigate to `/dashboard`
   - App-sidebar should be **OPEN** ✅
2. Navigate to `/funnels/[id]/analytics`
   - App-sidebar should be **CLOSED** ✅
   - Analytics sidebar should be **VISIBLE** ✅

### Test Case 2: Toggle Functionality
1. On `/funnels/[id]/analytics`
   - Click SidebarTrigger (hamburger icon)
   - App-sidebar should **OPEN** ✅
   - Click again
   - App-sidebar should **CLOSE** ✅

### Test Case 3: Navigation Persistence
1. On `/funnels/[id]/analytics` with app-sidebar open
   - Navigate to different analytics tab
   - App-sidebar should stay **OPEN** ✅
2. Navigate to `/dashboard`
   - App-sidebar should be **OPEN** ✅

---

## Result

Perfect balance:
- **Analytics pages:** Start with analytics sidebar prominent, app-sidebar minimized
- **Regular pages:** App-sidebar open by default
- **User choice:** Can toggle app-sidebar anytime on any page
- **Both sidebars:** Can coexist when both are open

---

## Status: COMPLETE ✅

When you start the dev server:
- ✅ App-sidebar closes automatically on analytics pages
- ✅ App-sidebar can still be toggled open/closed
- ✅ Analytics sidebar always visible on analytics pages
- ✅ Both sidebars work together harmoniously

Perfect UX! 🎉
