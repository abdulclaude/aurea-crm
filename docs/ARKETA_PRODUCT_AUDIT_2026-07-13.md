# Arketa Product Audit for Aurea CRM

Date: 2026-07-13

## Decision boundary

Arketa was inspected as workflow and capability evidence only. Its layout,
visual hierarchy, colors, component styling, and product copy are not design
references for Aurea. Every implementation resulting from this audit must use
Aurea's existing navigation, typography, components, spacing, and interaction
patterns.

Third-party capability evidence is also implemented through Aurea's tenancy
model, not Arketa's account assumptions: provider accounts, credentials,
webhook identity, health, and side effects must be bound to an organization and
optional location. Deployment-level keys may provide protocol infrastructure
but never select or authorize tenant work.

## Audit contract and safety

- The signed-in Arketa dashboard was inspected read-only.
- Routes, tabs, menus, dialogs, builders, filters, and field surfaces were
  opened where doing so did not commit a write.
- No form was saved, no message or campaign was sent, and no existing record
  was edited or deleted.
- Destructive or immediately committing controls were not intentionally used.
- Some routes were blank, redirected, plan-gated, role-gated, or returned a
  not-found state. Those outcomes are still recorded as observed product
  behavior.
- One control labelled `New Dashboard` unexpectedly created `Custom Dashboard
  1` immediately, before presenting a confirmation step. No further changes
  were made and the record was not deleted because deletion was also outside
  the audit contract. The affected Arketa workspace owner should review it.

## Coverage proof

The audit combined UI navigation, direct route inspection, safe dialog/field
inspection, and parsing of Arketa's shipped dashboard route registry.

| Evidence | Result |
| --- | ---: |
| Registered dashboard route entries | 236 / 236 requested |
| Unique registered route patterns | 214 / 214 covered |
| Static dashboard path candidates in the shipped bundle | 153 / 153 covered |
| Captured route and flow states | 418 |
| Analytics reports | 57 / 57 covered |
| Automation trigger slugs | 28 / 28 covered in trigger and builder states |
| Automation action editors | 9 / 9 covered |
| Settings subroutes | 49 captured states, including integration details |

Dynamic routes were exercised with the records available in the signed-in
workspace. This proves route and surface coverage for the inspected build; it
does not prove behavior hidden behind a different plan, role, feature flag, or
tenant configuration.

The sanitized 418-row evidence appendix is in
[`ARKETA_ROUTE_COVERAGE_2026-07-13.md`](./ARKETA_ROUTE_COVERAGE_2026-07-13.md).

## Route-family ledger

### Shell, account, and operating context

Covered the main dashboard, inbox, new-conversation flow, changelog,
availability, time cards, purchase, corporate, office hours, staff shift
scheduling, staff availability, staff activity log, time clocking, account
settings, organizations, organization analytics, restricted surfaces, and the
Arketa Connect entry point. Account settings included profile, shared notes,
integrations, advanced, and payroll tabs.

The dashboard emphasizes today's operating queue, notifications, upcoming
schedule, and favorite reports. The strongest reusable idea is a role-aware
operating home, not a denser collection of dashboard cards.

### Classes and scheduling

Covered full schedule, classes, private appointments, events, substitutions,
class detail/check-in, studio-and-staff configuration, and the new class,
private, and event variants. Safe create flows exposed recurrence, capacity,
waitlist, instructors, rooms/locations, pricing eligibility, booking windows,
visibility, cancellation behavior, and customer communication settings.

Aurea already has the right domain foundation: schedule, service types,
classes, class series, check-in, substitutions, rooms, memberships, and
booking. The next gains are consistency between these surfaces, not another
parallel scheduling model.

### Beyond and content products

Covered on-demand video and its management/detail variants, communities,
retail products, invoices, bulletin board, series, courses/programs, and the
structural Beyond routes. These are adjacent product lines rather than core
CRM primitives.

Video, community, and course builders should be deferred until payments,
delivery, permissions, and reporting contracts are trustworthy. Retail and
invoices are closer to Aurea's existing commerce model and should remain part
of one shared order/payment ledger.

### Customers

Covered client lists and alternate list variants, client detail tabs,
check-ins, segments, segment detail/building, comments, and structural customer
routes. The available client record exposed contact/profile data, purchases,
bookings, subscriptions, credits, guest passes, family relationships, notes,
timeline/activity, email state, and inbox context.

