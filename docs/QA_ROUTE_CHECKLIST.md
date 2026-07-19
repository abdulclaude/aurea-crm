# Aurea Wellness Studio Manual Route Test Plan

Current as of 2026-07-18. This is the canonical, onboarding-first manual QA
guide for the current worktree. It covers all 167 `page.tsx` files, the 166
unique page URL patterns they resolve to, all 44 API route patterns, and all 85
report variants behind the dynamic report route.

Run this in order. The sequence deliberately creates each prerequisite before
testing the route that consumes it.

## Safety first

Use a disposable local or staging database and a brand-new organization. Do
not run this walkthrough in a real or shared customer tenant.

> **Only use `Populate demo data` in a dedicated demo organization.** The
> current operation never deletes or overwrites existing records, requires
> `demo.manage`, exact confirmation, an empty location, and no organization-wide
> loyalty/referral configuration. Provider fixtures are disconnected and all
> delivery or execution fixtures are terminal or inert. There is deliberately
> no bulk cleanup action for immutable finance and audit records.

There is currently no organization/location deletion UI. A disposable database
is the only clean one-step teardown. When using a persistent test database,
prefix every record with the run label and expect to remove records
individually.

Third-party test rules:

- Use Stripe test mode and a disposable Express account only.
- Use a Resend sandbox/test domain and inboxes you own.
- Use sandbox SMS numbers, a test Cal.com account, test Google/Microsoft
  accounts, and a test Telegram bot.
- Select the exact QA organization and location before connecting an account.
- Verify the UI shows the account's organization/location ownership.
- Never treat an environment key, platform Stripe key, or webhook secret as
  tenant authorization. Every operation must retain and revalidate the internal
  provider-account binding.
- Do not send campaigns, messages, refunds, payouts, or live checkouts merely
  for route coverage.

## Test run worksheet

Use a fresh suffix for every run. The examples below use `QA-20260714-A`.

| Fixture              | Value to create                                                           | Actual ID, slug, token, or URL |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| Organization         | `QA-20260714-A Wellness`                                                  |                                |
| Primary location     | `QA-20260714-A London`                                                    |                                |
| Scope-check location | `QA-20260714-A Manchester`                                                |                                |
| Rooms                | `QA-A Main Studio` capacity 2; `QA-A Treatment Room` capacity 1           |                                |
| Class types          | `QA-A Reformer Fundamentals`; `QA-A Restorative Yoga`                     |                                |
| Service types        | One group class; one private appointment                                  |                                |
| Instructors          | `QA-A Alex Instructor`; `QA-A Sam Cover`                                  |                                |
| Pricing              | Drop-in, five-class pack, monthly membership, intro offer                 |                                |
| Products             | `QA-A Grip Socks`; `QA-A Yoga Mat`                                        |                                |
| Clients              | Alice Active, Ben Trial, Cara Churn, Dana Parent, Eli Child, Finn Walk-in |                                |
| Classes              | Past/check-in, today/capacity 2, future/full, recurring series            |                                |
| CRM                  | Pipeline `QA-A Studio Leads`; four deals; one client task                 |                                |
| Marketing            | Audience, template, and draft campaign prefixed `QA-A`                    |                                |
| Builder              | Trial form and schedule publication prefixed `QA-A`                      |                                |
| Automation           | Draft workflow `QA-A Trial Follow-up`                                     |                                |

Use owned email aliases where delivery is deliberately tested. Otherwise use
`example.invalid` addresses and clearly fake phone numbers that cannot reach a
person.

## Pass criteria for every page

For every route below:

1. Reach it from its owning parent/navigation flow, then refresh it directly.
2. Check loading, empty, populated, validation/error, and invalid-ID states.
3. Check desktop at 1440x900 and mobile at 390x844 with no horizontal overflow,
   overlap, clipped controls, or inaccessible actions.
4. Use keyboard navigation for the primary action, dialogs, menus, and forms.
5. Watch browser console and failed network requests while interacting.
6. Verify back/forward navigation and a hard refresh preserve safe state.
7. Repeat sensitive routes as owner/admin and as a lower-permission user.
8. Switch between the London and Manchester QA locations and prove records do
   not leak or silently inherit when they should be exact-location resources.
9. After a mutation, confirm the resulting record, audit/operations entry, and
   dependent page rather than trusting only a success toast.

## Stage 1: Authentication and first workspace

### 1.1 Entry and authentication

| Done  | Route                | How to test                                                                                                                                              | Expected result                                                                                        |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| - [ ] | `/`                  | Open signed out and signed in on the base host.                                                                                                          | Signed-out users get the login/sign-up gateway; signed-in users follow the authenticated entry policy. |
| - [ ] | `/sign-up`           | Test empty, malformed, weak-password, duplicate-email, and valid registration.                                                                           | Clear field errors; one user/session; safe redirect into onboarding.                                   |
| - [ ] | `/login`             | Test invalid and valid credentials, Google auth cancellation, refresh, and a protected callback URL.                                                     | No account enumeration; session persists; same-origin deep link is restored.                           |
| - [ ] | `/onboarding/studio` | Choose **Start from scratch**. Test back navigation, required fields, studio profile, first-location contact/address/country/timezone, then finish once. | Exactly one organization and first location are created and selected.                                  |
| - [ ] | `/location/new`      | Create Manchester after London, switch between them, then refresh.                                                                                       | New location becomes selectable; each active-location view is isolated.                                |
| - [ ] | `/invitation/[id]`   | Later, create an invite at `/invites`; test valid, expired, fake, signed-in, and signed-out acceptance.                                                  | Membership and role are correct; invalid tokens fail without leaking org data.                         |

The root URL is also claimed by `src/app/page.tsx` and
`src/app/(public)/page.tsx`. The second source is tested with custom-host public
pages in Stage 11; both source files must remain covered.

### 1.2 Dashboard and launchpad unlock order

