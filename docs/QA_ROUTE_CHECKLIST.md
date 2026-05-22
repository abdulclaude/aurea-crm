# Aurea CRM User-Visitable Route QA Walkthrough

Generated from `src/app/**/page.tsx` on 2026-05-17. This document intentionally covers routes a user can visit in the browser, not API route handlers or layout-only files.

Use this as a guided QA script. Start with `/dashboard`, run the practical demo-data population action, then work through each section in order. For dynamic routes such as `[workflowId]`, open the parent list route first and use a real record ID, then manually test one invalid ID afterward.

Coverage: 139 visitable page route files.

Important route collision to verify during build/runtime QA: more than one page resolves to `/`:
- `src/app/(public)/page.tsx`
- `src/app/page.tsx`

---

## 1. Auth, Onboarding, and Entry

These routes handle sign-up, login, invitations, onboarding, and the root entry point. Test them first to establish a valid session.

### `/login`

Source: `src/app/(auth)/login/page.tsx`

Test it thoroughly:
- Submit empty, invalid, and valid credentials.
- Verify inline validation and auth errors are understandable.
- Confirm successful login redirects into the active organization/subaccount.
- Check OAuth buttons and password visibility/reset links if shown.

### `/sign-up`

Source: `src/app/(auth)/sign-up/page.tsx`

Test it thoroughly:
- Submit required fields one by one to confirm validation.
- Complete sign-up and verify user/session/org initialization.
- Confirm duplicate email and weak password behavior.
- Check the post-sign-up redirect into onboarding or dashboard.

### `/invitation/[id]`

Source: `src/app/(auth)/invitation/[id]/page.tsx`

Before testing: Create a valid invite from `/invites`; also test a fake or expired invite ID.

Test it thoroughly:
- Open a valid invitation while signed out and signed in.
- Accept as a new user and as an existing user.
- Confirm org/subaccount membership, role, and active workspace after acceptance.
- Open invalid/expired invites and verify safe messaging.

### `/onboarding/studio`

Source: `src/app/onboarding/studio/page.tsx`

### `/onboarding/preview`

Source: `src/app/onboarding/preview/page.tsx`

Before testing: Use a fresh test org/client if possible.

Test it thoroughly:
- Complete each onboarding step with minimum and full data.
- Use back/skip/preview controls and confirm data persists.
- Finish onboarding and verify created rooms, class types, instructors, memberships, and first class.
- Check direct access after onboarding is complete.

### `/` (root pages)

Source: `src/app/(public)/page.tsx` and `src/app/page.tsx`

Test it thoroughly:
- Open `/` directly signed out and signed in.
- Confirm the route either renders the intended public page or redirects intentionally.
- Verify metadata, favicon, theme, and navigation are consistent.
- Check that no dashboard-only data is exposed when signed out.
- Run a production build to confirm duplicate root pages don't collide.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 2. Dashboard Home

### `/dashboard`

Source: `src/app/(dashboard)/(rest)/dashboard/page.tsx`

Before testing: Use this route first. Run the demo-data action before testing the rest of the app.

Test it thoroughly:
- Run the practical demo-data generator and confirm the success summary.
- Verify cards/charts populate with classes, bookings, payments, contacts, workflows, and automation events.
- Use dashboard links to jump into contacts, studio classes, reports, executions, and growth pages.
- Run the generator a second time to confirm cleanup/reseed is safe.

Also verify:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 3. Contacts, Households, and Member Directory

These routes manage the unified lead/member directory and family account grouping. Test contacts first, then households.

### `/contacts`

Source: `src/app/(dashboard)/(rest)/contacts/page.tsx`

Before testing: Seed data first so contacts include birthdays, acquisition stages, tags, households, intro-offer members, churn-risk members, and active members.

Test it thoroughly:
- Switch member/lead/status filters and confirm fields change contextually.
- Search by name/email/tag and verify results stay tenant-scoped.
- Open edit actions and check birthday, acquisition stage, tags, attendance, emergency contact, and household indicators.
- Follow related links to `/contacts/new`, `/households`, `/acquisition`, `/loyalty`, `/referrals`, and `/churn`.

### `/contacts/new`

Source: `src/app/(dashboard)/(rest)/contacts/new/page.tsx`

Before testing: Create one lead and one active member with different tags and birthdays.

Test it thoroughly:
- Fill only required fields first, then add optional member fields.
- Validate birthday, tags, source, acquisition stage, waiver, emergency contact, and fitness fields.
- Save and confirm the contact appears in `/contacts`, `/acquisition`, and member-related pages when applicable.
- Try duplicate email and invalid phone/email values.

### `/households`

Source: `src/app/(dashboard)/(rest)/households/page.tsx`

Before testing: Seed data includes example households. Also create a new household manually.

Test it thoroughly:
- Create a household with primary, partner, child, dependent, and member roles.
- Edit household notes and primary contact.
- Remove and re-add a member, then confirm the contact record reflects membership.
- Check scoping by switching subaccounts if available.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 4. Member Growth and Retention