Segment conditions span identity, lifecycle, attendance, commerce,
subscription, pricing-option, tag, and email behavior. Aurea should keep one
typed segment model that campaigns, workflows, reports, and inbox views all
consume.

### Marketing and automation

Covered the marketing dashboard, leads, lead variants, forms, workflows,
campaigns, referrals, testimonials, tasks, achievements, challenges, promo
codes, AI outreach, gift cards, email templates, and email surfaces.

Automation coverage included every shipped trigger slug in both trigger and
builder states, lifecycle stages, 30 lifecycle-transition states, all action
editors, and the available create/edit shells. The high-value pattern is the
closed loop between an event, a customer state change, a delivery attempt, and
an operator-visible exception. Aurea should not copy Arketa's builder or add
more nodes until its existing campaign and message delivery paths are durable.

One observed lifecycle transition (`embeddable_form_submitted`) returned a
not-found state. An email-event dummy route also returned not found. Blank or
structural automation routes were recorded rather than treated as features.

### Analytics

Covered analytics roots, favorites, business overview, sales overview,
bookings and visits, introductory offers, first timers, payment issues,
memberships, instructor performance, client celebrations, team celebrations,
custom dashboards, the assistant, benchmarks, legacy reports, and all 57
current reports.

The report catalog spans payments, refunds, disputes, seller/class/category
sales, pricing options, deferred revenue, bookings, late cancels/no-shows,
inventory, retail, intro offers, subscriptions, video, attendance, first/last
visit, gift cards, retention, visit averages, and guest passes. Its useful
lesson is dimensional coverage and export/filter contracts. Aurea should not
replicate 57 near-duplicate report routes; it should expose fewer metric-backed
views over a shared semantic layer.

### Team and staff

Covered team list/detail states, permissions, pay rates and pay templates,
availability, roles, reporting, staff commissions, time cards, payroll roots,
and payroll setup/regular variants.

Aurea should converge organization members, location members, instructors,
and studio staff around an explicit staff identity and capability model while
keeping domain-specific profiles. Pay rules must be versioned and auditable.
Payroll execution should remain deferred until earnings, adjustments,
approvals, and payment reconciliation are backed by a real ledger.

### Manage and commerce catalog

Covered service types and variants, pricing, pricing creation variants, promo
codes, gift cards, locations, orders, time clocking, and structural manage
routes. Pricing flows include packs, memberships/subscriptions, bundles, and
buy pages.

Aurea already has pricing options, memberships, products/POS, account credit,
gift cards, promo codes, invoices, and public pricing. These must share one
catalog, order, payment, refund, credit, and entitlement contract rather than
remain route-specific implementations.

### Sales channels and public surfaces

Covered website integration, branded website and builder variants, mobile app
and layout variants, chatbot configuration/guide states, widget v2, and the
sales-channel roots.

Website integration exposes presentation options and embed code. The durable
capability is a tenant-scoped publication target with theme tokens, domain,
visibility, allowed inventory, preview/live parity, and channel health. It is
not a reason to copy Arketa's visual editor. Mobile app and chatbot builders
should wait until the same channel contract works for Aurea's schedule,
pricing, forms, and gift-card surfaces.

### Settings and integrations

Covered business, public-facing configuration, locations, team, taxes,
language customization, revenue categories, offline payment types, FAQs,
general clients, required signup fields, custom fields, forms, family sharing,
tags, client-note templates, lifecycle stages, general schedule, booking
windows, waitlist, no-show/late-cancel, guest-list booking, phone, texting,
signup forms, email domains/settings, transactional emails, sent messages,
confirmation emails, macros, suppression, payments, plan, early booking,
discounts, staff commissions, public page, Atlas, payroll settings, and the
settings roots.

Integration routes covered Apple Pay, API, AI assistants, ClassPass, Facebook,
Google, Kisi, Mailchimp, Spivi, Wellhub, Zapier, and Zoom, plus integration
index/structural variants. Aurea should model provider lifecycle consistently:
connect, authorize scopes, health, sync cursor, webhook/subscription state,
reconnect, revoke, disconnect, and operator-visible errors.

### Accounting and payroll

Covered accounting overview, bank transactions, general ledger, reports,
payroll list, setup, and regular payroll variants. These were premium-gated or
limited in the inspected workspace. Aurea should not market accounting or
payroll as complete until journal, reconciliation, approval, audit, and export
contracts exist.