| Done  | Route                    | How to test                                                                                                                                                                                                                                                         | Expected result                                                                                                                               |
| ----- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/dashboard`             | Load the empty dashboard. Use demo population only in a dedicated disposable organization. Confirm a fresh active run cannot be recovered, while a run interrupted for more than 30 minutes requires the exact displayed recovery phrase. Check every quick action. | Empty state is useful, metrics do not fabricate values, and recovery closes only the stuck run without deleting records or calling providers. |
| - [ ] | `/launchpad`             | Record initial completion, then return after every following step.                                                                                                                                                                                                  | Completion reflects database postconditions, not button clicks.                                                                               |
| - [ ] | `/launchpad/rooms`       | Create the two worksheet rooms; reject blank name, zero/negative capacity, and duplicates if disallowed.                                                                                                                                                            | Rooms appear in launchpad and `/studio/rooms`.                                                                                                |
| - [ ] | `/launchpad/class-types` | Create the two worksheet class types and distinct colors.                                                                                                                                                                                                           | Class types appear in launchpad and `/studio/class-types`.                                                                                    |
| - [ ] | `/launchpad/instructors` | Create Alex and Sam with owned/fake aliases as appropriate.                                                                                                                                                                                                         | Instructor records are location-scoped and selectable by classes.                                                                             |
| - [ ] | `/launchpad/memberships` | Create a monthly test plan without initiating payment.                                                                                                                                                                                                              | Plan appears in launchpad and membership/pricing selectors.                                                                                   |
| - [ ] | `/launchpad/first-class` | Confirm it is locked before prerequisites; then create the first class.                                                                                                                                                                                             | Unlock requires room, class type, and instructor; the class appears on schedules.                                                             |

Known navigation check: the current dashboard quick actions contain three URLs
that do not have page routes: `/studio/bookings/new`, `/studio/payments/new`,
and `/marketing/campaigns/new`. Record these as navigation defects rather than
mistaking them for pages omitted from this route inventory.

## Stage 2: Workspace, brand, permissions, and integrations

### 2.1 Workspace and design settings

| Done  | Route                         | How to test                                                                                                                                                                                                                                                                                                                                                            | Expected result                                                                                                                                                                                                                                                                                                                     |
| ----- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/settings`                   | Open the settings index as an administrator and a lower-permission user; follow every category link and return with browser back.                                                                                                                                                                                                                                      | The index exposes every authorized settings surface once, omits inaccessible actions, and has no dead links.                                                                                                                                                                                                                        |
| - [ ] | `/settings/profile`           | Update only the disposable user's display/profile settings, cancel once, then save.                                                                                                                                                                                                                                                                                    | Cancel is inert; saved profile persists across refresh.                                                                                                                                                                                                                                                                             |
| - [ ] | `/settings/notifications`     | Toggle each preference, reload, and generate one harmless notification later.                                                                                                                                                                                                                                                                                          | Preferences persist and affect the correct user only.                                                                                                                                                                                                                                                                               |
| - [ ] | `/settings/workspace`         | Review organization/location names, timezone, currency, contact fields, and role restrictions.                                                                                                                                                                                                                                                                         | Settings change only the intended scope and display clear inheritance.                                                                                                                                                                                                                                                              |
| - [ ] | `/settings/modules`           | Enable the studio modules needed by this run, then test a reduced module set.                                                                                                                                                                                                                                                                                          | Navigation and capabilities change predictably without losing data.                                                                                                                                                                                                                                                                 |
| - [ ] | `/settings/branding`          | Save QA logo/name assets, then inspect public pages later. Use no sensitive upload.                                                                                                                                                                                                                                                                                    | Brand is versioned/scoped and appears on the intended public surfaces.                                                                                                                                                                                                                                                              |
| - [ ] | `/settings/styles`            | Change a few QA theme tokens, preview, cancel, save, and restore.                                                                                                                                                                                                                                                                                                      | Preview and published styling agree without copying another product's style.                                                                                                                                                                                                                                                        |
| - [ ] | `/settings/publication`       | Review targets, domain health, version, pause, consent, rollback, and drift states.                                                                                                                                                                                                                                                                                    | Unpublished targets stay private; invalid targets cannot publish.                                                                                                                                                                                                                                                                   |
| - [ ] | `/settings/widgets`           | Create schedule, instructor, membership, appointment, intro-offer, event, public-free video, and referral widgets; select exact-scope sources, configure one exact website origin, publish, copy each code, then change a source and confirm the stale state.                                                                                                          | Only exact-location sources appear; private instructor/provider/payment/referral fields never enter snapshots; appointment choices come only from the connected location Cal.com account; events stay discovery-only; on-demand only exposes published public zero-cost media; source drift hides embed controls until republished. |
| - [ ] | `/settings/bookings/calendar` | Configure timezone, booking window, capacity/waitlist policies, and reload.                                                                                                                                                                                                                                                                                            | Later schedule/public booking behavior matches these settings.                                                                                                                                                                                                                                                                      |
| - [ ] | `/settings/bookings/policies` | Configure scheduling, cancellation, waitlist, and guest-booking defaults; test organization inheritance and a materially different location override.                                                                                                                                                                                                                  | Versioned policies resolve field by field for the active scope and drive booking behavior without changing historical bookings.                                                                                                                                                                                                      |
| - [ ] | `/settings/customers`         | Exercise profile fields, tags, note templates, and household tabs; create, reorder, archive, and cancel disposable definitions where supported.                                                                                                                                                                                                                         | Definitions are scoped, validated, permission-gated, and remain consistent in client forms and household behavior.                                                                                                                                                                                                                  |
| - [ ] | `/settings/content`           | Exercise terminology, FAQ, message macro, and public profile tabs; create, preview, version, publish, roll back, archive, and search disposable content.                                                                                                                                                                                                                | Content is exact-scope, payload-validated, permission-gated, and published reads remain pinned to the selected immutable version.                                                                                                                                                                                                    |
| - [ ] | `/settings/staff`             | Exercise operations and compensation tabs as permitted; test availability, clock/break defaults, compensation templates, assignments, inheritance, and cancel/save.                                                                                                                                                                                                    | Operations and compensation permissions remain separate; versions are scoped and do not rewrite historical pay records.                                                                                                                                                                                                            |
| - [ ] | `/settings/communications` | Open directly and confirm the compatibility redirect. | The route redirects to `/settings/communications/email` without losing workspace scope. |
| - [ ] | `/settings/communications/email` | Exercise primary and secondary tabs; add a disposable Resend domain, inspect every returned DNS record, manage sender addresses, save two materially different designs, and queue only provider-safe test scenarios. | Domain records remain exact-scope and copyable; sender tables expose search, filters, sorting, and columns; design affects rendered mail; tests use the selected verified sender and durable delivery path. |
| - [ ] | `/settings/communications/sms` | Inspect number selection, compliance, spend controls, disabled states, and provider readiness without sending live traffic. | SMS shows its scoped provider binding and truthful readiness without exposing credentials or message content. |
| - [ ] | `/settings/communications/voice` | Inspect calling numbers, forwarding, recording policy, limits, disabled states, and provider readiness without placing a live call. | Voice shows scoped provider state and blocks unready or non-compliant operations. |
| - [ ] | `/settings/communications/inbox` | Inspect inbound routes and default ownership; exercise search and non-mutating controls. | Routes and ownership remain exact-scope and do not expose mailbox credentials. |
| - [ ] | `/settings/communications/rules` | Search and inspect transactional and reminder rule versions without publishing disposable content. | Rules remain versioned, scoped, and channel-valid. |
| - [ ] | `/settings/communications/suppressions` | Search and inspect suppressed destinations, reasons, source, and scope. | Suppressions prevent ineligible delivery without leaking protected message content. |
| - [ ] | `/settings/communications/blocklist` | Search and inspect blocked inbound senders and domains. | Matching inbound traffic is ignored in the active scope and existing history remains intact. |
| - [ ] | `/settings/communications/usage` | Inspect email, SMS, and voice usage totals, date boundaries, and provider reconciliation state. | Usage is scoped, currency-safe, and reconciled to provider-backed operations. |
| - [ ] | `/settings/commerce`          | Open directly and confirm the compatibility redirect, then use each commerce tab.                                                                                                                                                                                                                                                                                     | The route redirects to `/settings/commerce/tax` without losing workspace scope.                                                                                                                                                                                                                                                      |
| - [ ] | `/settings/commerce/[section]` | Test `tax`, `revenue`, `payments`, `documents`, and `guest-passes`, plus an invalid section; use disposable definitions and cancel before saving once.                                                                                                                                                                                                                   | Valid sections persist exact scoped definitions, invalid sections return not found, and configuration never implies provider execution.                                                                                                                                                                                             |
| - [ ] | `/settings/cancellations`     | Create a default test policy and a class-specific override; confirm archived policies disappear from assignment; apply confirmed single and bulk no-show/late-cancel outcomes; inspect fee pagination; test missing-card, failed/retry, successful Stripe test collection, webhook replay, and waiver; repeat as attendance-only and viewer roles and at mobile width. | The confirmation names affected members and previews fees, credits, and automatic collection; policies and fees stay in the active location; destination account/application fee and ledger agree; duplicate outcomes/webhooks have one effect; denied roles cannot act; waived allocations restore once.                           |

