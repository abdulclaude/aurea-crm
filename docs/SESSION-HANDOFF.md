# Session Handoff — 2026-05-16

## What Was Done This Session

### 1. UK-based placeholder text (onboarding)
- `src/app/onboarding/studio/page.tsx` — all form placeholders updated to UK examples (London address, +44 phone, Europe/London timezone, .co.uk email/website, SW1A postcode).

### 2. Unauthorized runtime error — FIXED
- `src/features/smart-sections/server/smart-sections-router.ts:310` — changed `throw new Error("Unauthorized")` → `throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" })`
- `src/features/forms-builder/server/forms-router.ts:335,386` — same fix (two places)
- Both files now import `TRPCError` from `@trpc/server`

### 3. Studio location as primary navigation
- **`src/features/organizations/server/routers.ts`** — `createAgency` now auto-creates a default `Subaccount` (location) alongside the org. Returns `{ organizationId, defaultLocationId }`.
- **`src/app/onboarding/studio/page.tsx`** — after creating agency, calls `setActiveSubaccount({ subaccountId: defaultLocationId })` so users land in a location context immediately.
- **`src/features/organizations/components/account-switcher.tsx`** — Added "All locations" option at the top of the Switch location submenu (no subaccountId = aggregate view). Removed the old "Back to X's workspace" button.

### 4. Studio dashboard with real widgets
- **New router**: `src/features/studio/server/studio-dashboard-router.ts` — registered as `studioDashboard` in `_app.ts`
  - `summaryStats` — active memberships, today's classes, today's check-ins, monthly visits (+ % change vs prior 30 days)
  - `visitsOverTime` — day-by-day check-in count for last 30 days
  - `membershipsOverTime` — day-by-day new membership count for last 30 days
  - `upcomingOccupancy` — next 10 scheduled classes with occupancy %
  - `membershipsByPlan` — active memberships grouped by plan type
  - `recentActivity` — last 10 events (bookings, check-ins, memberships)
  - `todaySchedule` — all classes today with booked/checked-in counts

- **New dashboard page**: `src/app/(dashboard)/(rest)/dashboard/page.tsx` (replaced the stub)
  - 4 KPI cards with trend indicators (active memberships, classes today, check-ins today, monthly visits)
  - Visits over time (Recharts LineChart)
  - New memberships over time (Recharts BarChart)
  - Memberships by plan (horizontal progress bars with colour coding per plan type)
  - Class occupancy (next 10 classes with occupancy % colour coding)
  - Recent activity feed (bookings/check-ins/memberships with relative timestamps)
  - Today's schedule grid (class cards with status/capacity/instructor)

### 5. Launchpad (setup guide)
- **Layout**: `src/app/(dashboard)/(rest)/launchpad/layout.tsx` — settings-style left sidebar navigation with sections: Studio setup, Team, Memberships, Schedule
- **Page**: `src/app/(dashboard)/(rest)/launchpad/page.tsx` — setup checklist with:
  - Progress bar showing completion %
  - Step cards (Studio profile, Rooms, Class types, Instructors, Membership plans, First class)
  - Each card checks real data (trpc queries) to determine if complete
  - Celebration state when all steps are done
- Added "Launchpad" item with Rocket icon to sidebar's General section

### 6. Floating AI assistant (ported from profitabledge)
- **Provider account boundary**: AI provider keys are encrypted credentials at the exact active organization/location scope; there is no deployment-key fallback.
- **API route**: `src/app/api/ai/chat/route.ts` — POST endpoint using the active account's Gemini credential.
  - Authenticated (rejects unauthenticated requests)
  - Studio-aware system prompt (uses the server-resolved active location)
  - Uses `convertToModelMessages` from AI SDK v5 for message conversion
  - Returns `result.toTextStreamResponse()`
- **Zustand store**: `src/stores/floating-assistant.ts` — `isOpen`, `open(query?)`, `close()`, `toggle()`; persisted to localStorage
- **Component**: `src/components/ai/floating-assistant.tsx`
  - `<FloatingAssistant>` — slide-in panel from bottom-right with backdrop. Uses AI SDK v5 `useChat` + `DefaultChatTransport`. Shows suggested prompts when empty, streaming responses, clear conversation button.
  - `<FloatingAssistantTrigger>` — indigo floating button (bottom-right) that shows when panel is closed
- **Added to layout**: `src/components/dashboard-layout-wrapper.tsx` — both components mounted at dashboard root level

## TypeScript Error Baseline
- Before this session: 43 pre-existing errors
- After two sessions: **0 TypeScript errors** — all errors resolved

## All Errors Fixed (second session)
Schema migration `20260515231343_add_contact_fitness_fields_and_event_type_settings`:
- Added `contraindications String?` and `trustedMember Boolean @default(false)` to `Contact`
- Added `requiresConfirmation Boolean @default(false)` and `lastSyncedAt DateTime?` to `BookingEventType`

TypeScript fixes:
- `bookings-router.ts` — added `reason: z.string().optional()` to update input
- `create-booking-dialog.tsx` — `durationOptions` → `availableDurations`, `duration` → `length`
- `event-types-table.tsx` — `eventType.duration` → `eventType.length`
- `booking-detail-sheet.tsx` — Decimal value wrapped in `Number()`
- `bookings-table.tsx` — moved `<BookingsToolbar />` outside `<DataTable>` (DataTable expects config object, not component)
- `calcom-credentials-router.ts` — typed userData with explicit cast, `locationType` now uses `BookingLocationType` enum
- `credentials.tsx` — added `CAL_COM` to credentialLogos map
- `contacts-router.ts` — added `id: crypto.randomUUID()` to contactAssignee create entries
- `campaigns/routers.ts` — `Object.keys(changes ?? {})`
- `members-table.tsx` — removed circular `memberColumnIds` from useCallback deps (used before declaration)
- `event-types-router.ts` — removed `requiresConfirmation` from Cal.com API call, `duration` → `length`, removed non-schema fields (`availableLocations`, `bufferTime`, `maxBookingsPerDay` from create; `minimumNotice` → `minimumBookingNotice`)
- `inngest/functions.ts` — `event.data as Record<string, unknown>` to access `workflowId`
- `tsconfig.json` — excluded `**/__tests__/**` (no test runner installed)

## Next Session — Phase 2: Payments & Business Operations
Key tasks:
1. Stripe billing for membership plans (checkout sessions, webhooks)
2. Class pack / drop-in purchase flow
3. Gift cards and promo codes
4. POS (point-of-sale) for front-desk sales
5. Instructor payroll calculations

## Environment Setup Notes
- Configure the active account's AI provider credential through the CRM before using the assistant.
- The dashboard uses `date-fns` (already installed) and `recharts` (already installed)
- The floating assistant uses `@ai-sdk/react` and `ai` (both already installed, v5)