## Product decisions for Aurea

| Area | Keep | Improve or add | Remove or defer |
| --- | --- | --- | --- |
| Navigation and setup | Aurea launchpad, grouped sidebar, tenant context | Role-aware home, complete route discovery, setup progress based on real postconditions | Duplicate nav layers and settings links to non-settings work |
| Payments | Stripe-backed checkout, invoices, studio payments, bank transfer | Express onboarding, destination charges, signed typed webhooks, reconciliation, disputes/refunds, payment health | Unsigned generic webhooks, legacy Standard OAuth, manual-transfer illusions |
| Website and embeds | Public schedule, pricing, gift cards, funnels, tracking SDK | Shared publication/channel contract, theme tokens, domain health, preview/live parity | Advertised widget types without a renderer; a separate visual language per channel |
| Branding | Existing branding and style settings | One versioned tenant theme consumed by CRM-native public surfaces and embeds | Styling copied from Arketa or one-off client branches |
| Analytics | Aurea funnel and attribution depth, provider-backed revenue direction | Metric contracts, saved views, dimensions, exports, reconciliation status | Dozens of route-specific report implementations over conflicting calculations |
| Staff | Team, instructors, location membership, time logs, rotas | Capability matrix, unified staff identity, availability, pay-rule versions, audit trail | Payroll execution before the earnings ledger is reliable |
| Marketing | Campaigns, forms, workflows, referrals, funnels | Durable outbox, audience snapshots, consent/suppression, provider delivery events, reply handling, exception inbox | Campaign UI that schedules rows without a delivery contract |
| Customers | Clients, households, lifecycle, notes, payments | Shared timeline, segments, credits, guest passes, retention signals, inbox context | Separate customer definitions per module |
| Classes | Schedule, service types, classes, series, check-in, substitutions | Consistent recurrence, capacity, waitlist, room/staff constraints, exception handling | Another scheduling engine |
| Sales channels | Public pricing/gift cards/schedule and external funnels | Configurable channel publication, availability, catalog selection, SEO and consent | Mobile/community builders before core channel contracts are proven |
| Inbox | Existing conversation surface | Provider-backed send/outbox, delivery/read/failure state, assignment, customer context, bounded AI assistance | Insert-only messages presented as delivered communication |
| Locations and settings | Organization/location context and scoped resources | Ownership validation, configuration inheritance, override visibility, change history | Duplicated settings and ambiguous organization-vs-location values |
| Accounting and payroll | Payment and time/earnings source data | Reconciliation first, then journals/approvals/exports | Premium-style shells without real financial contracts |

## Implementation delivered from this audit

The implementation generalizes the useful product capabilities while retaining
Aurea's existing ShadCN components, compact CRM layout, tokens, and interaction
patterns. No Arketa styling or visual structure was copied.

1. Commerce reliability and access
   - Added exact minor-unit money utilities, scoped commerce operations, an
     immutable provider ledger, signed webhook receipts, deterministic
     idempotency, retry recovery, and reconciliation runs/issues.
   - Added safe refund reservation and reconciliation transitions, Stripe
     Express destination-charge enforcement, capability-gated payment actions,
     and operator-facing payment/reconciliation state.
   - Replaced invoice identifiers as public bearer secrets with expiring,
     revocable, purpose-scoped access grants.

2. Durable outbound delivery
   - Added one tenant-scoped delivery outbox for campaign, email, SMS, inbox,
     and app work, including suppressions, normalized destinations, bounded
     retries, provider receipts, engagement state, and dead-letter outcomes.
   - Campaigns now snapshot a saved audience at send preparation time instead
     of silently changing their recipient population later.
   - Invitations, invoice/reminder mail, instructor magic links and alerts,
     payment confirmations, and critical notification mail now enqueue through
     the same outbox. Caller surfaces report queue acceptance rather than
     claiming provider delivery.
   - Transactional bodies are encrypted in the durable payload so bearer links
     are not stored as plaintext. Invoice PDFs use bounded, typed invoice
     references and are regenerated only after exact tenant scope validation;
     inline attachment bytes are rejected.

3. Coherent customers, audiences, staff, and permissions
   - Added reusable saved-audience definitions, previews, campaign snapshots,
     and a merged customer timeline with stable cursor semantics.
   - Added canonical staff identities and an explicit organization/location
     capability matrix without collapsing instructors, members, and studio
     staff into one ambiguous record type.