### 2.2 Provider and payment control plane

Test every page empty first. Connect only disposable sandbox accounts. Return to
the operations pages after later flows create receipts.

| Done  | Route                            | How to test                                                                                                                               | Expected result                                                                                      |
| ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| - [ ] | `/settings/payments`             | Start/cancel Stripe test Express onboarding and verify capability/health states.                                                          | Only test-mode Express accounts are accepted; no manual-transfer configuration.                      |
| - [ ] | `/settings/payments/operations`  | Initially verify empty state; later inspect checkout/refund/reconciliation receipts and failures.                                         | Operations retain internal Stripe account, organization, location, exact money, and idempotency.     |
| - [ ] | `/settings/payments/recovery`    | Filter active/all cases by target, owner, status, and search; inspect history; then retry, resend, reassign, and cancel only synthetic cases. | Queue totals, case history, and operator actions remain exact-location scoped and fully auditable.   |
| - [ ] | `/settings/studio-billing`       | Configure test billing/tax/application-fee policy without charging.                                                                       | Money remains decimal/minor-unit safe; Stripe account requirement is explicit.                       |
| - [ ] | `/settings/bank-transfer`        | Add a clearly labelled offline test method, disable it, and inspect checkout visibility.                                                  | Only active methods in the correct scope are offered.                                                |
| - [ ] | `/settings/dunning`              | Configure harmless invoice, membership, and booking policies; test location inheritance, validation, save a new version, and do not send. | Immutable versions persist; inheritance is explicit and no retroactive live collection starts.       |
| - [ ] | `/settings/instructor-payouts`   | Configure test pay rules after instructors exist.                                                                                         | Rules are effective-dated/scoped and do not imply a completed payout.                                |
| - [ ] | `/settings/apps`                 | Inspect available integrations and their connect/disconnect/health states.                                                                | Apps cannot borrow another location's account or a global credential.                                |
| - [ ] | `/settings/integrations`         | Configure test marketplace, access, marketing, meeting, and fitness accounts; validate, pause, reconnect, disconnect, then remove.         | Exact-scope accounts only; inherited accounts are read-only; secrets are redacted; local validation never reports remote health. |
| - [ ] | `/settings/integrations/calcom`  | Connect a test Cal.com account, inspect sync/webhook health, then disconnect after testing.                                               | Account and webhook are bound to the exact org/location credential.                                  |
| - [ ] | `/settings/credentials`          | Create test-only workflow credentials; test type validation, redaction, defaults, and wrong-location access.                              | Encrypted values are never readable; ambiguous defaults fail closed.                                 |
| - [ ] | `/settings/webhooks`             | Review outbound webhook inventory and health before using create/detail routes later.                                                     | No secret is exposed and scope is visible.                                                           |
| - [ ] | `/settings/developer`            | Create separate read-only and write-test API keys for the active location, copy once, test scopes later, then revoke.                     | Secret is one-time; keys are exact-location scoped and unbound legacy keys fail closed.               |
| - [ ] | `/settings/messaging/operations` | Inspect empty state now and delivery/inbound receipts after Stage 8.                                                                      | Queue, provider receipt, retries, suppression, and failure state are distinct.                       |

## Stage 3: Studio catalogue and scheduling foundation

### 3.1 Catalogue and class configuration

| Done  | Route                       | How to test                                                                                                                                                                                                        | Expected result                                                                                                                                        |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [ ] | `/studio/rooms`             | Edit the launchpad rooms, test capacity validation, active/inactive state, and dependent-class visibility.                                                                                                         | Existing classes remain coherent and scope is exact.                                                                                                   |
| - [ ] | `/studio/class-types`       | Edit colors/names, deactivate one, and inspect dependent class selectors.                                                                                                                                          | Historical classes retain identity; inactive options are not offered for new work.                                                                     |
| - [ ] | `/studio/service-types`     | Create group and appointment services, filter/search, and inspect empty/deactivated states.                                                                                                                        | Services expose clear schedule, duration, capacity, and pricing relationships.                                                                         |
| - [ ] | `/studio/service-types/new` | Test required fields, duration/capacity bounds, room/staff relationships, cancel, and save.                                                                                                                        | One scoped service appears in the list and dependent selectors.                                                                                        |
| - [ ] | `/studio/service-types/[serviceTypeId]/edit` | Open from the service list, edit one field, cancel, then save; test a fake and another-location ID.                                                                                                  | Existing values load exactly, cancel is inert, save updates only the scoped service, and inaccessible IDs fail safely.                                  |
| - [ ] | `/studio/classes/new`       | Create today, future-full, and past fixture classes with controlled capacity.                                                                                                                                      | Times honor location timezone; staff/room conflicts and invalid ranges fail.                                                                           |
| - [ ] | `/studio/classes`           | Search/filter/sort, open records, and compare list counts with schedule.                                                                                                                                           | No duplicate classes; filters and counts agree.                                                                                                        |
| - [ ] | `/studio/classes/[classId]` | Open from list, test responsive roster/table scrolling, class policy reassignment, booking, waitlist, cancel, check-in, and confirmed no-show/late-cancel for one and multiple members; refresh and try a fake ID. | Capacity and attendance remain consistent; financial outcomes require explicit impact confirmation; active policy changes persist; invalid ID is safe. |
| - [ ] | `/studio/class-series`      | Create a short recurring series, alter one occurrence, and inspect future/all behavior.                                                                                                                            | Recurrence creates bounded occurrences and exceptions do not corrupt the series.                                                                       |
| - [ ] | `/studio/schedule`          | Test day/week navigation, filters, class opening, timezone, empty day, and location switch.                                                                                                                        | Schedule agrees with class list and never mixes locations.                                                                                             |
| - [ ] | `/studio/check-in`          | Check in Alice, mark one no-show/late cancel if supported, then revisit class detail.                                                                                                                              | Attendance status changes once and is reflected everywhere.                                                                                            |
| - [ ] | `/studio/substitutions`     | Offer the future class to Sam, test accept/decline/expiry, and inspect assignments.                                                                                                                                | Only eligible scoped staff can act; class ownership updates once.                                                                                      |

### 3.2 Imports, tested last within setup

| Done  | Route              | How to test                                                                                                 | Expected result                                                                          |
| ----- | ------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| - [ ] | `/studio/import`   | Upload a disposable, non-sensitive fixture; test mapping, validation, duplicate preview, cancel, and retry. | Nothing commits before confirmation; counts/errors are explicit.                         |
| - [ ] | `/studio/mindbody` | Use a disposable sandbox/export only; test connection/import preview and failure recovery.                  | Import is scoped, idempotent where promised, and never requires a production credential. |