These routes are tightly related: acquisition tracks the funnel, churn monitors risk, loyalty rewards engagement, referrals drive word-of-mouth, intro offers attract new signups, and SMS enables direct outreach. Test them together since they share contact data.

### `/acquisition`

Source: `src/app/(dashboard)/(rest)/acquisition/page.tsx`

Before testing: Seed data first so every acquisition stage has example contacts.

Test it thoroughly:
- Review counts for INQUIRY, TRIAL, ACTIVE, and LOST.
- Drag contacts between stages and confirm counts update.
- Drill into lead/member contact records from the kanban cards.
- Compare source breakdown against seeded contact sources and referral/intro-offer flows.

### `/churn`

Source: `src/app/(dashboard)/(rest)/churn/page.tsx`

Before testing: Seed data includes medium, high, and critical risk scores.

Test it thoroughly:
- Review risk levels, scores, factors, and suggested actions.
- Open linked contacts and compare attendance/streak/membership data.
- Create a task or message from a churn action if supported.
- Refresh/recalculate scores if the page exposes that action.

### `/loyalty`

Source: `src/app/(dashboard)/(rest)/loyalty/page.tsx`

Before testing: Seed data includes a program, rewards, balances, tiers, and transactions.

Test it thoroughly:
- Review program settings and reward catalog.
- Check member leaderboard/balances and tier assignment.
- Award or adjust points if controls exist, then verify transaction history.
- Confirm workflow-awarded points from milestone/birthday automations appear in automation-related pages.

### `/referrals`

Source: `src/app/(dashboard)/(rest)/referrals/page.tsx`

Before testing: Seed data includes pending, signed-up, converted, and rewarded referral examples.

Test it thoroughly:
- Review reward values and max-referral settings.
- Copy or inspect referral codes.
- Confirm each referral status is represented and transitions are understandable.
- Verify converted referrals relate back to `/contacts`, `/acquisition`, and automation conversion events.

### `/intro-offers`

Source: `src/app/(dashboard)/(rest)/intro-offers/page.tsx`

Before testing: Seed data includes active, converted, and expired redemptions.

Test it thoroughly:
- Create an offer for each major offer type you plan to support.
- Edit price, duration, credit count, allowed class types, visibility, max redemptions, and follow-up plan.
- Inspect redemption counts and statuses.
- Trace converted intro-offer members into `/acquisition`, `/contacts`, `/workflows`, and `/executions`.

### `/sms`

Source: `src/app/(dashboard)/(rest)/sms/page.tsx`

Before testing: Use test phone numbers and do not assume Twilio credentials are configured.

Test it thoroughly:
- Send a single SMS to a contact and a bulk SMS to a segment/tag if available.
- Confirm queued/sent/failed states and provider error messages.
- Verify messages relate to contact records and automation executions when sent by workflow.
- Check template variables and opt-out handling if present.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 5. Studio: Schedule, Classes, Class Types, and Rooms

These routes form the core studio operations. Changes to rooms, class types, and instructors directly affect classes and the schedule. Test setup routes first (class types, rooms), then classes, then the schedule.

### `/studio/class-types`

Source: `src/app/(dashboard)/(rest)/studio/class-types/page.tsx`

Before testing: Seed data includes several class types with colors.

Test it thoroughly:
- Create/edit name, slug, color, description, and active state.
- Confirm changes appear in `/studio/classes`, `/studio/schedule`, and intro-offer allowed class filters.
- Try duplicate slugs/names if restricted.
- Deactivate a class type and verify scheduled classes handle it safely.

### `/studio/rooms`

Source: `src/app/(dashboard)/(rest)/studio/rooms/page.tsx`

Before testing: Seed data includes several rooms.

Test it thoroughly:
- Create/edit room name, capacity, and description.
- Confirm capacity appears in class scheduling and class detail.
- Try lowering capacity below existing bookings and verify app behavior.
- Deactivate/delete if supported and confirm existing classes remain safe.

### `/studio/classes`

Source: `src/app/(dashboard)/(rest)/studio/classes/page.tsx`

Before testing: Seed data includes past, current, and future classes across class types, rooms, and instructors.

Test it thoroughly:
- Filter by date/status/class type/instructor and inspect capacity.
- Create/edit/cancel a class if controls exist.
- Open `/studio/classes/[classId]` from a row.
- Confirm substitutions, bookings, waitlist, and check-ins stay in sync.

### `/studio/classes/[classId]`

Source: `src/app/(dashboard)/(rest)/studio/classes/[classId]/page.tsx`

Before testing: Open from `/studio/classes` or `/studio/schedule` using a valid class.

Test it thoroughly:
- Review roster, bookings, check-ins, capacity, room, instructor, and class type.
- Book/cancel/check-in members if available.
- Create or inspect substitution requests linked to this class.
- Try an invalid class ID and verify the not-found state.

### `/studio/schedule`

Source: `src/app/(dashboard)/(rest)/studio/schedule/page.tsx`