4. Versioned publication and sales channels
   - Added a shared publication target/version model for funnels, schedules,
     pricing, gift cards, widgets, custom domains, theme snapshots, SEO,
     consent, pause, rollback, drift, and preview/live parity.
   - Public rendering uses immutable selected versions. Pricing checkout is
     blocked on source drift, direct-purchase policy is enforced server-side,
     and category-level consent controls analytics, marketing pixels, and
     custom scripts independently.
   - Added native, versioned public form definitions with immutable publish
     snapshots, fifteen safe field types, preview/live parity, configurable
     retention, same-origin or signed cross-origin submission, idempotent
     mirroring into the CRM form ledger, and workflow dispatch. Payment, file,
     and signature fields remain publish blockers until their own storage and
     trust contracts exist.
   - Added consent-aware first-party tracking to published Aurea pages. The
     runtime uses signed publication configuration, honors DNT/GPC, bounds
     telemetry volume and freshness, and never treats browser events as
     authoritative conversion or payment records.

5. Trustworthy reporting
   - Added metric contracts, saved report views, visible freshness/currency/
     reconciliation gaps, bounded CSV export ledgers, and formula-injection
     protection.
   - Exposed only reports backed by current data contracts instead of cloning
     every observed report shell. Sales and inventory aggregation use exact
     minor-unit arithmetic and preserve currency as a dimension without
     implicit FX conversion.

6. Navigation and truthful surface cleanup
   - Corrected sidebar/settings links, exposed existing routes that were
     omitted, made collapsed groups discoverable, removed the fabricated
     subscription page, and kept unsupported legacy widgets/nodes visible as
     unavailable rather than emitting broken behavior.

7. Scoped provider accounts
   - Added encrypted organization accounts with optional location overrides for
     Resend, Twilio, Vonage, and MessageBird. Organization defaults inherit only
     when explicitly enabled, while an exact location account wins.
   - SMS configuration no longer stores provider credentials. Queued deliveries
     persist the internal provider-account identity, and dispatch revalidates
     account, organization, location, provider, active state, and inheritance
     immediately before the provider request.
   - Workflow, inbox, bulk, and substitution SMS paths now use the durable
     outbox instead of inserting delivery-looking rows without a dispatch path.
   - Meta Conversions API, Google Ads, and TikTok Events API now use the same
     encrypted organization/location account model with inheritance disabled
     by default. Funnel scope is database-authoritative, each account is
     revalidated immediately before dispatch, and the account-bound delivery
   ledger keeps deterministic event IDs and bounded health errors.

8. Scoped AI and workflow activation safety
   - AI requests now resolve an explicit encrypted credential in the exact
     organization/location scope. Multiple credentials require a selected
     default; there is no environment-key tenant fallback.
   - AI usage logs persist the internal credential identity, generated
     workflows remain inactive drafts, model-driven mutations are capability
     checked, and retained vector content is minimized and expires.
   - Workflow activation now requires an explicit review confirmation, one
     valid trigger, a connected acyclic graph, implemented nodes, and exact
     provider readiness. Archived workflows are presented as inactive rather
     than implying execution readiness.

9. Public purchase, authentication, and responsive reliability
   - Pricing, gift-card, and standalone schedule pages now render the same
     initial state on the server and client, eliminating query-driven
     hydration mismatches found during real browser QA.
   - Public pricing renders server-sanitized rich text rather than exposing
     stored markup. Gift-card amounts cross the API as decimal strings and are
     converted to exact currency minor units before any customer record or
     provider work begins.
   - Checkout and authentication fields have associated labels and browser
     autocomplete contracts. Google authentication controls are wired to the
     existing platform authentication provider, and protected deep links are
     preserved through sign-in using a same-origin callback policy.

10. Provider-backed inbox and replies
    - Added tenant-scoped inbox routes bound to an internal Resend provider
      account, hashed per-conversation reply routing, signed inbound receipt
      ingestion, idempotent processing, bounded leases/retries, and durable
      inbound message provenance.
    - Conversations support assignment and status management through explicit
      capabilities. Outbound replies use the shared delivery outbox and retain
      the selected provider-account identity instead of appearing delivered at
      insert time.