Do not upload real client or instructor documents during manual route QA. The
current UploadThing middleware identifies callers as `public` rather than an
authenticated tenant identity, so sensitive uploads are a release blocker until
that boundary is corrected.

## Stage 4: Clients, households, waivers, and CRM

| Done  | Route                          | How to test                                                                                                                    | Expected result                                                               |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| - [ ] | `/clients/new`                 | Create the six worksheet clients with varied lifecycle/status/source; test duplicate email, malformed phone/email, and cancel. | One record per intended client, normalized identity, correct active location. |
| - [ ] | `/clients`                     | Search/filter/sort/select, open the client detail surface, edit, assign, tag, save audience, and inspect timeline.             | List, detail, audience, payments, bookings, inbox, and timeline agree.        |
| - [ ] | `/clients/[clientId]`          | Open a real client from the list, exercise each profile tab and action, refresh, then try a fake and another-location ID.       | The profile remains exact-scope, related data agrees with owning pages, and inaccessible IDs reveal nothing. |
| - [ ] | `/members/[memberId]`          | Open the same profile through a member link and compare it with the canonical client URL.                                      | Both routes enforce the same tenant permissions and show one underlying member record. |
| - [ ] | `/households/new`              | Create Dana/Eli household, choose primary and relationship roles, then cancel a second attempt.                                | One household with valid primary and no cross-location members.               |
| - [ ] | `/households`                  | Search, edit notes/roles, remove and re-add Eli, then inspect client records.                                                  | Both sides of the relationship stay consistent.                               |
| - [ ] | `/waivers`                     | Create/assign a disposable waiver, inspect unsigned/signed/expired states without forging a signature.                         | Status and version are auditable and linked to the right client.              |
| - [ ] | `/pipelines/new`               | Create `QA-A Studio Leads` with meaningful stages and validation errors.                                                       | Pipeline is scoped and stages have stable order/IDs.                          |
| - [ ] | `/pipelines`                   | Filter/list/create entry points and location isolation.                                                                        | Pipeline counts and empty states are correct.                                 |
| - [ ] | `/pipelines/[pipelineId]`      | Open from list, move deals across stages, reload, and use a fake ID.                                                           | Stage transitions persist once and deal counts agree.                         |
| - [ ] | `/pipelines/[pipelineId]/edit` | Rename/reorder safe stages and test deletion protection for stages in use.                                                     | Existing deals remain attached or a clear migration choice is required.       |
| - [ ] | `/deals/new`                   | Create new, qualified, won, and lost test deals linked to clients.                                                             | Required pipeline/stage/client ownership is validated.                        |
| - [ ] | `/deals`                       | Search/filter/sort, change stage, assign members, and compare pipeline counts.                                                 | List and pipeline views stay consistent.                                      |
| - [ ] | `/deals/[dealId]`              | Edit value/status/links, add activity, refresh, and test a fake ID.                                                            | Timeline and exact decimal value persist without cross-tenant access.         |

## Stage 5: Team, permissions, payroll, and instructor experience

Test with an owner/admin, manager, viewer, and invited instructor. A forbidden
action must be absent/disabled server-side as well as visually hidden.

| Done  | Route                         | How to test                                                                                                              | Expected result                                                                        |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| - [ ] | `/team`                       | Search/filter staff, inspect identity/role/location status, suspend/archive only disposable staff, and switch locations. | Canonical identity is not duplicated and inactive users lose capability.               |
| - [ ] | `/team/new`                   | Create a disposable manager/viewer or instructor record; test duplicate email and role validation.                       | User/staff/instructor linkage is explicit and scoped.                                  |
| - [ ] | `/invites`                    | Invite an owned alias with a lower role, resend/revoke only the disposable invite, and copy its URL.                     | Invite state, expiry, role, and location are clear; no plaintext bearer appears later. |
| - [ ] | `/instructors/[instructorId]` | Open Alex from team, edit profile/availability/pay settings, then test fake and other-location IDs.                      | Details persist and authorization is exact.                                            |
| - [ ] | `/instructor-signup`          | Use a valid `?token=...&id=...`, then missing/expired/fake values.                                                       | Valid setup creates the intended account once; invalid tokens reveal nothing.          |
| - [ ] | `/payroll`                    | Inspect calculated test earnings and approval/export controls without executing real payroll.                            | Values trace to classes/time/pay rules; page never claims funds moved.                 |
| - [ ] | `/time-logs`                  | Review scoped entries, filters, edits/approvals by role, and totals.                                                     | Entries and payroll totals agree.                                                      |
| - [ ] | `/time-logs/clock-in`         | Clock a disposable instructor in/out once and test double-click/reload.                                                  | One bounded session is created; duplicate clock actions are prevented.                 |
| - [ ] | `/time-logs/timesheet`        | Review daily/weekly totals and correction permissions.                                                                   | Totals match time logs and timezone boundaries.                                        |
| - [ ] | `/rotas`                      | Open directly.                                                                                                           | Compatibility route redirects to `/studio/schedule`.                                   |
| - [ ] | `/requests`                   | Open directly.                                                                                                           | Compatibility route redirects to `/studio/substitutions`.                              |
| - [ ] | `/my-schedule`                | Sign in as instructor and inspect assigned classes/location switch.                                                      | Only the instructor's permitted schedule is visible.                                   |
| - [ ] | `/my-classes`                 | Open assigned class detail/actions as instructor.                                                                        | Instructor can perform only allowed attendance/class actions.                          |
| - [ ] | `/my-earnings`                | Compare earnings with class/time/pay fixtures.                                                                           | No other instructor's earnings are exposed.                                            |

Current role expectations:

- Owner/location AGENCY or ADMIN: full platform capabilities.
- Org admin: broad management, but current commerce/reconciliation differences
  must be checked explicitly.
- Manager: operational management and exports, but no provider management,
  refunds/reconciliation, team management, settings management, or privacy
  erasure.
- STANDARD: checkout plus team/customer/schedule read.
- LIMITED: messaging view/send plus customer/schedule read.
- VIEWER: read-only domains.

## Stage 6: Pricing, commerce, invoicing, and POS

Create catalogue records first, then use Stripe test mode only. Verify every
financial action in `/settings/payments/operations` and never rely only on the
redirect or toast.