Before testing: Seed data creates classes for the past 30 days and next 7 days.

Test it thoroughly:
- Switch day/week/month or equivalent views.
- Book, cancel, waitlist, and open class detail from calendar items.
- Confirm timezone, capacity, instructor, room, and class type display.
- Navigate into public schedule/embed routes where relevant.

### `/studio/substitutions`

Source: `src/app/(dashboard)/(rest)/studio/substitutions/page.tsx`

Before testing: Seed data includes open, offered, and accepted substitution requests.

Test it thoroughly:
- Create a substitution request from a future class.
- Offer, accept, decline, or reassign substitutes depending on available controls.
- Verify instructor availability/specialties influence choices if implemented.
- Confirm the class detail and worker profile reflect the substitution status.

### `/studio/check-in`

Source: `src/app/(dashboard)/(rest)/studio/check-in/page.tsx`

Before testing: Use seeded bookings for today or create one from schedule/classes first.

Test it thoroughly:
- Search by member name/email and check in manually.
- Try duplicate check-in and wrong-class check-in.
- Confirm attendance count and streak update on contact/member pages.
- Verify check-in workflows and milestone automations can fire and appear in `/executions`.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 6. Studio: Memberships, POS, Gift Cards, and Add-Ons

These routes handle billing, commerce, and retail within the studio. Memberships feed into acquisition and revenue; POS uses add-ons and gift cards for payment. Test memberships first since other routes reference them.

### `/studio/memberships`

Source: `src/app/(dashboard)/(rest)/studio/memberships/page.tsx`

Before testing: Seed data includes unlimited, packs, drop-in, annual, intro, and trial plans.

Test it thoroughly:
- Create/edit each plan type and verify price, interval, credits, duration, and public visibility.
- Confirm intro-offer plans relate to `/intro-offers` and acquisition conversion.
- Check active memberships on contacts and revenue/reporting pages.
- Test deactivate/delete behavior when memberships already reference a plan.

### `/studio/pos`

Source: `src/app/(dashboard)/(rest)/studio/pos/page.tsx`

Before testing: Use seeded contacts, promo codes, add-ons, gift cards, and membership products.

Test it thoroughly:
- Build a cart with products, drop-ins, gift cards, and discounts.
- Attach a customer and process test payment/failure states.
- Confirm payments appear in revenue/reports/contact history.
- Check receipt, refund, and empty-cart behavior.

### `/studio/gift-cards`

Source: `src/app/(dashboard)/(rest)/studio/gift-cards/page.tsx`

Before testing: Use seeded contacts and create one new gift card.

Test it thoroughly:
- Issue a gift card to a contact/recipient.
- Redeem part and full balances through POS or payment flow if available.
- Confirm remaining balance, expiry, purchaser, and recipient data.
- Test invalid code, expired card, and zero-balance states.

### `/studio/add-ons`

Source: `src/app/(dashboard)/(rest)/studio/add-ons/page.tsx`

Before testing: Create at least one retail/product and one service-style add-on if the UI supports types.

Test it thoroughly:
- Create/edit price, tax/category/status, and availability.
- Attach add-ons through POS, booking, membership, or class flows where supported.
- Confirm revenue/reporting reflects add-on purchases.
- Test unavailable/deactivated add-ons in purchase flows.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 7. Studio: Import and Mindbody Migration

### `/studio/import`

Source: `src/app/(dashboard)/(rest)/studio/import/page.tsx`

Before testing: Use a small CSV with valid rows, invalid rows, duplicates, and missing optional fields.

Test it thoroughly:
- Upload, map columns, preview, and confirm import.
- Verify validation errors are row-specific and do not import bad rows silently.
- Confirm imported records appear in contacts, acquisition, memberships, and reports.
- Run the same import twice and check duplicate prevention.

### `/studio/mindbody`

Source: `src/app/(dashboard)/(rest)/studio/mindbody/page.tsx`

Before testing: Test without credentials first, then with sandbox/test credentials if available.

Test it thoroughly:
- Open sync/setup screens and verify missing-credential messaging.
- Run import/sync actions only against test data.
- Confirm duplicates are handled and mapped fields land in contacts/classes/memberships.
- Check logs/status indicators after failures and retries.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 8. Launchpad (Guided Studio Setup)

The launchpad is a guided wizard for initial studio setup. Its child routes mirror setup for class types, rooms, instructors, memberships, and first class. Test the parent first, then each step in order.

### `/launchpad`

Source: `src/app/(dashboard)/(rest)/launchpad/page.tsx`

### `/launchpad/class-types`

Source: `src/app/(dashboard)/(rest)/launchpad/class-types/page.tsx`

### `/launchpad/rooms`

Source: `src/app/(dashboard)/(rest)/launchpad/rooms/page.tsx`

### `/launchpad/instructors`

Source: `src/app/(dashboard)/(rest)/launchpad/instructors/page.tsx`

### `/launchpad/memberships`

Source: `src/app/(dashboard)/(rest)/launchpad/memberships/page.tsx`

### `/launchpad/first-class`