11. Tracking identity and privacy lifecycle
    - Added exact organization/location ownership to visitor profiles,
      sessions, events, web vitals, quotas, and external form submissions, with
      database constraints and triggers that reject cross-scope identities.
    - Added capability-gated visitor export and erasure. Erasure runs in one
      transaction, removes telemetry and linked form records, leaves a minimal
      tombstone that prevents reingestion, and purges matching realtime cache
      entries. Export is bounded and reports when a collection is partial.
    - IP hashing now requires a deployment secret and uses rotating HMAC-SHA256;
      it fails closed rather than falling back to a predictable salt.

12. OAuth operations and workflow readiness
    - OAuth accounts now expose exact-scope connection health, inherited-account
      state, last success/error details, and reconnect controls instead of hiding
      degraded installations behind a new-connect action.
    - Google, Microsoft, Slack, and Discord health checks are read-only and
      classify reauthorization separately from transient degradation. Workflow
      activation and subscription renewal both revalidate the persisted internal
      provider-account binding.

13. Publication-backed studio channels
    - Added typed FORM, INTRO_OFFER, EVENT, ON_DEMAND, and REFERRAL widget
      publications on the same versioned, consent-aware channel foundation.
    - Referral conversion is tenant-scoped, idempotent, workflow-operable, and
      included in demo data and automation conversion classification.

14. Attendance integrity and member passes
    - Check-in, booking attendance, member streaks, and intro-offer usage now
      update in one transaction with exact organization/location validation and
      a database uniqueness guard per class/member.
    - No-show actions are available only after class completion, every attendance
      mutation requires `attendance.manage`, and roster reads require
      `schedule.view`.
    - Member portal QR passes are signed, expiring, and bound to member,
      organization, and location. Front-desk scanning uses the existing Aurea
      UI with camera and paste fallback; raw client IDs are no longer accepted as
      passes.
    - Member portal links and class inventory are exact-location scoped. Public
      booking serializes capacity checks on the class row and a partial unique
      index rejects duplicate active bookings without blocking a later rebooking
      after cancellation.

15. Conversion and retention operations
    - Analytics now exposes the persisted automation event explorer and selectable
      7/30/90-day conversion, referral, recovery, and workflow-success metrics
      instead of a static workflow placeholder.
    - Churn scores are exact-location resources with capability-gated reads and
      recalculation, deterministic scoring, a single batch upsert, composite
      ownership constraints, and a database scope trigger.

16. Cancellation and no-show operations
    - Added reusable, location-scoped cancellation policies with configurable
      windows, exact decimal fees, class-credit deductions, notification
      behavior, default policy selection, and per-class assignment.
    - Attendance outcomes create one idempotent charge record, reserve and
      record the exact credits consumed, and can restore only those allocations
      during a verified waiver. Legacy or incomplete allocation history fails
      closed rather than guessing.
    - Automatic fees use the active workspace's Stripe Express connection,
      destination charges, a persisted commerce-operation binding, application
      fees, signed webhook accounting, durable retry state, refunds, and
      disputes. Unknown provider outcomes remain blocked for reconciliation so
      they cannot be charged twice.
    - `/settings/cancellations` uses Aurea's existing settings layout and
      components for policy management and fee operations. Class attendance
      actions show the affected members and maximum fee and credit impact before
      an operator confirms; no Arketa styling or visual structure was copied.

17. Payment recovery and authoritative paid class booking
    - Added versioned, tenant-scoped recovery policies, cases, actions, attempts,
      customer links, assignment, delivery history, and operator controls for
      invoice, membership, appointment, and class failures.
    - Recovery side effects retain an exact organization, location, provider
      account, and idempotency binding. Late or ambiguous provider outcomes fail
      closed for operator reconciliation rather than risking a duplicate charge,
      message, booking, or credit release.
    - Class and waitlist confirmation now share one serialized booking service
      for capacity, duplicate-booking, entitlement, payment-hold, checkout, and
      workflow behavior. Paid checkout uses the exact location's Stripe Express
      account with destination charges and persisted application fees.
    - `/settings/dunning`, `/settings/payments/recovery`, and
      `/recover-payment/[token]` use Aurea's existing settings and public-page
      patterns; no Arketa styling was copied.