| Done  | Route                         | How to test                                                                                                                   | Expected result                                                                 |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| - [ ] | `/studio/pricing-options/new` | Create drop-in and five-class pack; test currencies, decimals, interval, credits, visibility, and cancel.                     | Exact money persists and invalid/unsupported combinations fail.                 |
| - [ ] | `/studio/pricing-options`     | Search/filter, create a monthly membership, attach access, deactivate, and inspect public eligibility/source drift.            | Recurrence and access are explicit; existing purchases remain traceable and inactive options cannot be newly sold. |
| - [ ] | `/studio/pricing-options/[pricingOptionId]` | Open each materially different pricing type, inspect access/sales/history, edit safely, and test fake or another-location IDs. | Detail, eligibility, exact price, and historical purchases agree; inaccessible IDs fail without leaking data. |
| - [ ] | `/intro-offers`               | Create one limited intro offer and test eligibility/redemption bounds.                                                        | Existing/non-eligible client rules are consistent with acquisition reports.     |
| - [ ] | `/studio/add-ons`             | Create an optional add-on and test applicability/price validation.                                                            | Add-on appears only with eligible products/services.                            |
| - [ ] | `/studio/products`            | Create socks/mat, variants, supplier, stock, tax, deactivate/reactivate.                                                      | Inventory and POS reflect the same exact quantities/prices.                     |
| - [ ] | `/studio/pos`                 | Build a disposable order, test quantity/discount/tax/client association, cancel, then complete one test/offline sale if safe. | One ledgered sale; no float drift or duplicate on retry.                        |
| - [ ] | `/studio/promo-codes`         | Create bounded percentage/fixed test promos; test dates, limits, applicability, invalid code.                                 | Discount is exact and only eligible once/as configured.                         |
| - [ ] | `/studio/gift-cards`          | Create/inspect a test gift card, redeem partially, retry, and test insufficient balance.                                      | Balance is exact, non-negative, and redemption is idempotent.                   |
| - [ ] | `/studio/account-credit`      | Grant/revoke disposable credit with reason and spend part through a test flow.                                                | Ledger balance equals operations and cannot cross clients/locations.            |
| - [ ] | `/invoices/templates`         | Create a reusable test template and preview sanitised output.                                                                 | Template/version and totals render predictably.                                 |
| - [ ] | `/invoices/recurring`         | Create then disable a disposable recurring schedule before any live send.                                                     | Schedule state is explicit; no immediate duplicate invoice/send.                |
| - [ ] | `/invoices`                   | Create/view/edit a test invoice, queue a reminder only to an owned sandbox inbox if intended, and test access grants.         | Invoice totals, status, outbox acceptance, and public tokens are distinct.      |
| - [ ] | `/revenue`                    | Compare totals with test POS/invoice/payment ledger and change date/currency filters.                                         | Revenue follows provider-backed commerce truth and exposes reconciliation gaps. |

## Stage 7: Daily member operations

| Done  | Route                    | How to test                                                                                                     | Expected result                                                  |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| - [ ] | `/tasks`                 | Create/assign/complete a client-linked task, filter by owner/status/date, and test lower-role access.           | Task appears once in client/work views and history is auditable. |
| - [ ] | `/archives`              | Archive a disposable workflow, open the archive list, search it, restore it once, and try a lower-permission user.             | Only scoped archived workflows appear and restoration preserves the workflow as an inert draft. |
| - [ ] | `/notifications`         | Generate a harmless notification, read/archive if supported, and use two tabs for realtime behavior.            | Badge/list update without refresh and remain user-scoped.        |
| - [ ] | `/member-portal/[token]` | Generate a real disposable member token, test schedule/account actions, expiry, fake token, and another client. | Token grants only its purpose/client and can expire/revoke.      |

Class booking, waitlist, cancellation, attendance, and substitution should now
be rerun end-to-end across `/studio/schedule`, `/studio/classes/[classId]`,
`/studio/check-in`, `/studio/substitutions`, and the public surfaces in Stage 11.

## Stage 8: Inbox, campaigns, and retention

Keep campaigns in draft. A real delivery is optional and must use only a
scoped sandbox provider plus controlled recipients.

| Done  | Route                  | How to test                                                                                                                           | Expected result                                                                              |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| - [ ] | `/inbox`               | Configure a scoped inbound route, create/assign/close/reopen a test conversation, queue a reply, and ingest one signed sandbox reply. | Outbound queue state is not presented as delivery; inbound receipt is idempotent and scoped. |
| - [ ] | `/sms`                 | Test empty/disabled provider state, validation, queue acceptance, suppression, and sandbox delivery only if intended.                 | No global credential fallback; exact account ID persists and is revalidated.                 |
| - [ ] | `/campaigns/templates` | Create/preview a QA template with variables and invalid/missing values.                                                               | Rendering is bounded/sanitised and does not send.                                            |
| - [ ] | `/campaigns/domains`   | Inspect sandbox domain verification and sender-profile restrictions.                                                                  | Domain health is provider/account-specific and secrets are absent.                           |
| - [ ] | `/campaigns/new`       | Choose a saved audience, configure content/settings, inspect recipient snapshot, and save draft.                                      | No delivery occurs; snapshot size and exclusions are visible.                                |
| - [ ] | `/campaigns`           | Filter drafts/status, inspect counts, duplicate/archive only QA records.                                                              | Status reflects preparation/outbox/provider state accurately.                                |
| - [ ] | `/campaigns/[id]`      | Test Editor, Recipients, Settings, preview, validation, and fake/other-location ID.                                                   | Draft remains inert until explicit authorized send.                                          |
| - [ ] | `/acquisition`         | Move Ben through controlled stages and compare source/intro/referral data.                                                            | Counts and client lifecycle agree.                                                           |
| - [ ] | `/churn`               | Inspect Cara's signals/actions and compare attendance/membership history.                                                             | Risk is explainable, scoped, and not silently mutating lifecycle.                            |
| - [ ] | `/loyalty`             | Configure test points/reward and verify a disposable transaction.                                                                     | Balance equals transaction ledger and workflow awards remain attributable.                   |
| - [ ] | `/referrals`           | Create a test code/referral and inspect pending/converted/rewarded states.                                                            | Client/source/reward relationships are consistent.                                           |
| - [ ] | `/intro-offers`        | Revisit redemption/conversion after Ben's lifecycle changes.                                                                          | Commerce, client, acquisition, and report views agree.                                       |

## Stage 9: Forms, publication, and embeds

### 9.1 Builders and templates

| Done  | Route                             | How to test                                                                                                    | Expected result                                                                         |
| ----- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| - [ ] | `/builder/forms`                  | Create `QA-A Trial Request`, filter/duplicate/archive only QA forms.                                           | Draft/version/status and submission counts are truthful.                                |
| - [ ] | `/builder/forms/[id]/editor`      | Add several safe fields, validation, mapping, retention, workflow, preview, save/version/publish, and fake ID. | Immutable published snapshot; payment/file/signature fields remain blocked.             |
| - [ ] | `/builder/forms/[id]/submissions` | Submit once publicly, retry same idempotency key, export/delete a disposable response if allowed.              | One mirrored receipt/submission, correct mapping/scope, bounded export.                 |

### 9.2 Public and preview publication routes

Public routes are fully exercised in Stage 11 after all required slugs/tokens
exist. At this stage verify the handoff links created by the editor:

- `/[slug]`
- `/p/[organizationSlug]/[targetSlug]/[[...path]]`
- `/embed/[orgSlug]/[type]`
- `/embed/schedule`

## Stage 10: Workflows, bundles, credentials, and executions

Start with a manual trigger and a harmless deterministic action. Add a sandbox
provider node only after the draft/manual flow is proven.