Source: `src/app/(dashboard)/(rest)/launchpad/first-class/page.tsx`

Test it thoroughly (all launchpad routes):
- Open the parent and each child step in order.
- Run the main create/edit/view action available on each page.
- Confirm saved changes appear immediately and still appear after refresh.
- Verify data created here appears in the corresponding `/studio/*` routes.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 9. Staff, Workers, and Workforce Management

These routes manage instructors/workers, their schedules, time tracking, payroll, requests, and bookings. Workers feed into class assignments, substitutions, payroll, and the worker portal. Test workers first, then time logs, then payroll.

### `/workers`

Source: `src/app/(dashboard)/(rest)/workers/page.tsx`

Before testing: Seed data includes instructors with specialties/certifications.

Test it thoroughly:
- Create/edit worker details, roles, specialties, availability, and active state.
- Open worker detail and verify schedule, classes, time logs, earnings, and documents.
- Confirm substitutions and payroll reference the same worker data.
- Test invalid worker ID and lower-permission access.

### `/workers/[workerId]`

Source: `src/app/(dashboard)/(rest)/workers/[workerId]/page.tsx`

### `/time-logs`

Source: `src/app/(dashboard)/(rest)/time-logs/page.tsx`

Before testing: Use seeded workers and create fresh clock-in/out examples.

Test it thoroughly:
- Clock in/out, add breaks if supported, and prevent duplicate open shifts.
- Review logs in list and timesheet views by worker/pay period.
- Approve/edit/correct time logs and verify totals.
- Confirm payroll page uses the same approved totals.

### `/time-logs/clock-in`

Source: `src/app/(dashboard)/(rest)/time-logs/clock-in/page.tsx`

### `/time-logs/timesheet`

Source: `src/app/(dashboard)/(rest)/time-logs/timesheet/page.tsx`

### `/rotas`

Source: `src/app/(dashboard)/(rest)/rotas/page.tsx`

Before testing: Use seeded workers/instructors.

Test it thoroughly:
- Create shifts, assign workers, drag or resize shifts if supported.
- Check conflicts, overlapping shifts, and role/availability constraints.
- Publish or approve schedules if supported.
- Verify worker portal schedule reflects changes.

### `/payroll`

Source: `src/app/(dashboard)/(rest)/payroll/page.tsx`

Before testing: Use seeded classes, time logs, workers, and payment data.

Test it thoroughly:
- Review pay period totals and per-worker earnings.
- Approve/export/run payout if safe in test mode.
- Check missing Stripe Connect/bank setup warnings.
- Compare values with time logs and worker earnings portal.

### `/requests`

Source: `src/app/(dashboard)/(rest)/requests/page.tsx`

Before testing: Create time-off, swap, substitution, or generic requests depending on enabled modules.

Test it thoroughly:
- Submit a request from related routes or worker portal.
- Approve, decline, comment, and filter by status.
- Confirm related rota/class/time-log records update.
- Check notification behavior and permission restrictions.

### `/bookings`

Source: `src/app/(dashboard)/(rest)/bookings/page.tsx`

Before testing: Seed data includes booking event types and sample appointments.

Test it thoroughly:
- Create/edit event types with duration/location/payment requirements.
- Create, reschedule, complete, and cancel appointments.
- Open related contact records and confirm appointment history.
- Test scheduling conflicts, invalid attendee fields, and public booking links if available.

### `/bookings/event-types`

Source: `src/app/(dashboard)/(rest)/bookings/event-types/page.tsx`

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 10. CRM: Deals, Pipelines, Tasks, and Inbox

These routes handle sales pipeline management, task follow-ups, and multi-channel conversations. Pipelines define the stages; deals move through them; tasks track follow-up work; inbox centralizes messages.

### `/pipelines`

Source: `src/app/(dashboard)/(rest)/pipelines/page.tsx`

Before testing: Use seeded Studio Sales pipeline and create one test pipeline.

Test it thoroughly:
- Create stages with colors/probabilities and mark default if supported.
- Drag or move deals across stages from the board.
- Edit stage order/names and confirm existing deals remain valid.
- Test delete/archive behavior with and without deals in the pipeline.

### `/pipelines/[pipelineId]`

Source: `src/app/(dashboard)/(rest)/pipelines/[pipelineId]/page.tsx`

### `/pipelines/[pipelineId]/edit`

Source: `src/app/(dashboard)/(rest)/pipelines/[pipelineId]/edit/page.tsx`

### `/pipelines/new`

Source: `src/app/(dashboard)/(rest)/pipelines/new/page.tsx`

### `/deals`

Source: `src/app/(dashboard)/(rest)/deals/page.tsx`

Before testing: Seed data first so deals and contacts exist, then create one new deal manually.

Test it thoroughly:
- Create a deal with value, stage, contacts, tags, and notes.
- Move deals between stages and confirm pipeline totals update.
- Open detail pages to edit fields, add notes/tasks, and link/unlink contacts.
- Verify invalid deal IDs and missing pipeline/stage references.