18. Scoped developer and fitness-provider channels
    - Developer API keys are exact-location resources with explicit scopes;
      location users cannot mutate ambiguous legacy organization-only keys.
    - Mindbody connections, sync cursors, imported records, and all four sync
      jobs retain the persisted organization/location app binding. The worker
      has bounded retries, concurrency, idempotency, and runtime limits.
    - Public class availability counts only capacity-consuming booking states
      and cannot leak or overstate inventory from cancelled or rejected rows.

## Roadmap status

- **P0 foundation implemented:** commerce ledger,
  typed/idempotent provider receipts, reconciliation, scoped refunds,
  capability gates, public invoice grants, durable outbound delivery, and
  scoped Resend/SMS accounts are implemented. OAuth installations, legacy
  credentials/webhooks, account-bound subscriptions, advertising accounts,
  Stripe historical account binding, and scoped AI defaults are implemented.
- **P1 implemented:** saved audiences, recipient snapshots, customer timeline,
  staff identity, the organization/location capability model, inbox assignment,
  scoped reply routes, verified inbound reply ingestion, signed member passes,
  attendance integrity, automation conversion reporting, and location-scoped
  churn operations are implemented. Versioned failed-payment recovery,
  authoritative paid class and waitlist booking, scoped customer recovery links,
  and operator recovery operations are also implemented.
  Additional audience dimensions can now be added through the reusable typed
  definition rather than client-specific query branches.
- **P2 implemented for the retained scope:** versioned publication targets,
  consent-aware channel rendering, domain/parity/rollback controls, native
  forms, consent-aware first-party tracking, metric contracts, saved views,
  data-health gaps, and bounded exports are implemented. Unsupported form field
  types and uncontracted reports fail closed instead of being advertised.
- **P3 intentionally deferred:** native mobile layout building, community and
  course suites, general accounting/payroll execution, and open-ended AI
  outreach. These need separate trustworthy domain contracts rather than thin
  route parity.

## Verification evidence

- Compatible Node test suite: 552 tests passed across 103 suites covering commerce, delivery,
  permissions, audiences, customer timeline, publication, reporting, staff
  identity, Stripe Connect, invoices, widgets, Stripe environment-mode checks,
  bounded webhook body handling, provider-account scope policy, advertising,
  AI credentials/actions, workflow activation, inbox routing/ingestion, public
  forms, tracking scope, privacy erasure, authentication callbacks, OAuth
  lifecycle, workflow provider readiness, check-in integrity, member passes,
  automation metrics, churn scoring, cancellation policy integrity, reversible
  credit allocations, Stripe destination binding, collection retry policy,
  refunds, disputes, and payment-attempt cancellation.
- TypeScript: `npm run typecheck` passed.
- Production compilation: the default `npm run build` Turbopack build passed
  and emitted the current application route manifest, including
  `/settings/cancellations`. Its only reported warnings are the existing Sentry `disableLogger` and
  `automaticVercelMonitors` deprecations.
- Drizzle schema validation: `npx drizzle-kit check` passed.
- `git diff --check` passed.
- The configured local database migration ledger contains 64 applied migrations
  through `0063`. Read-only preflight checks found no scope conflicts or
  ambiguous form mirrors and zero affected rows in the new inbox, form, and
  tracking, check-in, OAuth, and churn-score tables. Postflight verification
  preserved those counts and found
  every expected table, column, index, constraint, foreign key, and scope
  trigger. A rollback-only probe confirmed the public-form receipt scope guard;
  tracking and inbox mismatch probes had no safe existing fixture to target.
- The rollback-only showcase demo population completed with 21,305 owned
  records across 128 record types, including 4,350 bookings, 300 classes, 320
  payments, and 83 booking payment links. The QA-exhaustive profile completed
  with 60,752 owned records across the same 128 record types, including 15,288
  bookings, 1,052 classes, 900 payments, and 233 booking payment links. Both
  runs rolled back and left no committed demo rows.
- Clean desktop/mobile browser checks covered login, registration, protected
  provider-account deep links, and the pricing, gift-card, schedule, and
  publication missing-resource states with no horizontal overflow or console
  warnings/errors on the supported `localhost` origin. Authenticated checks also
  covered the cancellation policy and fee tabs, the complete unsaved policy
  editor, permission-aware actions, the mobile settings sheet, and a 390 px
  policy dialog with no horizontal overflow or console error. Protected links
  preserve the original route in `callbackUrl`.