| Done  | Route                         | How to test                                                                                                                                                                                                           | Expected result                                                                                                                                       |
| ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/credentials/new`            | Create a disposable workflow credential, test validation and cancel.                                                                                                                                                  | Secret is encrypted/redacted and bound to exact scope.                                                                                                |
| - [ ] | `/credentials/[credentialId]` | Edit metadata/health/defaults, rotate only the test value, then fake/other-location ID.                                                                                                                               | Existing executions retain account identity; secret is never readable.                                                                                |
| - [ ] | `/webhooks/new`               | Create a test outbound webhook with owned endpoint, method/headers/signing/retry config, then disable it.                                                                                                             | URL and secret policy validate; disabled webhook is inert.                                                                                            |
| - [ ] | `/webhooks/[webhookId]`       | Inspect/edit/disable/health and test fake/other-location ID.                                                                                                                                                          | Scope and bounded errors are visible without leaking secret/body data.                                                                                |
| - [ ] | `/workflows`                  | Create draft, filter/search/archive/restore QA workflow.                                                                                                                                                              | Draft does not execute and archive is inert.                                                                                                          |
| - [ ] | `/workflows/[workflowId]`     | Add manual trigger/action, variables, branching, save/reload, invalid graph, activation confirmation, run once, and fake ID.                                                                                          | Invalid/disconnected/cyclic/unsupported graphs cannot activate.                                                                                       |
| - [ ] | `/executions`                 | Filter runs, then open Automation insights and filter attribution by rolling date, event, workflow, customer name/email, and source trigger. Compare one success, one safe failure, and duplicate signals on one run. | Every run has exact scope; conversion rate counts distinct successful converted runs and cannot exceed 100%; event names never leak across locations. |
| - [ ] | `/executions/[executionId]`   | Inspect node timeline, inputs/outputs/errors/retry and fake/other-location ID.                                                                                                                                        | Sensitive values are redacted and retry semantics are clear.                                                                                          |
| - [ ] | `/bundles`                    | Create/clone/archive a reusable draft bundle.                                                                                                                                                                         | Bundle is scoped, inert, and reusable without a trigger.                                                                                              |
| - [ ] | `/bundles/[bundleId]`         | Edit a connected reusable graph, save/reload, insert into a workflow, and fake ID.                                                                                                                                    | Bundle definition remains independent and valid.                                                                                                      |

The unscoped compatibility `/api/webhooks/google-form` endpoint is not suitable
for live workflow testing: it accepts a `workflowId` without signed,
provider-account authentication. Keep it off public/live integrations until
that boundary is corrected.

## Stage 11: Public customer journeys

Open these signed out, on desktop and mobile, with valid and invalid values.
For paid flows use Stripe test mode and a disposable purchaser. Verify the
internal operations ledger after success, cancellation, refresh, and retry.

| Done  | Route                                            | How to test                                                                                                                                                                                                                                                         | Expected result                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/schedule/[slug]`                               | Open the valid location slug, filter dates, book/cancel/waitlist a disposable client, then fake slug.                                                                                                                                                               | Public availability matches internal capacity/timezone; missing studio is safe.                                                                                                                                                                                            |
| - [ ] | `/pricing/[orgSlug]/[pricingSlug]`               | Open published drop-in/plan, test ineligible/direct purchase, cancel, test checkout, refresh/retry, fake slug.                                                                                                                                                      | One destination-charge test checkout; source drift/paused policy blocks purchase.                                                                                                                                                                                          |
| - [ ] | `/gift-cards/[orgSlug]`                          | Test presets/custom amount/recipient/message, invalid values, cancel, test checkout, and fake org.                                                                                                                                                                  | Exact positive amount, one gift-card ledger record, no duplicate retry.                                                                                                                                                                                                    |
| - [ ] | `/invoices/view/[invoiceId]`                     | Use the signed VIEW grant, not internal ID; test expiry/revocation/wrong purpose/fake token.                                                                                                                                                                        | Read-only invoice access is purpose-scoped and reveals no other tenant.                                                                                                                                                                                                    |
| - [ ] | `/invoices/pay/[invoiceId]`                      | Use signed PAY grant in Stripe test mode; test cancel/success/retry/expiry/revocation.                                                                                                                                                                              | Exactly one scoped payment/receipt and correct invoice status.                                                                                                                                                                                                             |
| - [ ] | `/recover-payment/[token]`                       | Open valid invoice, membership, appointment, and class-booking recovery links; test expired, resolved, cancelled, wrong-scope, refresh, checkout cancel, and Stripe test success.                                                                                   | The signed link reveals only bounded payment context and creates a destination only after confirmation; every provider call uses the case's persisted exact-scope account binding.                                                                                         |
| - [ ] | `/member-portal/[token]`                         | Repeat member journey signed out with valid/expired/revoked/fake token.                                                                                                                                                                                             | Only the intended member and allowed actions are exposed.                                                                                                                                                                                                                  |
| - [ ] | `/unsubscribe`                                   | Use a sandbox email's link plus invalid/expired/repeated token. Confirm only for synthetic recipient.                                                                                                                                                               | Confirmation writes suppression/consent once; validation is read-only.                                                                                                                                                                                                     |
| - [ ] | `/[slug]`                                        | Use an actual managed publication domain and a valid slug; test a fake slug.                                                                                                                                                                                        | Host selects the right published target without exposing another tenant.                                                                                                                                                                                                   |
| - [ ] | `/p/[organizationSlug]/[targetSlug]/[[...path]]` | Open the managed publication URL, optional valid/invalid path, pause, rollback, and submit a form.                                                                                                                                                                  | Kind/path policy is enforced and the selected live version remains exact.                                                                                                                                                                                                  |
| - [ ] | `/embed/schedule`                                | Confirm the legacy route only redirects when given a canonical publication reference; try raw `widget`/`org`, paused, wrong-type, wrong-location, and invalid snapshots.                                                                                            | Raw IDs never render and every mismatch fails generically.                                                                                                                                                                                                                 |
| - [ ] | `/p/[organizationSlug]/[targetSlug]` widget      | Embed every supported widget from one allowed and one blocked website origin; then test paused, rolled-back, wrong-location, source drift, Cal disconnect, paid/team/approval appointments, restricted video assets, inactive events, and referral-program changes. | CSP permits only exact origins; immutable versions render the correct type; private data stays excluded; drift fails closed; appointment links only target verified scoped Cal.com handles; events and referrals remain read-only; restricted or paid videos never render. |
| - [ ] | `/embed/[orgSlug]/[type]`                        | Confirm the compatibility route requires a canonical publication target; test `schedule`, `instructors`, unsupported types, and raw widget IDs.                                                                                                                     | Supported references redirect to `/p`; raw and unsupported inputs fail safely.                                                                                                                                                                                             |

## Stage 12: Analytics and reports

Generate controlled visits, form submissions, bookings, check-ins, POS sales,
invoice/payment receipts, campaign drafts, time logs, and workflow executions
before asserting metrics.

### 12.1 General analytics

| Done  | Route                                                  | How to test                                                                                                              | Expected result                                                            |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| - [ ] | `/analytics`                                           | Change date range/dimensions and compare totals with source records.                                                     | Definitions, timezone, currency, freshness, and gaps are visible.          |
| - [ ] | `/acquisition`                                         | Compare lifecycle/source counts with the six clients and form submissions.                                               | Attribution does not invent revenue or cross locations.                    |
| - [ ] | `/churn`                                               | Compare Cara's risk inputs with attendance/membership events.                                                            | Score and factors are explainable and current.                             |
| - [ ] | `/reports`                                             | Open directly.                                                                                                           | Redirects to `/reports/sales`.                                             |
| - [ ] | `/reports/[groupId]`                                   | Visit all five group IDs below, filter/search the catalogue, and test invalid group.                                     | Only contracted reports appear; invalid group is safe.                     |
| - [ ] | `/reports/[groupId]/[reportId]`                        | Open every concrete report variant in the next section; test filters, columns, saved view, CSV, empty state, invalid ID. | Table/chart/export share one metric contract and formula-safe CSV.         |