### `/deals/[dealId]`

Source: `src/app/(dashboard)/(rest)/deals/[dealId]/page.tsx`

### `/deals/new`

Source: `src/app/(dashboard)/(rest)/deals/new/page.tsx`

### `/tasks`

Source: `src/app/(dashboard)/(rest)/tasks/page.tsx`

Before testing: Seed data includes open, in-progress, and completed tasks tied to contacts.

Test it thoroughly:
- Create, edit, complete, reopen, and delete/archive tasks if supported.
- Filter by status/priority/due date/assignee.
- Open linked contact/deal from a task.
- Confirm overdue and completed dates display correctly.

### `/inbox`

Source: `src/app/(dashboard)/(rest)/inbox/page.tsx`

Before testing: Seed data includes email, SMS, and app conversations.

Test it thoroughly:
- Open each seeded conversation and verify message order.
- Filter by channel/read status and search contacts.
- Send a reply if available and confirm read/unread state.
- Jump to contact context from the conversation.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 11. Workflows, Executions, and Bundles

These routes manage the visual workflow editor, execution history, and workflow bundles. Test workflows first to create executions, then verify execution detail.

### `/workflows`

Source: `src/app/(dashboard)/(rest)/workflows/page.tsx`

Before testing: Seed data creates demo workflows, and starter templates include birthday, intro, milestone, renewal, and no-show flows.

Test it thoroughly:
- Create a workflow from each studio starter template.
- Search, archive, unarchive, duplicate, and open workflows.
- Confirm workflow rows link to `/workflows/[workflowId]` editor and `/executions` history.
- Verify templates do not include removed gamification nodes.

### `/workflows/[workflowId]`

Source: `src/app/(dashboard)/(editor)/workflows/[workflowId]/page.tsx`

Before testing: Open from `/workflows` using a seeded or newly created workflow.

Test it thoroughly:
- Add, configure, move, and connect nodes.
- Specifically test birthday trigger, member tags, class milestone, intro-offer completion, SMS, loyalty points, churn score, and contact update nodes.
- Save, refresh, and confirm nodes/connections persist.
- Run or trigger a test execution and inspect it in `/executions/[executionId]`.

### `/executions`

Source: `src/app/(dashboard)/(rest)/executions/page.tsx`

Before testing: Seed data includes completed demo executions and persisted automation events.

Test it thoroughly:
- Filter by status/workflow/date and open recent executions.
- Review automation insights and conversion/event table.
- Confirm membership signups, lead conversions, intro redemptions, birthday events, class milestones, and no-shows are visible.
- Use links back to workflows and execution details.

### `/executions/[executionId]`

Source: `src/app/(dashboard)/(rest)/executions/[executionId]/page.tsx`

Before testing: Open from `/executions` so the ID is valid, then test an invalid ID manually.

Test it thoroughly:
- Inspect node-by-node timeline, started/completed status, output, errors, and context.
- Confirm automation events connect to the same execution.
- Use back navigation to return to filtered execution list.
- Check failed execution rendering by forcing or finding a failed example.

### `/bundles`

Source: `src/app/(dashboard)/(rest)/bundles/page.tsx`

### `/bundles/[bundleId]`

Source: `src/app/(dashboard)/(editor)/bundles/[bundleId]/page.tsx`

Test it thoroughly (bundles):
- Open the route directly and through the sidebar or parent route.
- Run the main create, edit, view, filter, or status-change action available on the page.
- Confirm saved changes appear immediately and still appear after refresh.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 12. Campaigns and Email Marketing

These routes handle email/SMS campaign planning, content, sending domains, templates, and per-campaign analytics.

### `/campaigns`

Source: `src/app/(dashboard)/(rest)/campaigns/page.tsx`

Before testing: Use seeded contacts/tags and create at least one draft campaign.

Test it thoroughly:
- Navigate from campaign list into create, templates, domains, and detail pages.
- Validate audience selection, subject/content, scheduling, sending test messages, and draft save.
- Check delivery/open/click metrics where present.
- Confirm domain/template changes are available when composing campaigns.

### `/campaigns/new`

Source: `src/app/(dashboard)/(rest)/campaigns/new/page.tsx`

### `/campaigns/[id]`

Source: `src/app/(dashboard)/(rest)/campaigns/[id]/page.tsx`

### `/campaigns/templates`

Source: `src/app/(dashboard)/(rest)/campaigns/templates/page.tsx`

### `/campaigns/domains`

Source: `src/app/(dashboard)/(rest)/campaigns/domains/page.tsx`

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 13. Funnels, Builder, and Landing Pages

These routes handle funnel creation, editing, publishing, form building, library templates, and funnel analytics.

### `/funnels`

Source: `src/app/(dashboard)/(rest)/funnels/page.tsx`

Before testing: Create at least one draft and one published funnel.

Test it thoroughly:
- Create, clone, archive/unarchive, and open funnels.
- Open the editor, change content, preview, publish, and test a form conversion.
- Use analytics links to verify captured visits/events/conversions.
- Check domain/path collisions and invalid funnel IDs.

