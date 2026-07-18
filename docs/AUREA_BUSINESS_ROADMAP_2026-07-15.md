# Aurea Business Roadmap

**Current position, launch priorities, and growth plan**

Prepared for business-partner discussion | 15 July 2026

## Executive summary

Aurea has moved beyond being an early CRM prototype. It is now a broad wellness
studio operating platform covering setup, classes, bookings, memberships,
payments, customers, staff, marketing, automation, websites, embeds, analytics,
and multi-location management.

The product is ready for structured owner testing and a controlled pilot. It is
not yet ready for an unrestricted commercial launch. The main job is no longer
to add every basic feature. It is to prove the important journeys with realistic
data, activate payment and messaging providers safely, simplify the remaining
legacy CRM language, and polish the experience studio teams use every day.

**Recommended position:** complete launch hardening, onboard a small number of
pilot studios, and use their behaviour to decide which expansion bets deserve
investment. Do not broaden into mobile apps, communities, courses, accounting,
or open-ended AI outreach before the core studio product is trusted.

## Where we are today

**Product stage: private beta / structured quality assurance**

Aurea is feature-rich enough to demonstrate and test as a complete studio
platform. The engineering foundation is substantial, but breadth is not the
same as launch readiness. Real-world payment, messaging, permission, and
multi-location journeys still need controlled validation before we promise them
to unrestricted customers.

Current evidence:

- 286 product and route checks arranged in the order a new studio would onboard.
- 552 automated tests across 103 test groups.
- A successful production build and full type-safety check.
- 64 database upgrades applied to the local environment.
- Demo data covering 128 categories of studio information.
- An exhaustive demo profile that creates more than 60,000 linked records and
  then safely rolls them back.
- A competitor review covering every registered route in the audited Arketa
  dashboard version.

## What Aurea already does

### Studio setup and multi-location operation

- Guided studio setup, launch checklist, rooms, class types, instructors,
  memberships, branding, locations, and workspace settings.
- Organization and location separation so data and connected accounts remain in
  the correct business and venue.
- Role-based access for owners, managers, front desk, instructors, and other
  staff responsibilities.

**Status:** built and ready for structured testing. The remaining work is mainly
terminology cleanup and proving the full first-time setup journey.

### Classes, scheduling, and attendance

- Classes, recurring class series, service types, rooms, spots, capacity,
  instructors, substitutions, and studio schedules.
- Member booking, paid booking, waitlists, safe waitlist promotion, check-in,
  attendance, no-shows, late cancellations, and configurable fees.
- Public schedules and member-facing booking experiences.

**Status:** the core is built. Paid journeys need complete Stripe test-mode
validation, and guest booking, bring-a-friend, and a full kiosk mode remain to
be added.

### Members and customer relationships

- Leads and members, households, notes, tasks, waivers, tags, lifecycle stages,
  assignments, and one combined activity timeline.
- Intro offers, referrals, loyalty, churn scoring, retention signals, and
  win-back foundations.
- Deals and pipelines for longer or higher-value sales journeys.

**Status:** built, but the product language needs simplifying. We must decide
whether deals and pipelines remain separate or become one clearer studio
acquisition journey.

### Payments, memberships, and sales

- Memberships, packs, drop-ins, pricing options, products, point of sale, gift
  cards, promo codes, account credit, invoices, recurring invoices, and payment
  links.
- Stripe Connect foundations, location-scoped accounts, refunds, disputes,
  reconciliation, bank-transfer settings, and failed-payment recovery.
- Recovery policies, customer payment-recovery links, staff ownership, delivery
  history, and safeguards against duplicate financial actions.

**Status:** built but approval-gated for live use. Complete test-mode checkout,
expiry, refund, dispute, failed-payment, and late-provider-response testing is a
launch requirement. Payroll should not yet be marketed as a complete product.

### Marketing, inbox, and automation

- Saved audiences, campaigns, templates, domains, email and SMS delivery queues,
  replies, inbox assignment, and customer context.
- Studio automation triggers and actions, reusable workflow templates,
  execution history, retries, and conversion events.
- Retention journeys covering failed payments, churn, referrals, renewals,
  bookings, attendance, and membership changes.

**Status:** the platform is built. Real sandbox email, SMS, mailbox, and calendar
accounts must be connected and validated. The next usability step is guided
templates that a non-technical studio owner can operate confidently. SMS reply
handling and delivery-status coverage also need completing before broader use.