- A current authenticated read-only pass also covered the 286-item route
  checklist, recovery policy editor, and recovery operations queue on the local
  database with no console errors. No recovery policy or case was mutated.
- Read-only HTTP probes confirmed anonymous tracking deletion returns `410`,
  an external form submission without scoped credentials returns `401`, and an
  unknown publication target returns a normal `404`.
- The migrated publication runtime now returns a normal 404 for an unknown
  target instead of a missing-table error.
- Stripe test-mode credentials passed a read-only provider authentication
  check. Unsigned, incorrectly signed, and oversized webhook probes failed
  closed without changing `StripeEvent`, `DeliveryProviderEvent`,
  `OutboundDelivery`, or `CommerceOperation`. Stripe and Resend now share a
  streaming 1 MiB raw-body limit, and Stripe rejects live/test mode mismatch.
- No policy, fee, booking, or provider record was created, edited, collected,
  waived, or deleted during browser verification.

## Remaining risks and approval-gated work

- Resend dispatch remains disabled until an authorized user creates an
  organization/location-scoped account in Settings > Provider accounts and
  registers its account-specific webhook endpoint. No provider account was
  created and no live Resend setting was changed during this work.
- Product email cannot call Resend directly. The delivery worker resolves the
  persisted internal provider-account ID and revalidates provider,
  organization, location, active state, and explicit inheritance immediately
  before each provider request. No live message was sent during this work.
- SMS dispatch remains disabled until an authorized user creates an encrypted
  organization or location account in Settings > Provider accounts. No SMS
  account was created and no test message was sent. Migration `0025` fails
  closed in any environment that contains legacy plaintext SMS rows rather than
  guessing ownership or destroying credentials.
- User OAuth apps, legacy workflow credentials, saved outbound webhooks, and
  provider subscriptions now require explicit organization/location ownership
  and are revalidated at use time. Existing tenants may still need an
  authorized operator to reconnect or select a default account where migration
  could not infer one safely.
- Ad conversion dispatch remains disabled until an authorized user configures
  the relevant scoped Meta, Google Ads, or TikTok account in Settings > Provider
  accounts. No live provider call or account mutation was made during this work.
- Dedicated Stripe booking, invoice, membership, commerce, and Connect webhook
  secrets are not configured. Compatibility endpoints fall back to the generic
  secret, while Connect correctly remains unavailable. Endpoint registration
  and signed test-mode delivery must be verified before cutover.
- No live payment, refund, provider webhook registration, email/SMS send, or
  production record creation was used for verification. Stripe Checkout,
  Connect, refunds, and delivery remain approval-gated external effects.
- IP hashing now fails closed until a strong `IP_HASH_SALT` is configured. A
  deployment secret must be provisioned before enabling hashed-IP retention;
  there is no global or predictable fallback.
- Drizzle journal entries now run through `0063`, but generated snapshots stop
  at `0046`. `drizzle-kit check` passes, yet future generated SQL needs
  independent review until snapshot lineage is repaired.
- Historical commerce ledger backfill and staff-identity linking were not part
  of DDL. Each needs a read-only dry run, reconciliation counts, and explicit
  approval before mutating existing records.
- Privacy exports are deliberately bounded to 1,000 rows per collection and
  flag partial results. A high-volume asynchronous export artifact and formal
  privacy-request case workflow remain separate future work.
- Visitor erasure covers scoped Aurea telemetry and linked native/external form
  submissions. It intentionally does not silently erase CRM clients, payments,
  provider-held copies, audit records, or backups; those require a broader,
  reviewable privacy-request workflow. Historical external submissions without
  an unambiguous linked mirror cannot be inferred safely, although the migrated
  database contained no such rows.
- Payment, file-upload, and signature form fields remain unavailable for native
  publication until their payment, storage, malware scanning, signature,
  retention, and consent contracts are implemented.
- The current authenticated local tenant is intentionally sparse. The
  rollback-only exhaustive demo proves generator breadth, but a separate
  disposable tenant is still needed for manual data-rich browser coverage of
  commerce, audiences, publications, staff, and reports without retaining demo
  records.
- The dashboard emits existing Recharts zero-dimension warnings during its
  initial empty-data render. The page remains usable, but the chart containers
  should be hardened in a focused dashboard pass.
- The production build reports two existing Sentry configuration deprecations;
  they should be migrated before a future Sentry major upgrade.
- Arketa can change its shipped route tree after this dated audit.
