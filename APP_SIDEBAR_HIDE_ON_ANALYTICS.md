# App Sidebar Auto-Hide on Analytics Pages

**Date:** December 29, 2025  
**Change:** Hide main app-sidebar when analytics sidebar is active  
**Status:** COMPLETE ✅

---

## The Problem

When navigating to analytics pages (`/funnels/[id]/analytics`), both sidebars were visible:
- ❌ Main app-sidebar on the left
- ❌ Analytics sidebar also on the left
- ❌ Confusing UX with two navigation menus
- ❌ Wasted screen space

---

## The Solution

### Auto-hide app-sidebar on analytics pages

When user navigates to any analytics page, the main app sidebar automatically hides, leaving only the analytics sidebar visible.

---

## Implementation

### 1. Created Wrapper Component

**File:** `src/components/dashboard-layout-wrapper.tsx`

```tsx
"use client";

import AppSidebar from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide app sidebar when on analytics pages (they have their own sidebar)
  const isAnalyticsPage = pathname.includes("/analytics");

  return (
    <SidebarProvider open={!isAnalyticsPage}>
      {!isAnalyticsPage && <AppSidebar />}
      <SidebarInset className="bg-accent/20 overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Logic:**
1. Checks if pathname includes `/analytics`
2. If yes: `open={false}` and don't render `<AppSidebar />`
3. If no: `open={true}` (default) and render `<AppSidebar />`

### 2. Updated Dashboard Layout

**File:** `src/app/(dashboard)/layout.tsx`

```tsx
import { DashboardLayoutWrapper } from "@/components/dashboard-layout-wrapper";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // ... auth checks ...

  return (
    <DashboardLayoutWrapper>
      {children}
    </DashboardLayoutWrapper>
  );
};
```

**Changes:**
- Replaced `SidebarProvider` + `AppSidebar` with `DashboardLayoutWrapper`
- Keeps server component for auth checks
- Client-side pathname detection in wrapper

---

## How It Works

### User Flow

#### On Regular Pages (e.g., `/dashboard`, `/workflows`, `/contacts`)
```
User navigates to /dashboard
  ↓
DashboardLayoutWrapper checks pathname
  ↓
pathname.includes("/analytics") = false
  ↓
SidebarProvider open={true}
AppSidebar renders ✅
Main content renders
```

#### On Analytics Pages (e.g., `/funnels/123/analytics/sessions`)
```
User navigates to /funnels/123/analytics/sessions
  ↓
DashboardLayoutWrapper checks pathname
  ↓
pathname.includes("/analytics") = true
  ↓
SidebarProvider open={false}
AppSidebar DOES NOT render ❌
Main content renders with AnalyticsSidebar only
```

---

## Behavior Details

### SidebarProvider Props
- `open={!isAnalyticsPage}` - Controls sidebar open/close state
- When `false`, sidebar is closed and takes minimal space
- When `true`, sidebar is open (default behavior)

### Conditional Rendering
- `{!isAnalyticsPage && <AppSidebar />}` - Only renders when NOT on analytics
- Saves React rendering when sidebar isn't needed
- Cleaner DOM structure

---

## Benefits

### 1. **Clean UX**
- ✅ Only one sidebar visible at a time
- ✅ No confusion about which navigation to use
- ✅ More screen space for analytics content

### 2. **Automatic**
- ✅ No manual toggle needed
- ✅ Works for all analytics pages
- ✅ URL-based detection (reliable)

### 3. **Flexible**
- ✅ Easy to extend to other nested sidebar pages
- ✅ Can check for multiple patterns (e.g., `/builder`, `/reports`)
- ✅ Pattern: `pathname.includes("/pattern")`

### 4. **Performance**
- ✅ Doesn't render AppSidebar when not needed
- ✅ Uses client-side pathname detection
- ✅ No extra API calls or state management

---

## Extending to Other Pages

If you add more pages with custom sidebars, update the condition:

```tsx
const hasCustomSidebar = 
  pathname.includes("/analytics") || 
  pathname.includes("/builder") ||
  pathname.includes("/reports");

return (
  <SidebarProvider open={!hasCustomSidebar}>
    {!hasCustomSidebar && <AppSidebar />}
    {/* ... */}
  </SidebarProvider>
);
```

---

## File Changes

### Modified (1 file)
1. `src/app/(dashboard)/layout.tsx` - Uses wrapper component

### Created (1 file)
1. `src/components/dashboard-layout-wrapper.tsx` - Pathname-based sidebar control

---

## Testing

### Test Cases

1. **Regular Pages**
   - Navigate to `/dashboard`
   - App sidebar should be visible ✅
   - Navigate to `/workflows`
   - App sidebar should be visible ✅

2. **Analytics Pages**
   - Navigate to `/funnels/[id]/analytics`
   - App sidebar should be hidden ❌
   - Analytics sidebar should be visible ✅
   - Navigate to `/funnels/[id]/analytics/sessions`
   - App sidebar should be hidden ❌
   - Analytics sidebar should be visible ✅

3. **Navigation Flow**
   - Start on `/dashboard` (app sidebar visible)
   - Navigate to `/funnels/[id]/analytics` (app sidebar hides)
   - Navigate back to `/dashboard` (app sidebar shows again)
   - Smooth transitions ✅

---

## Visual Result

### Before (Two Sidebars)
```
┌─────────────┬─────────────┬────────────────────┐
│             │             │                    │
│ App Sidebar │ Analytics   │  Main Content      │
│             │ Sidebar     │                    │
│             │             │                    │
└─────────────┴─────────────┴────────────────────┘
     ❌            ❌              ✅
```

### After (One Sidebar)
```
┌─────────────┬────────────────────────────────┐
│             │                                │
│ Analytics   │  Main Content                  │
│ Sidebar     │  (More space!)                 │
│             │                                │
└─────────────┴────────────────────────────────┘
     ✅                    ✅
```

---

## Implementation Pattern

This pattern can be reused for any page with a custom sidebar:

1. Create a custom sidebar for your feature
2. Add feature-specific layout with SidebarProvider
3. Update `DashboardLayoutWrapper` to detect your route
4. App sidebar auto-hides when user navigates to your feature

---

## Status: READY TO TEST

When you start the dev server and navigate to analytics:
- ✅ Main app sidebar will automatically hide
- ✅ Only analytics sidebar will be visible
- ✅ More screen space for analytics content
- ✅ Cleaner, professional UX

**Start dev server:**
```bash
npm run dev
```

Then navigate between regular pages and analytics to see the automatic sidebar switching! 🎉