### Websites, branding, forms, and embeds

- Branding and style controls, publication settings, public schedules, pricing,
  gift cards, forms, funnels, and reusable website widgets.
- Versioned publishing, preview/live separation, allowed website origins,
  consent-aware tracking, rollback controls, and analytics.
- Schedule, membership catalogue, instructor, appointment-launcher, form,
  intro-offer, event, and referral channel foundations.

**Status:** the publication foundation is built. Each advertised channel still
needs real website testing, clearer setup, and proof that preview, embed, and
live versions behave consistently. Funnel undo/redo, advanced form conditions,
payments, uploads and signatures, live domain/SSL checks, and a public retail
storefront are not yet complete.

### Analytics and reporting

- Studio dashboard, revenue, attendance, occupancy, utilization, churn,
  acquisition, funnel, campaign, automation, source, device, geography, and web
  performance reporting.
- Saved reports, filters, exports, data-health checks, and 26 reports backed by
  reliable current data. The QA plan names a wider future report catalogue, but
  unsupported reports deliberately fail closed rather than showing invented
  numbers.

**Status:** built and useful for testing. Before launch, the team must validate
metric definitions against real transactions, improve empty states and data
freshness, and remove dashboard chart warnings.

### Staff operations

- Team and instructor profiles, roles, availability, rotas, time logs,
  substitutions, documents, and payout settings.

**Status:** the operational foundation is built. Staff terminology and identity
should be unified, and payroll/accounting execution remains a later decision.

### Integrations and developer channels

- Organization/location-scoped connections for Stripe, Resend, SMS, Google,
  Microsoft, Cal.com, advertising platforms, Mindbody, Telegram, WhatsApp,
  Slack, Discord, OneDrive, webhooks, and API keys.
- Connection health, reconnection, subscriptions, retries, event history, and
  tenant-scoped public APIs.

**Status:** strong foundation, but many integrations require account-owner
setup and live sandbox validation. Connected accounts are deliberately scoped
per organization and location rather than treated as one global Aurea account.

## What must happen before commercial launch

### 1. Complete the full manual quality-assurance journey

Test all 286 checklist items in onboarding order on desktop and mobile, using a
disposable populated studio. Record failures, fix them, and repeat the critical
journeys until results are predictable.

### 2. Prove every money journey

Use a dedicated Stripe test Express account to test paid booking, memberships,
invoices, refunds, disputes, payment recovery, expired holds, waitlist payment,
and delayed provider responses. No payment state should be ambiguous or capable
of charging twice.

### 3. Prove messaging and connected accounts

Use sandbox email, SMS, mailbox, calendar, advertising, and Mindbody accounts.
Validate setup, health, reconnection, delivery, replies, suppression, retries,
webhooks, and failure recovery for the exact organization and location.

### 4. Simplify the product

Replace remaining agency/client/worker language with
studio/location/member/instructor language. Decide whether older CRM areas such
as clients, deals, pipelines, bookings, rotas, and requests should be renamed,
merged, hidden, or retained for a clear business purpose.

### 5. Polish the daily operator experience

Fix confusing empty states, dashboard chart warnings, mobile friction, dense
forms, duplicate routes, and unclear calls to action. A studio owner should not
need technical help to understand what to do next.

### 6. Finish launch operations

Complete environment setup, provider webhook secrets, monitoring, support
procedures, database migration housekeeping, reconciliation checks, privacy
operations, and an incident-response process before production onboarding.
Provision every required deployment security setting, reconcile historical
commerce and staff identity where approved, and complete a scalable privacy
request/export process.

## Recommended roadmap

### Phase 1: Pilot readiness

**Indicative duration:** 2-4 focused weeks, adjusted after the first complete QA
run.

**Business outcome:** the founders can demonstrate and operate the core product
without unexplained failures.

- Complete all critical onboarding, booking, payment, member, marketing, and
  reporting tests.
- Build a repeatable disposable pilot/demo studio.
- Validate Stripe, email, SMS, OAuth, Mindbody, and advertising in sandbox mode.
- Fix launch-blocking reliability, permission, mobile, accessibility, and
  usability issues.
- Confirm that every metric and financial status matches its source record.
- Improve high-volume tables, filtering, and bulk actions where pilot-scale data
  exposes performance or usability limits.

**Exit gate:** every critical journey passes on desktop and mobile with no
unexplained payment, delivery, permission, or cross-location issue.