### 12.2 All report variants

For each report: test a narrow date containing the fixture, an empty date, a
location switch, column controls, saved view, and CSV. Payment reports must
show provider/reconciliation state; currency must never be silently converted.

**Sales (21)**

- [ ] `/reports/sales/sales`
- [ ] `/reports/sales/daily-closeout`
- [ ] `/reports/sales/cash-drawer`
- [ ] `/reports/sales/sales-by-service`
- [ ] `/reports/sales/sales-by-category`
- [ ] `/reports/sales/sales-by-product`
- [ ] `/reports/sales/gift-cards`
- [ ] `/reports/sales/sales-by-supplier`
- [ ] `/reports/sales/manage-online-orders`
- [ ] `/reports/sales/invoice`
- [ ] `/reports/sales/earned-revenue`
- [ ] `/reports/sales/outstanding-series`
- [ ] `/reports/sales/sales-promotions`
- [ ] `/reports/sales/revenue-by-class`
- [ ] `/reports/sales/average-revenue-analysis`
- [ ] `/reports/sales/returns`
- [ ] `/reports/sales/contract-sales`
- [ ] `/reports/sales/best-sellers`
- [ ] `/reports/sales/sales-tax`
- [ ] `/reports/sales/voided-sales`
- [ ] `/reports/sales/gift-card-analysis`

**Payment processing (10)**

- [ ] `/reports/payment-processing/transactions`
- [ ] `/reports/payment-processing/approved-transactions`
- [ ] `/reports/payment-processing/autopay-detail`
- [ ] `/reports/payment-processing/settled-transactions`
- [ ] `/reports/payment-processing/autopay-summary`
- [ ] `/reports/payment-processing/pending-transactions`
- [ ] `/reports/payment-processing/voided-rejected-transactions`
- [ ] `/reports/payment-processing/autopay-expirations`
- [ ] `/reports/payment-processing/autopay-cc-expirations`
- [ ] `/reports/payment-processing/card-updater`

**Clients (30)**

- [ ] `/reports/clients/membership`
- [ ] `/reports/clients/mailing-lists`
- [ ] `/reports/clients/client-ratings-and-reviews`
- [ ] `/reports/clients/account-balances`
- [ ] `/reports/clients/entry-logs`
- [ ] `/reports/clients/client-health-check`
- [ ] `/reports/clients/client-cancellations`
- [ ] `/reports/clients/first-visit`
- [ ] `/reports/clients/unpaid-visits`
- [ ] `/reports/clients/last-visit`
- [ ] `/reports/clients/attendance-analysis`
- [ ] `/reports/clients/pricing-option-expirations`
- [ ] `/reports/clients/new-members`
- [ ] `/reports/clients/visits-remaining`
- [ ] `/reports/clients/attendance-without-revenue`
- [ ] `/reports/clients/client-schedule-at-a-glance`
- [ ] `/reports/clients/retention`
- [ ] `/reports/clients/big-spenders`
- [ ] `/reports/clients/client-indexes`
- [ ] `/reports/clients/referral-types`
- [ ] `/reports/clients/no-return`
- [ ] `/reports/clients/client-promotions`
- [ ] `/reports/clients/retention-management`
- [ ] `/reports/clients/clients-per-teacher`
- [ ] `/reports/clients/no-shows`
- [ ] `/reports/clients/client-arrivals`
- [ ] `/reports/clients/online-metrics`
- [ ] `/reports/clients/referrers`
- [ ] `/reports/clients/event-payments`
- [ ] `/reports/clients/locker`

**Staff (16)**

- [ ] `/reports/staff/payroll`
- [ ] `/reports/staff/staff-schedule-at-a-glance`
- [ ] `/reports/staff/time-clock`
- [ ] `/reports/staff/staff-ratings-and-reviews`
- [ ] `/reports/staff/staff-cancellations`
- [ ] `/reports/staff/staff-schedule`
- [ ] `/reports/staff/phone-book`
- [ ] `/reports/staff/staff-performance`
- [ ] `/reports/staff/staff-clients-per-teacher`
- [ ] `/reports/staff/appointment-metrics`
- [ ] `/reports/staff/pay-rates`
- [ ] `/reports/staff/staff-activity`
- [ ] `/reports/staff/staff-retail-sales-performance`
- [ ] `/reports/staff/tasks`
- [ ] `/reports/staff/assistants`
- [ ] `/reports/staff/trainer-conversions`

**Inventory (8)**

- [ ] `/reports/inventory/inventory-on-hand`
- [ ] `/reports/inventory/inventory-sales-by-product`
- [ ] `/reports/inventory/cost-of-goods-sold`
- [ ] `/reports/inventory/inventory-sales-by-supplier`
- [ ] `/reports/inventory/inventory-manage-online-orders`
- [ ] `/reports/inventory/inventory-change-log`
- [ ] `/reports/inventory/inventory-retail-sales-performance`
- [ ] `/reports/inventory/inventory-age`

## Stage 13: Internal and isolated surfaces

These are not part of a customer's onboarding journey. Test them last and only
in local/non-production environments.