### `/funnels/[funnelId]/editor`

Source: `src/app/(dashboard)/(rest)/funnels/[funnelId]/editor/page.tsx`

### Funnel Analytics

All funnel analytics routes share the same test approach. Open from the analytics tab navigation and by direct URL. Change date filters and confirm the active tab keeps the same funnel context.

Source routes:
- `/funnels/[funnelId]/analytics` — `src/app/(dashboard)/funnels/[funnelId]/analytics/page.tsx`
- `/funnels/[funnelId]/analytics/ads` — `src/app/(dashboard)/funnels/[funnelId]/analytics/ads/page.tsx`
- `/funnels/[funnelId]/analytics/devices` — `src/app/(dashboard)/funnels/[funnelId]/analytics/devices/page.tsx`
- `/funnels/[funnelId]/analytics/events` — `src/app/(dashboard)/funnels/[funnelId]/analytics/events/page.tsx`
- `/funnels/[funnelId]/analytics/funnel` — `src/app/(dashboard)/funnels/[funnelId]/analytics/funnel/page.tsx`
- `/funnels/[funnelId]/analytics/geography` — `src/app/(dashboard)/funnels/[funnelId]/analytics/geography/page.tsx`
- `/funnels/[funnelId]/analytics/performance` — `src/app/(dashboard)/funnels/[funnelId]/analytics/performance/page.tsx`
- `/funnels/[funnelId]/analytics/realtime` — `src/app/(dashboard)/funnels/[funnelId]/analytics/realtime/page.tsx`
- `/funnels/[funnelId]/analytics/sessions` — `src/app/(dashboard)/funnels/[funnelId]/analytics/sessions/page.tsx`
- `/funnels/[funnelId]/analytics/sources` — `src/app/(dashboard)/funnels/[funnelId]/analytics/sources/page.tsx`
- `/funnels/[funnelId]/analytics/utm` — `src/app/(dashboard)/funnels/[funnelId]/analytics/utm/page.tsx`
- `/funnels/[funnelId]/analytics/visitors` — `src/app/(dashboard)/funnels/[funnelId]/analytics/visitors/page.tsx`
- `/funnels/[funnelId]/analytics/visitors/[anonymousId]` — `src/app/(dashboard)/funnels/[funnelId]/analytics/visitors/[anonymousId]/page.tsx`
- `/funnels/[funnelId]/analytics/web-vitals` — `src/app/(dashboard)/funnels/[funnelId]/analytics/web-vitals/page.tsx`

Test it thoroughly (analytics tabs):
- Compare each view against sibling analytics tabs for the same funnel.
- Test invalid funnel ID behavior and no-data states.
- Verify date filters persist across tab switches.

### Builder: Forms

### `/builder/forms`

Source: `src/app/(dashboard)/(rest)/builder/forms/page.tsx`

Before testing: Create a test form, publish or preview it, and submit it once.

Test it thoroughly:
- Move from `/builder/forms` to editor and submissions.
- Add/edit required fields, validation rules, styling, and save/publish state.
- Submit a form and confirm it appears under submissions and optionally creates/links a contact.
- Test invalid form ID and empty submissions.

### `/builder/forms/[id]/editor`

Source: `src/app/(dashboard)/(rest)/builder/forms/[id]/editor/page.tsx`

### `/builder/forms/[id]/submissions`

Source: `src/app/(dashboard)/(rest)/builder/forms/[id]/submissions/page.tsx`

### Builder: Library

### `/builder/library`

Source: `src/app/(dashboard)/(rest)/builder/library/page.tsx`

Before testing: Use existing library content or create/import a library item first if required.

Test it thoroughly:
- Browse/search/filter library items.
- Open a library detail page and inspect preview/metadata.
- Duplicate or insert a library item into a form/funnel where available.
- Verify unavailable/invalid item IDs produce a clean not-found state.

### `/builder/library/[id]`

Source: `src/app/(dashboard)/(rest)/builder/library/[id]/page.tsx`

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 14. Analytics, Reports, and Revenue

### `/analytics`

Source: `src/app/(dashboard)/(rest)/analytics/page.tsx`

Before testing: Seed data first. For funnel analytics, use `/funnels/[funnelId]/analytics` routes.

Test it thoroughly:
- Change date ranges and inspect cards/charts.
- Confirm empty state when no data exists for a narrow range.
- Compare high-level numbers with dashboard/reports.
- Check chart rendering on mobile and desktop.

### `/reports`

Source: `src/app/(dashboard)/(rest)/reports/page.tsx`

Before testing: Seed data includes 60 days of payments, memberships, bookings, and check-ins.

Test it thoroughly:
- Review revenue trend, attendance, membership trend, and forecast sections.
- Change date ranges and compare totals to cards/tables.
- Check chart tooltip formatting and empty-state behavior.
- Follow related analytics/revenue pages for deeper checks.

### `/revenue`

Source: `src/app/(dashboard)/(rest)/revenue/page.tsx`