### Phase 2: First studio pilots

**Indicative duration:** 4-8 weeks, overlapping with a small controlled pilot.

**Business outcome:** the first studios can onboard, publish, sell, communicate,
and report without developer assistance.

- Simplify terminology, navigation, and duplicate CRM concepts.
- Improve launchpad progress and guided setup.
- Package automation templates for first visit, trial conversion, failed
  payment, churn, referral, renewal, and missed booking.
- Add operational dashboards, alerts, and support runbooks.
- Validate pricing, packaging, onboarding support, and the minimum feature set
  with real pilot studios.

**Exit gate:** a new studio can publish its schedule, take a test payment, manage
a member, run a retention journey, and understand the dashboard independently.

### Phase 3: Growth and differentiation

**Indicative duration:** the following 1-2 quarters, chosen from pilot evidence.

**Business outcome:** Aurea measurably improves conversion, retention, and studio
revenue.

- Add guest booking and bring-a-friend.
- Add full kiosk and self-check-in operation.
- Improve trial-to-membership, referral, campaign, and workflow attribution.
- Add instructor and class profitability insights.
- Expand studio-owned widgets and public experiences.
- Add a public retail storefront, advanced form conditions, payment/upload/
  signature fields, and the highest-value workflow actions that are currently
  unavailable.
- Decide whether to build native paid appointments or retain Cal.com.
- Add Reserve with Google and ClassPass/Wellhub only where customer demand
  justifies the provider investment.

### Phase 4: Strategic expansion

**Timing:** only after the core platform shows reliable adoption and retention.

**Business outcome:** enter adjacent markets without weakening the core product.

Potential programs:

- Branded member progressive web app or native mobile app.
- On-demand video, community, and course products.
- Access-control and performance-device integrations.
- Workout programming and specialist wellness/clinical notes.
- Accounting and payroll execution.
- Marketplace and studio discovery.
- Broader AI-assisted outreach with clear approval and safety controls.

These are deliberately later because each is effectively a separate product.
Thin versions would increase support burden and make Aurea look more complete
than it can safely operate.

## What we should sell now, and what we should not promise yet

**Safe positioning for a controlled pilot**

- A unified studio operating platform for setup, schedules, members, payments,
  communication, automation, websites, and reporting.
- Multi-location and account-scoped operation designed to keep each studio's
  data and third-party accounts separate.
- A differentiated automation layer that connects activity to bookings,
  attendance, retention, and revenue.

**Do not promise as complete yet**

- Unrestricted production payments or messaging before sandbox validation.
- Native paid private appointments.
- Full payroll or accounting execution.
- Native mobile apps, community, course, or complete on-demand products.
- Live Reserve with Google, ClassPass/Wellhub, access-control, or device
  integrations until their full provider lifecycle is implemented.
- Autonomous AI outreach without explicit rules, approvals, and monitoring.
- A complete public retail store, advanced form payments/uploads/signatures, or
  full payroll execution until those end-to-end journeys are delivered.

## Business decisions required

1. **Launch customer:** which studio profile is the first ideal customer, and
   which workflows are mandatory for that profile?
2. **Sales journey:** keep deals and pipelines, or replace them with one simpler
   studio acquisition journey?
3. **Appointments:** retain Cal.com for private appointments or invest in native
   paid booking?
4. **Expansion priority:** partner channels, mobile experience, or on-demand
   content after the pilot?
5. **Staff operations:** keep rotas and requests separate or combine them into
   one instructor schedule?
6. **Finance boundary:** execute payroll/accounting eventually or integrate with
   established providers?
7. **Pilot gate:** how many studios and how much successful usage are required
   before wider launch?

## Success measures

For the pilot, track a small set of business outcomes rather than route counts:

- Time for a new studio to finish setup and publish its first schedule.
- Percentage of bookings and payments completed without staff intervention.
- Payment recovery rate and number of ambiguous financial cases.
- Campaign and automation conversions into bookings, visits, or memberships.
- Member retention, intro-offer conversion, and referral conversion.
- Number of support requests per studio and time to resolve them.
- Percentage of critical journeys passing desktop and mobile QA.
- Number of provider failures that are visible, owned, and recoverable.

## Recommended decision

Do not broaden the platform immediately. Finish Phase 1, simplify and pilot in
Phase 2, and use real studio evidence to choose Phase 3. Keep Phase 4 as a set of
separate investment decisions rather than treating it as unfinished launch
scope.