| Done  | Route                         | How to test                                                                                                       | Expected result                                                                                               |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/qa/routes`                  | Search/filter routes and notes; add, edit, and clear a note; use With notes; mark progress; reload; then reset progress. | All canonical items render in onboarding order; completion and notes persist in this browser; resetting progress retains notes. |
| - [ ] | `/onboarding/preview`         | Exercise the visual preloader phases at mobile/desktop without creating an organization.                          | Internal preview renders and does not mutate tenant data.                                                     |
| - [ ] | `/test/spot-booking/[roomId]` | Use a disposable room ID, inspect valid/full/invalid room states, and do not use live inventory.                  | Test harness remains isolated and clearly non-production.                                                     |

## API boundary checklist

API routes are not additional browser pages. Test them through the owning UI or
provider fixture unless explicitly marked as a safe direct negative probe.

### A. Test through the owning UI

| Done  | API route                                        | Owning flow and policy                                                                                    |
| ----- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| - [ ] | `/api/auth/[...all]`                             | Cover through login, sign-up, invitation, sign-out, and account switching.                                |
| - [ ] | `/api/ai/chat`                                   | Use the dashboard assistant with a scoped Gemini test credential and harmless question; verify usage log. |
| - [ ] | `/api/chat`                                      | Legacy model-action route; do not invoke directly. Confirm the UI uses `/api/ai/chat`.                    |
| - [ ] | `/api/notifications/stream`                      | Cover through two authenticated tabs and a harmless notification.                                         |
| - [ ] | `/api/publications/forms/[targetId]/submissions` | Cover through one disposable published form submission and its submissions page.                          |
| - [ ] | `/api/unsubscribe/validate`                      | Open valid and invalid test unsubscribe links; GET is read-only.                                          |
| - [ ] | `/api/unsubscribe`                               | Confirm only for a synthetic recipient; this commits suppression/consent changes.                         |
| - [ ] | `/api/uploadthing`                               | Cover only with non-sensitive disposable files through owning upload UIs.                                 |
| - [ ] | `/api/trpc/[trpc]`                               | Generic application transport; never hand-compose mutation requests.                                      |

### B. Developer API with disposable keys

Create separate read-only and write-test keys for the active location at
`/settings/developer`, test missing key (`401`), unbound legacy key (`403`),
wrong location (`403`), and missing scope (`403`), then revoke both afterward.

| Done  | API route             | Safe test                                                                                                       |
| ----- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| - [ ] | `/api/v1/classes`     | GET with `classes:read`; test date/class-type/instructor/capacity filters and limit.                            |
| - [ ] | `/api/v1/instructors` | GET with `instructors:read`; compare with team/instructor records.                                              |
| - [ ] | `/api/v1/memberships` | GET with `memberships:read`; compare with membership plans.                                                     |
| - [ ] | `/api/v1/members`     | GET pagination/search with `members:read`; POST one labelled lead with `members:write`, then retry same email.  |
| - [ ] | `/api/v1/bookings`    | GET filters with `bookings:read`; POST one disposable booking with `bookings:write`, retry, then test capacity. |

### D. Provider webhooks

Never send invented payloads. Bind the exact organization/location sandbox
account, use the provider's signed fixture or one harmless event, then inspect
operations/executions.

| Done  | API route                                  | Provider-safe test                                                                             |
| ----- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| - [ ] | `/api/webhooks/calcom/[credentialId]`      | Test create/reschedule/cancel from test Cal.com; verify credential-scoped secret and workflow. |
| - [ ] | `/api/webhooks/gmail`                      | Test one uniquely titled message on a scoped test mailbox and active subscription.             |
| - [ ] | `/api/webhooks/google-calendar`            | Test one disposable event with matching channel/resource/token subscription.                   |
| - [ ] | `/api/webhooks/google-form`                | **Do not expose/use with a live workflow** until signed tenant authentication exists.          |
| - [ ] | `/api/webhooks/onedrive`                   | Change one disposable file with matching subscription/client state.                            |
| - [ ] | `/api/webhooks/outlook`                    | Receive one unique test message/event with matching subscription/client state.                 |
| - [ ] | `/api/webhooks/resend/[providerAccountId]` | Use the account-specific Svix secret and sandbox event; verify outbox/inbox receipt.           |
| - [ ] | `/api/webhooks/stripe`                     | Stripe test checkout only; verify connected-account scope and commerce ledger.                 |
| - [ ] | `/api/webhooks/stripe-invoices`            | Compatibility test endpoint with disposable test invoice only.                                 |
| - [ ] | `/api/webhooks/stripe-memberships`         | Test subscription/customer/test clock and membership ledger.                                   |
| - [ ] | `/api/webhooks/stripe-connect-instructor`  | Disposable instructor Express test account and test event only.                                |
| - [ ] | `/api/webhooks/telegram`                   | Test bot, active scoped credential, URL credential ID, and secret token.                       |
| - [ ] | `/api/webhooks/twilio/sms/inbound`         | Receive one signed sandbox SMS; verify exact provider-account routing, idempotency, inbox receipt, and opt-out handling. |
| - [ ] | `/api/webhooks/twilio/sms/status`          | Send only to an owned sandbox number and verify signed queued/delivered/failed transitions update one outbox item. |
| - [ ] | `/api/webhooks/twilio/voice/inbound`       | Place one sandbox inbound call; verify signed routing and bounded TwiML for the exact configured number. |
| - [ ] | `/api/webhooks/twilio/voice/recording`     | Use a consented disposable recording fixture; verify signature, scoped receipt, retention state, and no public locator leakage. |
| - [ ] | `/api/webhooks/twilio/voice/status`        | Place one sandbox call and verify signed lifecycle transitions are idempotent and exact-account scoped. |

### E. Internal, operational, and retired endpoints

| Done  | API route                 | Policy / expected result                                                                                     |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| - [ ] | `/api/admin/reindex`      | Never run during onboarding; paid/scoped embedding operation for controlled non-production maintenance only. |
| - [ ] | `/api/inngest`            | Protocol endpoint; use Inngest dev/provider tooling, never manual browser/POST/replay.                       |
| - [ ] | `/api/sentry-example-api` | Deliberately throws; invoke once only in a dedicated non-production Sentry diagnostic.                       |
| - [ ] | `/api/stripe/connect`     | Retired safe GET probe returns `410 Gone`.                                                                   |
| - [ ] | `/api/stripe/callback`    | Retired safe GET probe returns `410 Gone`.                                                                   |
| - [ ] | `/api/webhooks/calcom`    | Retired safe POST probe returns `410 Gone`; use credential-scoped route.                                     |
| - [ ] | `/api/webhooks/resend`    | Retired safe POST probe returns `410 Gone`; use account-scoped route.                                        |

`OPTIONS` handlers on form endpoints are CORS plumbing covered by the browser
flows; they are not separate user journeys.

## Scope and permission stress pass

After the happy path, repeat this compact matrix:

| Test                                                | Pass condition                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| London record while Manchester active               | Not listed; direct ID is denied/not found.                                    |
| Organization-level provider with inheritance off    | Not eligible for London work.                                                 |
| Organization-level provider with inheritance on     | Eligible only where the product explicitly permits inheritance.               |
| Exact London provider plus inheritable org provider | London provider wins deterministically.                                       |
| Disabled/disconnected provider                      | UI blocks action before dispatch and operations show actionable health.       |
| Viewer/limited user mutating URL/API                | Server denies even if a request is manually attempted.                        |
| Duplicate submit/send/checkout webhook              | One business effect; duplicate receipt is visible/idempotent.                 |
| Currency/timezone boundary                          | Exact money and local service date remain consistent across UI/report/export. |

## Teardown

1. Disable/unpublish workflows, campaigns, forms, widgets, and public
   targets first.
2. Revoke test API keys, webhook subscriptions, OAuth grants, provider accounts,
   and Stripe test onboarding bindings. Confirm no queued outbox/executions are
   still active.
3. Cancel future classes/series and disposable recurring invoices/memberships
   before removing dependent catalogue records.
4. Remove invites and test users last so owner access remains available.
5. Reset the disposable database when possible. If not, preserve the run label
   in the retained QA location and document anything that cannot be removed.
6. Never use `Populate demo data` as teardown; it only populates an empty scope.

## Defect log template

Record one row per failure. Do not combine unrelated routes into one issue.

| Field                          | Value |
| ------------------------------ | ----- |
| Run label                      |       |
| Route and source flow          |       |
| Role, organization, location   |       |
| Desktop/mobile                 |       |
| Fixture IDs                    |       |
| Exact steps                    |       |
| Expected                       |       |
| Actual                         |       |
| Console/network/correlation ID |       |
| Reproducible after refresh     |       |
| Data cleanup required          |       |

## Coverage verification

After routes or reports change, run:

```bash
node scripts/check-manual-route-coverage.mjs
```

The checker fails when a current page route, API route, duplicate root source,
or report variant is missing from this playbook.