Before testing: Seed data includes succeeded, failed, and refunded payments.

Test it thoroughly:
- Check totals, refunds/failures, by-plan/by-category breakdowns, and date filters.
- Compare with `/reports` forecast and dashboard revenue cards.
- Open linked contacts/memberships if available.
- Confirm currency formatting is consistent.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 15. Invoices and Billing

### `/invoices`

Source: `src/app/(dashboard)/(rest)/invoices/page.tsx`

Before testing: Seed data includes paid, sent, draft, and bank-transfer related invoices.

Test it thoroughly:
- Create/send/pay/void invoices and verify totals/amount due.
- Create templates and recurring invoices, then apply them to new invoices.
- Open public view/pay routes from invoice links and test invalid IDs.
- Check Stripe/bank transfer missing-config and paid-invoice lockout states.

### `/invoices/recurring`

Source: `src/app/(dashboard)/(rest)/invoices/recurring/page.tsx`

### `/invoices/templates`

Source: `src/app/(dashboard)/(rest)/invoices/templates/page.tsx`

### `/invoices/view/[invoiceId]` (public)

Source: `src/app/(public)/invoices/view/[invoiceId]/page.tsx`

### `/invoices/pay/[invoiceId]` (public)

Source: `src/app/(public)/invoices/pay/[invoiceId]/page.tsx`

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 16. Agency, Clients, and Multi-Tenant Administration

### `/clients`

Source: `src/app/(dashboard)/(rest)/clients/page.tsx`

Before testing: Use an agency/admin account with org permissions.

Test it thoroughly:
- Create a new client/subaccount and switch into it.
- Check client list search/status and workspace metadata.
- Verify tenant isolation by comparing contacts/workflows across clients.
- Test lower-permission user access.

### `/clients/new`

Source: `src/app/(dashboard)/(rest)/clients/new/page.tsx`

### `/invites`

Source: `src/app/(dashboard)/(rest)/invites/page.tsx`

Before testing: Use an email address that is not already in the workspace.

Test it thoroughly:
- Create invites with each role you support.
- Resend and cancel pending invites.
- Open invite link through `/invitation/[id]` and accept it.
- Verify membership/role and active workspace after acceptance.

### `/notifications`

Source: `src/app/(dashboard)/(rest)/notifications/page.tsx`

Before testing: Generate notifications through requests, invites, substitutions, or workflow actions if supported.

Test it thoroughly:
- Read/unread notifications and refresh.
- Click notification links and confirm they navigate to the source record.
- Verify realtime updates through the notification stream.
- Check empty state and lower-permission visibility.

### `/waivers`

Source: `src/app/(dashboard)/(rest)/waivers/page.tsx`

Before testing: Create at least one waiver and assign it to a seeded contact.

Test it thoroughly:
- Create/edit/publish waiver content.
- Assign waiver and verify signed/unsigned filters.
- Complete public/member signing flow if available.
- Confirm contact/member profile reflects signed status.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 17. Credentials and Webhooks

### `/credentials/new`

Source: `src/app/(dashboard)/(rest)/credentials/new/page.tsx`

### `/credentials/[credentialId]`

Source: `src/app/(dashboard)/(rest)/credentials/[credentialId]/page.tsx`

Before testing: Use test keys only.

Test it thoroughly:
- Create a credential with type/name/value and workspace scope.
- Open/edit credential and confirm secret masking/encryption behavior.
- Use the credential from a workflow node where applicable.
- Delete or rotate credentials and verify dependent workflows handle it.

### `/webhooks/new`

Source: `src/app/(dashboard)/(rest)/webhooks/new/page.tsx`

### `/webhooks/[webhookId]`

Source: `src/app/(dashboard)/(rest)/webhooks/[webhookId]/page.tsx`

Before testing: Create a test webhook and keep the generated signing secret available.

Test it thoroughly:
- Create/edit webhook name/provider/URL/secret.
- Open detail page, inspect delivery logs or metadata if present.
- Rotate secret and verify old signatures fail where supported.
- Delete/archive and confirm related workflows do not silently break.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 18. Settings

All settings routes share the same base test approach: open directly and through the settings sidebar, change a safe setting, save, refresh, confirm persistence, and verify validation for required fields and permission failures. Test with an admin/owner account first, then a lower-permission user if roles are available.

### General Settings

- `/settings/workspace` — `src/app/(dashboard)/settings/workspace/page.tsx`
- `/settings/profile` — `src/app/(dashboard)/settings/profile/page.tsx`
- `/settings/branding` — `src/app/(dashboard)/settings/branding/page.tsx`
- `/settings/styles` — `src/app/(dashboard)/(rest)/settings/styles/page.tsx`
- `/settings/members` — `src/app/(dashboard)/settings/members/page.tsx`
- `/settings/modules` — `src/app/(dashboard)/settings/modules/page.tsx`
- `/settings/notifications` — `src/app/(dashboard)/settings/notifications/page.tsx`

### Billing and Payments Settings

- `/settings/billing` — `src/app/(dashboard)/settings/billing/page.tsx`
- `/settings/payments` — `src/app/(dashboard)/settings/payments/page.tsx`
- `/settings/bank-transfer` — `src/app/(dashboard)/settings/bank-transfer/page.tsx`
- `/settings/studio-billing` — `src/app/(dashboard)/settings/studio-billing/page.tsx`
- `/settings/dunning` — `src/app/(dashboard)/settings/dunning/page.tsx`
- `/settings/instructor-payouts` — `src/app/(dashboard)/settings/instructor-payouts/page.tsx`

### Developer and Integration Settings

- `/settings/developer` — `src/app/(dashboard)/settings/developer/page.tsx`
- `/settings/credentials` — `src/app/(dashboard)/settings/credentials/page.tsx`
- `/settings/webhooks` — `src/app/(dashboard)/settings/webhooks/page.tsx`
- `/settings/apps` — `src/app/(dashboard)/settings/apps/page.tsx`
- `/settings/widgets` — `src/app/(dashboard)/settings/widgets/page.tsx`
- `/settings/integrations/calcom` — `src/app/(dashboard)/settings/integrations/calcom/page.tsx`

### Booking Settings

- `/settings/bookings/calendar` — `src/app/(dashboard)/settings/bookings/calendar/page.tsx`

Also verify for all settings routes:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 19. Worker Portal

All worker portal routes share the same test approach: authenticate through the portal auth route, then verify each section reflects admin-side data.

Source routes:
- `/portal/[workerId]/auth` — `src/app/portal/[workerId]/auth/page.tsx`
- `/portal/[workerId]/dashboard` — `src/app/portal/[workerId]/dashboard/page.tsx`
- `/portal/[workerId]/schedule` — `src/app/portal/[workerId]/schedule/page.tsx`
- `/portal/[workerId]/profile` — `src/app/portal/[workerId]/profile/page.tsx`
- `/portal/[workerId]/documents` — `src/app/portal/[workerId]/documents/page.tsx`
- `/portal/[workerId]/earnings` — `src/app/portal/[workerId]/earnings/page.tsx`
- `/portal/[workerId]/requests` — `src/app/portal/[workerId]/requests/page.tsx`
- `/portal/[workerId]/time-logs` — `src/app/portal/[workerId]/time-logs/page.tsx`

Before testing: Open a valid worker from `/workers` and use its portal/auth path.

Test it thoroughly:
- Authenticate or enter through the worker portal auth route.
- Check dashboard, schedule, profile, documents, earnings, requests, and time logs.
- Make a change in dashboard admin routes and confirm the portal reflects it.
- Test invalid worker ID, expired token, and mobile layout.

Also verify:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.

---

## 20. Public, Embed, and Member Portal Routes

### `/[slug]`

Source: `src/app/(public)/[slug]/page.tsx`

Before testing: Create or publish a funnel/page from builder routes first.

Test it thoroughly:
- Open preview and published public URLs.
- Submit forms and verify submissions/contacts/analytics events.
- Check unpublished/unknown slug behavior.
- Confirm preview does not count as a production conversion unless intended.

### `/f/[funnelId]/[slug]`

Source: `src/app/(public)/f/[funnelId]/[slug]/page.tsx`

### `/preview/f/[funnelId]/[slug]`

Source: `src/app/(preview)/preview/f/[funnelId]/[slug]/page.tsx`

### `/schedule/[slug]`

Source: `src/app/(public)/schedule/[slug]/page.tsx`

### `/embed/schedule`

Source: `src/app/embed/schedule/page.tsx`

Before testing: Use a public studio slug and seeded future classes.

Test it thoroughly:
- Open full public schedule and embedded schedule at iframe-like widths.
- Filter classes, inspect capacity, and start a booking/waitlist flow.
- Confirm intro offers and public booking routes connect cleanly.
- Test invalid slug, fully booked class, and mobile layout.

### `/member-portal/[token]`

Source: `src/app/member-portal/[token]/page.tsx`

Before testing: Generate or locate a valid member portal token from a contact/member.

Test it thoroughly:
- Open valid, expired, and invalid tokens.
- Review profile, bookings, memberships, payments, and documents where available.
- Make a dashboard-side change and verify portal reflects it.
- Check mobile layout and logged-out privacy.

### `/unsubscribe`

Source: `src/app/(public)/unsubscribe/page.tsx`

Before testing: Use a valid unsubscribe token/link from a campaign recipient if available and one invalid token.

Test it thoroughly:
- Open token/email validation flow.
- Confirm unsubscribe and repeat the same link.
- Verify contact email-unsubscribed state in dashboard.
- Check privacy-safe errors for invalid tokens/emails.

Also verify for all routes in this section:
- Watch browser console and network requests for errors while loading and interacting.
- Refresh the route directly, then navigate away and back using the app navigation.
- Test loading, empty, populated, permission-denied, and invalid-parameter states where the route supports them.
- Check mobile width and a desktop width. Important controls should stay visible and text should not overlap.
