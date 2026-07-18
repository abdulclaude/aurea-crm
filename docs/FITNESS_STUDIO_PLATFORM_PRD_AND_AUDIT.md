# Aurea Fitness Studio Platform PRD and Audit

Last reconciled against the current worktree: 2026-07-15

## 1. Purpose

Aurea should be a fitness studio operating system, not a generic agency CRM. The product should help a studio run classes, sell memberships, manage members and leads, coordinate instructors, automate retention, and understand growth.

The platform already contains a large amount of usable studio functionality. The main product risk is coherence: some routes, schema names, workflow nodes, settings, and role labels still come from the older agency/client/worker architecture. That makes the product feel less focused than the actual fitness-studio feature set deserves.

This PRD defines the target product, what exists today, what should be added, what should be removed or merged, what should be optimized, and how to QA every user-visible route group.

## 2. Audit Summary

I reviewed:

- App Router pages under `src/app`: 157 `page.tsx` files, represented by 156
  unique page URL patterns in the canonical route checklist.
- Main navigation in `src/components/sidebar/app-sidebar.tsx`.
- tRPC router aggregation in `src/trpc/routers/_app.ts`.
- Prisma model and enum inventory in `prisma/schema.prisma`.
- Dashboard widget data sources in `src/app/(dashboard)/(rest)/dashboard/page.tsx` and `src/features/studio/server/studio-dashboard-router.ts`.
- Embeddable widget settings in `src/app/(dashboard)/settings/widgets/page.tsx` and `src/features/studio/server/widgets-router.ts`.
- Safe studio demo data orchestration in `src/features/demo-data/server/router.ts`.
- Fitness terminology violations across schema, routes, components, and routers.
- Official competitor/product references from Mindbody, Arketa, Momence, Mariana Tek, Walla, Glofox, and WellnessLiving to anchor the product benchmark.

Current state:

- Studio class scheduling, rooms, spots, memberships, check-in, instructor substitutions, payroll, public schedule, member portal, campaigns, SMS, intro offers, referrals, loyalty, churn, reports, and workflow automation are present.
- The dashboard is mostly connected to studio-native tables: `StudioClass`, `StudioBooking`, `CheckIn`, `StudioMembership`, `StudioPayment`, `ClassWaitlist`, and `ChurnRiskScore`.
- The codebase still contains heavy agency/client/worker terminology in schema and code paths: `Subaccount`, `SubaccountMemberRole.AGENCY`, `Worker`, `WorkerDocument`, `WorkerAvailability`, `PayrollRunWorker`, `WorkerPayment`, `/clients`, `getClients`, `createAgency`, `Agency Owner`, `All clients`, and `Client acquisition`.
- Several generic SaaS/agency routes are still exposed or present: `/clients`, `/deals`, `/pipelines`, `/bookings`, `/bookings/event-types`, `/rotas`, `/requests`, `/credentials`, and `/webhooks`.
- Schedule, membership-catalog, instructor-gallery, and free Cal.com appointment widgets now use exact organization/location scope, immutable publication versions, explicit allowed website origins, and dedicated typed renderers. Appointment widgets launch only the exact location-bound Cal.com account and never perform native booking or payment mutation.

## 3. Product Positioning

Aurea is for boutique and multi-location fitness studios:

- Yoga studios.
- Pilates studios.
- Reformer studios.
- Spin studios.
- HIIT and strength studios.
- Barre and hybrid class studios.
- Wellness studios that rely on recurring memberships, class packs, drop-ins, intros, trials, referrals, and instructor-led schedules.

Primary promise:

Run the full member lifecycle from first inquiry to loyal recurring member.

Secondary promise:

Give studio operators automation and insight without forcing them into a generic sales CRM.

## 3.1 Competitor Benchmark

The product target should be "Mindbody breadth with Arketa/Momence modernity and stronger automation attribution." Aurea should not copy competitor complexity. It should cover the table-stakes studio workflows while making setup, member conversion, automation, and reporting clearer than legacy platforms.

Sources reviewed:

- [Mindbody fitness software](https://www.mindbodyonline.com/business/fitness) and [Mindbody scheduling](https://www.mindbodyonline.com/en-gb/business/scheduling).
- [Arketa platform overview](https://help.arketa.com/getting-started/welcome), [membership and loyalty](https://www.arketa.com/features/membership-loyalty), [AI assistant](https://www.arketa.com/features/arketa-ai), [branded mobile app](https://help.arketa.com/website-app/app/overview), and [on-demand video](https://help.arketa.com/on-demand/overview).
- [Momence studio software](https://momence.com/studio), [Momence funnels](https://help.momence.com/en/articles/9764461-funnels), and [Momence sequence FAQ](https://help.momence.com/en/articles/12030801-sequences-faq-s).
- [Mariana Tek fitness studio software](https://www.marianatek.com/fitness-studio-software/).
- [Walla run your studio](https://www.hellowalla.com/solutions/manage), [studio management](https://www.hellowalla.com/features/studio-management), and [multi-location](https://www.hellowalla.com/features/multi-location).
- [Glofox fitness management](https://www.glofox.com/fitness-management-software-revenue-2049/) and [Glofox gym management](https://www.glofox.com/business-types/gym-management-software/).
- [WellnessLiving fitness software](https://www.wellnessliving.com/fitness/software/) and [WellnessLiving product overview](https://www.wellnessliving.com/).

Competitive table stakes:

- Class, appointment, event, and course scheduling from one calendar.
- Online booking, branded website widgets, branded mobile app, and public schedule.
- Memberships, class packs, drop-ins, trials, intro offers, promo codes, referrals, loyalty, and gift cards.
- POS, saved payment methods, autopay, failed-payment recovery, invoices, refunds, and clear revenue reporting.
- Check-in desk, self-check-in, QR/tablet kiosk, waitlists, guest booking, and book-a-spot.
- Room, equipment, reformer, mat, bike, and spot layouts for boutique studios.
- Instructor management, permissions, availability, substitutions, time logs, payroll, and instructor app/business app workflows.
- Marketing automation through email, SMS, push, forms, ads, lead capture, retargeting, and win-back campaigns.
- Lead-to-intro-to-member funnels, intro-offer conversion reporting, referral funnels, renewal funnels, and inactive-member win-back funnels.
- On-demand video library with categories, collections, rentals, membership-gated access, and branded app access.
- Multi-location dashboards with location-level permissions, plan rules, reporting, and bank/payment views.
- Marketplace/discovery and partner channels such as Mindbody app, Reserve with Google, ClassPass, Gympass/Wellhub, Google reviews, Meta lead ads, and Google/Meta conversion tracking.
- Real-time reporting for revenue, plan gain/loss, first-visit conversion, new membership growth, capacity, retention, churn, and campaign ROI.

Competitor-specific implications:

- Mindbody sets the breadth baseline: scheduling, booking, payments, marketing, staff management, reporting, business app, branded app, self-check-in, and marketplace discovery. Aurea needs comparable breadth, but should avoid feeling like a generic all-industry suite.
- Arketa sets the modern boutique benchmark: beautiful booking, branded website/app experiences, on-demand content, referrals, loyalty, intro offers, marketing automations, conversion tracking, and AI-assisted client messaging. Aurea should match these flows before over-investing in generic CRM depth.
- Momence is a direct benchmark for funnels and sequences. Its funnel model explicitly tracks lead -> intro purchase -> first booking -> membership purchase -> next booking, plus win-back, referral, membership lead conversion, and renewal funnels. Aurea's automation event table and conversion reporting should be shaped around these journeys.
- Mariana Tek is the strongest benchmark for boutique in-studio experience: pick-a-spot, book-a-guest, spot swapping, self check-in, automated no-show/late-cancel fees, app-driven upsells, and real-time performance reporting. Aurea's room visualizer and class detail roster should evolve toward this level of operational polish.
- Walla reinforces the product direction away from generic CRM: front-desk clarity, automated sub management, expiring-plan and failed-payment visibility, class capacity rates, multi-location permissions, plan gain/loss reporting, branded app, self check-in, and real-time performance insight.
- Glofox and WellnessLiving reinforce the need for a branded member app, member self-service, automated billing, rewards, marketing automation, reporting, access control, and a clean app/web portal experience.

Competitive differentiator for Aurea:

- Studio-native automation attribution should be the wedge. Competitors offer automations and funnels, but Aurea should make every automation measurable: sent, opened/clicked where available, booked, checked in, intro redeemed, membership purchased, retained, churn risk reduced, revenue generated, and member lifetime value affected.
- The workflow builder should become a guided studio automation system rather than a blank generic node editor. Users should start from proven templates, then customize conditions and actions.
- The room/spot visualizer can become a differentiator if it accurately models mats, reformers, bikes, strength stations, capacity, spot booking, and studio-like layouts.
- The product should keep studio owners in their own brand, similar to Arketa/Mariana Tek/Walla, rather than pushing members into an Aurea-branded marketplace unless marketplace/discovery is intentionally added later.

## 4. Core Personas

Studio owner:

- Wants revenue, retention, membership growth, instructor utilization, class fill rates, churn risk, and automation ROI.
- Needs quick answers: what is full, what is underperforming, who is at risk, what campaigns converted, what needs action today.

Front desk or studio manager:

- Manages bookings, check-ins, waivers, member records, households, payments, memberships, waitlists, gift cards, and intro offer redemptions.
- Needs fast data tables, search, row selection, bulk actions, and fewer disconnected routes.

Instructor:

- Needs schedule, class rosters, substitutions, earnings, time logs, documents, availability, and payouts.
- Should never see agency/client wording.

Member or lead:

- Books classes, joins waitlists, redeems intro offers, manages memberships, signs waivers, checks household details, and receives messages.
- Should see a polished studio experience, not internal CRM vocabulary.

## 5. Existing Feature Inventory

Studio operations:

- Launchpad setup for rooms, class types, instructors, memberships, and first class.
- Studio schedule and class list.
- Class detail roster with booking, approval, no-show, late-cancel, and bulk actions.
- Class types.
- Rooms and spots, including the customizable 3D studio visualizer.
- Check-in desk.
- Waitlist support through class waitlists and automation hooks.
- Mindbody import/sync.
- Public schedule and embeddable schedule.

Member CRM:

- Contacts with member and lead tabs.
- Contact tags.
- Acquisition stages.
- Households and family accounts.
- Notes and tasks.
- Waivers.
- Inbox conversations and SMS messages.
- Member portal token route.

Revenue:

- Membership plans and active member memberships.
- Studio payments.
- POS.
- Gift cards.
- Add-ons.
- Invoices, recurring invoices, templates, payment links, and public invoice pages.
- Stripe membership/payment webhooks.
- Instructor payout settings and payroll.

Marketing and retention:

- Campaigns, templates, and sending domains.
- SMS queue/provider configuration.
- Intro offers and redemptions.
- Referral programs.
- Loyalty programs, rewards, balances, and transactions.
- Churn risk dashboard.
- Retention automations including birthday logic.
- Funnel builder and form builder.

Automation:

- Workflow builder.
- Execution history and execution detail.
- Workflow templates for studio use cases.
- Automation events table and conversion/event tracking foundation.
- Studio trigger/action nodes for class bookings, cancellations, check-ins, no-shows, memberships, waitlists, intro offers, class reminders, loyalty points, churn scores, and SMS.

Reporting:

- Main dashboard with draggable stats, charts, and bottom widgets.
- Analytics route.
- Reports route with visual charts and revenue forecast.
- Revenue route.
- Churn risk route.
- Funnel analytics subtree.

Settings and administration:

- Workspace/profile/branding/settings modules.
- Payment and billing settings.
- Notifications.
- Members and invites.
- Widgets.
- Developer and webhook settings.
- Cal.com integration settings.

Public and API surfaces:

- Public landing/schedule/funnel/invoice routes.
- Embed schedule.
- API v1 routes for classes, bookings, instructors, members, and memberships.
- Webhook routes for Inngest, Stripe, Cal.com, Google, Gmail, Outlook, OneDrive, Resend, Telegram, tracking, and unsubscribe.

## 6. Product Requirements

### 6.1 Studio Dashboard

The dashboard must answer:

- How many active memberships do we have?
- How many classes are running today?
- How many members checked in today?
- How many visits happened this month?
- What is revenue over time?
- Which revenue categories are growing?
- Which membership plans are most used?
- Which classes are full, underfilled, or waitlisted?
- Which members are at risk?
- Which automations produced bookings, signups, redemptions, and membership conversions?

Required improvements:

- Add conversion widgets from the dedicated automation/event table.
- Add trial-to-member, intro-to-member, referral-to-member, and inquiry-to-active conversion cards.
- Add campaign/workflow attribution widgets.
- Add class type utilization and instructor utilization widgets.
- Make empty states point to the exact setup route that fixes the missing data.
- Add plan gain/loss reporting and first-visit conversion metrics, because these are common studio-owner decision points in Walla, Mariana Tek, and Momence-style products.

### 6.2 Member Lifecycle

The member record should become the center of the platform.

Required lifecycle stages:

- Inquiry.
- Trial booked.
- Trial attended.
- Intro offer active.
- Intro offer completed.
- Active member.
- Paused.
- At risk.
- Churned.
- Former member.

Required member data:

- Contact details.
- Birthday month/day.
- Lead source.
- Acquisition stage.
- Tags and segments.
- Household links.
- Membership status.
- Visit count and streak.
- Last visit.
- Upcoming bookings.
- Intro offer status.
- Referral source/code.
- Waiver status.
- Payment status.
- Automation events and workflow touches.
- Funnel position: lead captured, intro purchased, first class booked, first class attended, membership purchased, next class booked, inactive/win-back.

### 6.3 Scheduling and Attendance

Required scheduling behaviors:

- Create and edit classes.
- Assign class type, room, instructor, capacity, and spot layout.
- Book members.
- Manage waitlist.
- Bulk approve, no-show, and late-cancel bookings.
- Check in from class roster and check-in desk.
- Support recurring classes.
- Support substitutions from the instructor cancellation path.
- Ensure public schedule and embedded schedule show the same canonical class availability.
- Support guest booking and bring-a-friend flows.
- Support self check-in and QR/tablet check-in without front-desk bottlenecks.
- Support automated no-show and late-cancel fees tied to policy settings and payment records.

### 6.4 Memberships and Revenue

Required revenue behaviors:

- Create plans: unlimited, class pack, drop-in, trial, intro offer, annual, and custom.
- Track active memberships separately from plan definitions.
- Support gift cards and promo codes.
- Support POS for front-desk transactions.
- Support add-ons as attachable purchase items, not a separate ambiguous product area.
- Track payments from memberships, POS, gift cards, add-ons, invoices, intro offers, and class packs through one canonical payment ledger.
- Add payment plans and installment support as a medium-priority feature.
- Add failed-payment recovery and saved-card update flows.
- Add app/web upsell paths for water, rentals, add-ons, intro upgrades, and membership upgrades.

### 6.5 Marketing and Retention

Required marketing behaviors:

- Segment members and leads by tags, lifecycle, class count, plan, intro status, last visit, birthday, referral source, and churn risk.
- Send SMS and email campaigns.
- Trigger workflows from member milestones.
- Provide starter workflow templates.
- Track campaign and workflow conversion outcomes.
- Support conversion pixels/events for Meta and Google.
- Support lead forms from ads and website widgets.
- Support automated Google review/reputation flows after positive experiences.

Required starter workflow templates:

- Birthday message with optional offer.
- First class booked reminder.
- First class completed follow-up.
- No-show recovery.
- Intro offer day 1 welcome.
- Intro offer halfway check-in.
- Intro offer completion conversion push.
- Five-class milestone celebration.
- Ten-class loyalty reward.
- Membership expiring renewal reminder.
- Payment failed recovery.
- At-risk member win-back.
- Referral reward notification.
- Waitlist promoted notification.

### 6.6 Automation Platform

The workflow builder should stay, but it must feel studio-native.

Studio-native triggers:

- Birthday.
- Class booked.
- Class cancelled.
- Member checked in.
- Member no-showed.
- Membership created.
- Membership expiring.
- Membership cancelled.
- Waitlist spot opened.
- Intro offer redeemed.
- Intro offer completed.
- Member reached class count.
- Member tag added.
- Member tag removed.
- Member lifecycle stage changed.
- Member churn score crossed threshold.
- Payment failed.
- Payment succeeded.

Studio-native actions:

- Send SMS.
- Send email.
- Add or remove member tag.
- Update lifecycle stage.
- Award loyalty points.
- Create task.
- Create note.
- Create offer/redemption.
- Calculate churn score.
- Send class reminder.
- Notify instructor/substitute.
- Log automation conversion event.

Studio-native conditions:

- Has tag.
- Does not have tag.
- Class count greater than or equal to a number.
- Last visit older than a number of days.
- Intro offer redeemed.
- Intro offer completed.
- Membership status equals value.
- Churn risk equals or exceeds value.
- Has active booking.
- Has signed waiver.
- Has household role.

### 6.7 Widgets and Embeds

Current widget settings should evolve into first-class public widgets.

Required widget types:

- Schedule widget.
- Booking widget.
- Membership plans widget.
- Instructor gallery widget.
- Intro offer widget.
- Lead capture form widget.
- On-demand library widget.
- Event/course widget.
- Referral/bring-a-friend widget.

Required fixes:

- Keep publication-backed URLs type-specific; raw widget IDs must never be public runtime URLs.
- Add typed embed routes for every supported `WidgetType`.
- Store exact allowed website origins in each immutable widget version and enforce them with `frame-ancestors`; wildcard origins are not supported.
- Before origin enforcement reaches an environment with legacy published widgets, configure origins and republish them. Legacy snapshots intentionally fail closed.
- Respect `WidgetConfigSchema` fields in the rendered widget: colors, fonts, radius, prices, instructors, max days ahead, and class type filters.
- Add preview per widget.
- Track widget view, start, booking, signup, and purchase events in the conversion/event table.

## 7. Terminology Audit

The platform is not terminology-clean yet.

High-priority terminology violations:

- `Agency` remains in role labels, server procedure names, comments, copy, and organization member constants.
- `Client` remains in `/clients`, `getClients`, `clients-table`, `Client acquisition`, invoice copy, assistant copy, and multi-location filtering copy.
- `Subaccount` remains throughout schema, context, server routers, member roles, and route logic.
- `Worker` remains in Prisma model names, payroll models, availability, time logs, instructor routes, instructor profile variables, and payout models.
- Generic CRM language remains in `Deal`, `Deals`, `Pipeline`, and `Pipelines`.
- Generic booking/Cal.com language remains in `/bookings`, `/bookings/event-types`, `BookingEventType`, and Cal.com settings.
- `Rotas` and `Requests` remain as standalone concepts, even though the product should center on instructor schedules, substitutions, and time-off.

Target vocabulary:

- Agency -> Studio group, workspace, or business.
- Client workspace -> Studio location.
- Client, when referring to a person -> Member or lead.
- Subaccount -> Location.
- Worker -> Instructor.
- Worker document -> Instructor document.
- Worker availability -> Instructor availability.
- Worker payment -> Instructor payout/payment.
- Payroll worker -> Payroll instructor.
- Deals -> Acquisition opportunities or member opportunities, only if still needed.
- Pipelines -> Acquisition pipeline or lifecycle pipeline.
- Rotas -> Instructor schedule.
- Requests -> Time-off and coverage requests.
- Event types -> Appointment types only if private appointments remain; otherwise class types.
- Generic bookings -> Appointment bookings, not class bookings.

Schema migration target:

- `Worker` should become `Instructor`.
- `WorkerDocument` should become `InstructorDocument`.
- `WorkerAvailability` should become `InstructorAvailability`.
- `WorkerPayment` should become `InstructorPayment` or `InstructorPayout`.
- `PayrollRunWorker` should become `PayrollRunInstructor`.
- `Subaccount` should become `Location`.
- `SubaccountMember` should become `LocationMember`.
- `SubaccountMemberRole.AGENCY` should be replaced with a studio-native role, likely `STUDIO_TEAM`.
- `Deal` and `Pipeline` should be renamed only if the product keeps them. If they only duplicate acquisition stages, remove or hide them.

Migration approach:

1. Clean user-facing copy first: sidebar, headers, tabs, filters, empty states, settings labels, assistant prompt, invite/member roles, invoice labels, and route metadata.
2. Add route aliases and redirects: `/locations` for `/clients`, `/member-acquisition` for `/acquisition`, `/instructor-schedule` for `/rotas` if kept.
3. Rename internal router/component APIs in small slices: organizations clients -> locations, workers -> instructors, all-clients scope -> all-locations scope.
4. Rename Prisma models using `@@map` and field `@map` first so generated client names can become studio-native without immediately renaming physical DB tables.
5. Update migrations and generated Prisma client.
6. Remove old aliases after route analytics show no usage.

Acceptance criteria:

- No user-facing page copy says agency, client workspace, all clients, workers, subaccount, rotas, deals, or pipelines unless that feature has been explicitly kept and renamed for studio context.
- Schema no longer exposes `Worker` or `Subaccount` as Prisma model names.
- Third-party protocol terms such as OAuth `client_id`, `client_secret`, and Mindbody API `Client` are isolated inside integration adapters and never appear in product UI.
- `rg` checks are documented and run before release.

## 8. Route Audit and QA Guide

This section lists the route groups a user can visit and what should be tested. It avoids a table so QA can follow it as a walkthrough.

### Foundation, Auth, and Onboarding

Routes:

- `/`
- `/login`
- `/sign-up`
- `/invitation/[id]`
- `/onboarding/studio`
- `/onboarding/preview`
- `/dashboard`

QA:

- Create a new studio from onboarding and confirm it lands in `/dashboard`.
- Confirm onboarding copy says studio/workspace, not agency/client.
- Confirm account switcher shows studio or location names, not client labels.
- Confirm dashboard loads both with and without seeded data.
- Confirm instructor users see the instructor dashboard instead of admin dashboard.

Relationship:

- Onboarding creates the organization/workspace context that powers every authenticated route.
- Dashboard depends on studio setup data: rooms, class types, instructors, classes, memberships, payments, check-ins, waitlists, and churn scores.

### Launchpad

Routes:

- `/launchpad`
- `/launchpad/rooms`
- `/launchpad/class-types`
- `/launchpad/instructors`
- `/launchpad/memberships`
- `/launchpad/first-class`

QA:

- Start from a blank studio and complete each setup step.
- Confirm each step updates the launchpad progress ring.
- Confirm "Go back" copy does not include old studio/client phrasing.
- Confirm each step creates records used by the main studio routes.

Relationship:

- Launchpad is the setup funnel for `/studio/rooms`, `/studio/class-types`, `/instructors`, `/studio/memberships`, and `/studio/classes`.

### Studio Schedule and Class Operations

Routes:

- `/studio/schedule`
- `/studio/classes`
- `/studio/classes/[classId]`
- `/studio/class-types`
- `/studio/rooms`
- `/studio/check-in`
- `/studio/substitutions`
- `/studio/import`
- `/studio/mindbody`

QA:

- Create a class type, room, instructor, and class, then confirm the class appears on schedule, class list, public schedule, dashboard schedule widget, and check-in route.
- Open class detail and book a member through the select flow.
- Select multiple roster rows and test bulk approve, no-show, and late-cancel actions.
- Confirm headers are not uppercase where recent polish requested normal labels.
- Confirm check-in columns are Member, Streak, Visits, Booked, Status, Action.
- Confirm the percentage-full indicator matches booked/capacity.
- In rooms, change layout type, capacity, equipment, row count, spacing, and theme, then confirm the 3D view reflects the saved layout.
- Create a substitution request and confirm it appears in substitutions, related instructor views, and notifications if configured.
- Import data and verify imported class types, members, classes, bookings, and memberships map to the correct studio-native tables.

Relationship:

- These routes are the operational core. They drive dashboard widgets, public schedule, check-ins, attendance automation triggers, waitlists, instructor schedules, and reporting.

### Member CRM and Lifecycle

Routes:

- `/contacts`
- `/contacts/new`
- `/households`
- `/households/new`
- `/acquisition`
- `/tasks`
- `/waivers`
- `/inbox`
- `/member-portal/[token]`

QA:

- Create a lead from `/contacts/new` with acquisition stage, source, birthday fields, tags, and contact details.
- Confirm `/contacts` member and lead tabs filter fields contextually.
- Convert a lead through inquiry, trial, intro offer, and active member stages.
- Create a household, assign parent/child roles, and verify household details appear on the related contacts.
- Create tasks and notes tied to members/leads.
- Send or receive an inbox/SMS message and confirm conversation context links back to the member.
- Sign a waiver and confirm waiver status appears where relevant.
- Open a member portal token and confirm member-facing copy is not CRM/internal language.

Relationship:

- Member records connect memberships, bookings, check-ins, waivers, inbox, households, loyalty, referrals, churn, automations, and reports.

### Revenue and Commerce

Routes:

- `/studio/memberships`
- `/studio/pos`
- `/studio/gift-cards`
- `/studio/add-ons`
- `/revenue`
- `/invoices`
- `/invoices/recurring`
- `/invoices/templates`
- `/invoices/view/[invoiceId]`
- `/invoices/pay/[invoiceId]`

QA:

- Create membership plans and active member memberships.
- Confirm the memberships route has separate current plans and active members tabs.
- Create a POS sale and verify it writes to `StudioPayment` and appears in revenue widgets.
- Create, issue, redeem, and void gift cards.
- Create add-ons and verify they attach to the right commerce flow.
- Generate invoices, recurring invoices, and templates.
- Pay public invoice links and verify payment status updates.
- Confirm all money displays use the configured currency and no floating-point artifacts.

Relationship:

- Revenue routes should feed dashboard revenue, reports, forecasts, payment automation triggers, membership status, churn risk, and member profile history.

### Instructor and Team Operations

Routes:

- `/instructors`
- `/instructors/[instructorId]`
- `/my-schedule`
- `/my-classes`
- `/my-earnings`
- `/time-logs`
- `/time-logs/clock-in`
- `/time-logs/timesheet`
- `/payroll`
- `/requests`
- `/rotas`
- `/instructor-signup`

QA:

- Create an instructor and confirm they appear in schedules, classes, payroll, substitutions, and public class displays.
- Open an instructor detail route and verify Page Tabs are used for profile, schedule, classes, documents, availability, earnings, and payouts.
- Confirm detail routes use "Go back", not old "Go back to studio/client" wording.
- Confirm schedule is full-width and not nested inside cards.
- Clock in with manual and QR flows; the QR form previously had a `useFormContext` crash and should be retested.
- Generate payroll from approved time logs and confirm labels say instructors, not workers.
- Validate `/requests` and `/rotas`: these should likely be merged into substitutions, time-off, and schedule, or renamed if retained.

Relationship:

- Instructor data powers class schedules, substitutions, payroll, time logs, instructor portal, public schedule, and instructor-specific dashboard.

### Marketing, Retention, and Growth

Routes:

- `/campaigns`
- `/campaigns/new`
- `/campaigns/[id]`
- `/campaigns/domains`
- `/campaigns/templates`
- `/sms`
- `/intro-offers`
- `/referrals`
- `/loyalty`
- `/churn`
- `/funnels`
- `/funnels/[funnelId]/editor`
- `/builder/forms`
- `/builder/forms/[id]/editor`
- `/builder/forms/[id]/submissions`
- `/builder/library`
- `/builder/library/[id]`

QA:

- Create an SMS config and send a message. Confirm status moves from queued to sent/failed with provider details.
- Create campaign templates and campaigns, then test recipient segmentation.
- Create intro offers and redeem them for leads/members.
- Create referral and loyalty programs; verify rewards, balances, and transactions.
- Trigger churn score calculations and confirm churn dashboard recommendations.
- Build a form/funnel, publish it, submit it, and confirm the lead/contact is created with source and acquisition stage.
- Confirm all growth routes talk about members, leads, studios, and offers, not clients/agencies.

Relationship:

- These routes feed acquisition, member lifecycle, automations, conversion analytics, and dashboards.

### Automation

Routes:

- `/workflows`
- `/workflows/[workflowId]`
- `/executions`
- `/executions/[executionId]`
- `/credentials`
- `/webhooks/new`
- `/webhooks/[webhookId]`

QA:

- Create workflows from starter templates.
- Test each studio trigger: birthday, class booked, class cancelled, check-in, no-show, membership created, membership expiring, membership cancelled, waitlist spot opened, and intro offer redeemed.
- Test key actions: send SMS, send class reminder, award loyalty points, calculate churn score, create/update member, add/remove tags, create task, and log conversion event.
- Confirm executions show node-by-node status, output, errors, and related automation events.
- Confirm conversion/event stats can be filtered by workflow, event type, and outcome.
- Decide whether `/credentials` and `/webhooks` remain top-level automation routes or move under Settings > Developer.

Relationship:

- Automation consumes events from studio operations, member lifecycle, revenue, and marketing. It should also write back conversion events for reporting.

### Reporting and Analytics

Routes:

- `/analytics`
- `/reports`
- `/revenue`
- `/churn`
- `/funnels/[funnelId]/analytics`
- `/funnels/[funnelId]/analytics/ads`
- `/funnels/[funnelId]/analytics/devices`
- `/funnels/[funnelId]/analytics/events`
- `/funnels/[funnelId]/analytics/funnel`
- `/funnels/[funnelId]/analytics/geography`
- `/funnels/[funnelId]/analytics/performance`
- `/funnels/[funnelId]/analytics/realtime`
- `/funnels/[funnelId]/analytics/sessions`
- `/funnels/[funnelId]/analytics/sources`
- `/funnels/[funnelId]/analytics/utm`
- `/funnels/[funnelId]/analytics/visitors`
- `/funnels/[funnelId]/analytics/visitors/[anonymousId]`
- `/funnels/[funnelId]/analytics/web-vitals`

QA:

- Verify each dashboard/report chart has seeded and empty-state behavior.
- Compare dashboard totals against underlying data tables: classes, check-ins, memberships, and payments.
- Confirm revenue forecast uses active memberships and renewal dates, not only historical payments.
- Confirm funnel analytics are clearly separated from studio reporting unless they are being used for acquisition funnels.
- Confirm analytics copy does not mention agency vs client behavior.

Relationship:

- Reporting pulls from the operational records created across classes, members, payments, campaigns, funnels, automation events, and check-ins.

### Settings

Routes:

- `/settings/profile`
- `/settings/workspace`
- `/settings/branding`
- `/settings/members`
- `/settings/modules`
- `/settings/notifications`
- `/settings/apps`
- `/settings/credentials`
- `/settings/developer`
- `/settings/webhooks`
- `/settings/widgets`
- `/settings/payments`
- `/settings/studio-billing`
- `/settings/billing`
- `/settings/bank-transfer`
- `/settings/dunning`
- `/settings/instructor-payouts`
- `/settings/bookings/calendar`
- `/settings/integrations/calcom`
- `/settings/styles`

QA:

- Confirm all settings labels match studio terminology.
- Confirm members/invites do not show agency roles.
- Confirm widgets can create, preview, and copy the correct embed route per widget type.
- Confirm developer/webhook/credentials pages are hidden from users who should not use them.
- Confirm Cal.com settings are either repositioned as private appointments or hidden if the studio class system is canonical.

Relationship:

- Settings control platform setup, payments, integrations, widgets, branding, notifications, and roles.

### Public, Preview, Embed, and API Routes

Routes:

- `/schedule/[slug]`
- `/member-portal/[token]`
- `/embed/schedule`
- `/preview/f/[funnelId]/[slug]`
- `/f/[funnelId]/[slug]`
- `/[slug]`
- `/unsubscribe`
- `/api/v1/classes`
- `/api/v1/bookings`
- `/api/v1/instructors`
- `/api/v1/members`
- `/api/v1/memberships`

QA:

- Open public schedule by studio slug and confirm availability matches internal schedule.
- Confirm raw widget IDs and organization-only legacy embed inputs fail closed.
- Confirm unsupported widget types do not show schedule accidentally.
- Submit a public funnel/form and confirm contact creation, source, acquisition stage, and conversion event.
- Use API keys to fetch classes, members, instructors, bookings, and memberships; verify scopes are enforced.
- Confirm public pages never expose internal IDs or admin-only language beyond what is necessary.

Relationship:

- These routes are the outside-facing surface: members, leads, websites, embeds, and external integrations depend on them.

## 9. Routes to Remove, Merge, or Reposition

Remove or hide:

- `/clients`: replace with `/locations` if multi-location management remains. Never call locations clients.
- `/rotas`: merge into `/studio/schedule` or rename to instructor schedule if there is unique availability/shift functionality.
- `/requests`: merge into `/studio/substitutions` and instructor time-off, or rename to `/instructors/requests`.
- `/deals`: hide unless reworked into member acquisition opportunities.
- `/pipelines`: hide unless reworked into acquisition pipeline setup.
- `/bookings` and `/bookings/event-types`: hide unless private appointments remain separate from class bookings.
- `/credentials` and `/webhooks`: move under Settings > Developer for most users.

Keep but rename/reframe:

- `/acquisition`: rename navigation from Client acquisition to Member acquisition.
- `/funnels`: keep as acquisition landing pages and conversion funnels, not generic web funnels.
- `/builder/forms`: keep as lead capture and member forms.
- `/campaigns`: keep as member campaigns.
- `/invoices`: keep if studio billing/invoicing is a real workflow.
- `/studio/add-ons`: keep only if add-ons are tied into POS/memberships. Otherwise merge into POS products.

## 10. Dashboard and Widget Data Audit

Current dashboard data sources:

- Active memberships: `StudioMembership` with `status = ACTIVE`.
- Classes today: `StudioClass` between start and end of current day.
- Check-ins today/month: `CheckIn`.
- Visits over time: `CheckIn.checkedInAt`.
- Memberships over time: `StudioMembership.createdAt`.
- Occupancy: `StudioClass` with booking counts and capacity.
- Plan breakdown: active `StudioMembership` grouped by `planId`.
- Recent activity: recent `StudioBooking`, `CheckIn`, and `StudioMembership`.
- Today schedule: `StudioClass` with `classType`, `instructor`, booking count, and check-in count.
- Revenue: `StudioPayment` with `status = SUCCEEDED` and `deletedAt = null`.
- ARPM: 30-day revenue divided by active memberships.
- No-show rate: `StudioBooking.status = NO_SHOW`.
- Utilization: booked seats divided by summed scheduled class capacity.
- Churn rate: cancelled/expired memberships in period divided by estimated start-of-period active members.
- At-risk members: active members with no check-ins in 14 days and memberships expiring soon.
- Waitlist demand: upcoming scheduled classes with waiting `ClassWaitlist` entries.

Data risks:

- Historical active-membership comparison is approximate because it uses creation date rather than a true historical snapshot.
- Churn rate is approximate and should eventually use membership lifecycle events.
- Revenue widgets are only complete if every commerce surface writes to `StudioPayment`.
- Occupancy and utilization should exclude cancelled, rejected, no-show, and late-cancelled bookings consistently.
- At-risk logic should combine recent visits, failed payments, churn scores, membership status, and open tasks.
- Schedule, membership-catalog, instructor-gallery, and free appointment widgets have typed public renderers. Source or provider-account drift fails closed and the CRM suppresses stale embed controls until republished.

Required analytics additions:

- Automation conversion widgets.
- Enrollment/signup widgets.
- Intro offer conversion widgets.
- Referral conversion widgets.
- Campaign attribution.
- Trial-to-active conversion.
- Lead source performance.
- Revenue by acquisition source.
- Instructor utilization and revenue contribution.
- Class type fill trend.

## 11. Optimization Backlog

Status note, reconciled 2026-07-15: this section is the older fitness-product
backlog, not an additional set of Arketa priority blocks. The current Arketa
roadmap has four blocks: P0-P2 are delivered for the retained scope and P3 is a
deliberate defer. Items below are marked by current disposition so delivered
work is not mistaken for remaining work.

P0 before serious QA:

- Pending: finish the internal agency/client/worker terminology and schema
  migration. User-facing studio terminology is already substantially migrated.
- Design native paid appointment booking as a separate V2 with an expiring slot hold, idempotent public receipt, and exact location Stripe Connect Express destination charge. The shipped V1 remains a read-only Cal.com launcher.
- Pending product decision: consolidate or rename `/clients`, `/deals`,
  `/pipelines`, `/bookings`, `/bookings/event-types`, `/rotas`, and `/requests`.
- Delivered for the retained workflow scope: first-class studio triggers/actions,
  capability and provider-readiness checks, and automation conversion reporting.
  Live third-party validation remains account-owner test work.
- Delivered: rollback-only SHOWCASE and QA_EXHAUSTIVE profiles cover 128 owned
  record types and leave no committed rows.
- Delivered: committed source comments contain no unresolved `TODO` or `FIXME`
  markers; task-status enum values named `TODO` remain valid product data.

P1:

- Delivered: exact-scope multi-location operation, consolidated member timeline,
  payment-plan/installment configuration, failed-payment recovery, dynamic
  pricing configuration, automated no-show/late-cancel fees, public paid class
  booking, widget publication/preview foundations, and capability-based roles.
- Pending provider lifecycle: Reserve with Google and
  ClassPass/Gympass/Wellhub. Stored integration configuration is not represented
  as a live sync, subscription, reconciliation, or operational health contract.
- Pending retained product work: guest/bring-a-friend and a full self check-in
  kiosk mode.
- Deferred with P3: branded native/white-label member apps and a full on-demand
  video suite. These require separate trustworthy product contracts rather than
  route shells.

P2:

- Deferred with P3: access-control providers, heart-rate/performance ingestion,
  workout programming, SOAP-note clinical/privacy lifecycles, and a discovery
  marketplace. Aurea has scoped configuration/data foundations for these, but
  does not advertise them as complete provider/runtime products.

## 12. Data and Schema Cleanup Plan

Immediate cleanup:

- Rename user-facing copy and route labels.
- Add route redirects/aliases before deleting old routes.
- Update seed comments and demo data labels from Workers to Instructors.
- Replace `scope="agency"` and `scope="all-clients"` props with studio-native names.
- Rename `activeClient` local variables to `activeLocation`.
- Rename `getClients` UI usage to `getLocations` through a backwards-compatible alias.

Schema cleanup:

- Introduce `Instructor` Prisma model name mapped to the current worker table.
- Introduce `Location` Prisma model name mapped to the current subaccount table.
- Rename relation fields from `worker` to `instructor` where the domain is instructional.
- Rename payroll and availability models to instructor equivalents.
- Replace `SubaccountMemberRole.AGENCY` with `STUDIO_TEAM`.
- Revisit `Deal` and `Pipeline`; either migrate to acquisition-specific names or remove in favor of contact acquisition stages.

Generated-client risk:

- The project currently uses both `@prisma/client` and custom generated Prisma output in places. The undefined enum runtime errors seen earlier are a warning sign. The migration should standardize enum imports and generated client usage before broad schema renames.

## 13. Success Metrics

Activation:

- New studio can complete launchpad in under 15 minutes.
- First public schedule can be embedded without support.
- First member can be booked and checked in in under 2 minutes.

Growth:

- Inquiry-to-trial conversion rate.
- Trial-to-intro conversion rate.
- Intro-to-membership conversion rate.
- Referral-to-member conversion rate.
- Campaign-to-booking conversion rate.
- Workflow-attributed conversions.

Retention:

- Visit frequency.
- No-show rate.
- Late-cancel rate.
- Churn risk distribution.
- Win-back conversion.
- Membership renewal rate.

Revenue:

- Monthly recurring revenue.
- Revenue per active member.
- Plan mix.
- POS revenue.
- Gift card liability/redeem rate.
- Instructor payout ratio.
- Class profitability.

Operations:

- Class utilization.
- Waitlist pressure.
- Instructor utilization.
- Check-in throughput.
- Substitution fill rate.
- Payment failure recovery rate.

## 14. Recommended Next Implementation Order

1. Terminology pass in UI and route labels: agency/client/worker -> studio/location/member/instructor.
2. Widget expansion: add typed intro-offer, form, referral, event, and on-demand contracts on the publication-backed schedule, appointment, membership, and instructor foundation.
3. Route consolidation: hide or redirect `/clients`, `/rotas`, `/requests`, `/bookings`, `/bookings/event-types`, `/deals`, and `/pipelines` according to product decisions.
4. Automation conversion widgets and reporting.
5. Workflow condition nodes for class-count, intro-offer completion, tags, churn threshold, and membership state.
6. Schema model rename phase with `@@map`/`@map`.
7. Route-by-route QA using this guide, seeded data, and build checks.

## 15. Open Product Decisions

- Should multi-location management remain? If yes, the route should be `/locations`, not `/clients`.
- Should deals/pipelines survive as acquisition opportunities, or should acquisition stages on `Contact` be the only sales funnel?
- Should Cal.com/private appointment bookings remain? If yes, they need studio wording and a clear difference from class bookings.
- Should rotas remain as instructor shift scheduling, or should all schedules live under `/studio/schedule` plus instructor-specific tabs?
- Should requests include time-off requests, or should `/studio/substitutions` be the only coverage workflow?
- Should add-ons be sold independently, attached to memberships, or only available inside POS?
- Should Aurea build native branded mobile apps, a branded PWA, or both?
- Should marketplace/discovery be a first-party Aurea channel, or should Aurea prioritize Reserve with Google, ClassPass/Gympass/Wellhub, and studio-owned channels first?
- Should on-demand video move up to P1 to match Arketa, Momence, and Mariana Tek parity?

## 16. Competitor Parity Roadmap

Phase 1: Studio OS parity.

- Match the operational baseline: schedule, booking, check-in, waitlists, memberships, payments, POS, refunds, gift cards, intro offers, referrals, loyalty, instructor scheduling, substitutions, payroll, reporting, and public/member booking.
- Clean the product language so everything says studio, location, member, lead, and instructor.
- Make every core table searchable, filterable, bulk-actionable, and fast.

Phase 2: Modern growth parity.

- Build Momence-style funnels: lead-to-customer, class intro, appointment intro, referral, win-back, membership lead conversion, and membership renewal.
- Build Arketa-style automations around intro offers, referrals, loyalty, no-shows, late cancels, birthdays, first class, and membership conversion.
- Add Meta/Google conversion events, lead form ingestion, UTM tracking, and source-level revenue reporting.
- Make automation conversion stats first-class in `/executions`, `/analytics`, and `/reports`.

Phase 3: Branded member experience parity.

- Add a branded member app/PWA plan that supports schedule, bookings, account management, memberships, payments, intro offers, referrals, loyalty, gift cards, push notifications, and on-demand content.
- Expand widgets to cover schedule, booking, memberships, intro offers, forms, instructor gallery, events/courses, on-demand content, and referrals.
- Add member self-check-in and front-desk kiosk mode.

Phase 4: Boutique studio differentiation.

- Evolve rooms/spots into Mariana Tek-level pick-a-spot: mats, reformers, bikes, benches, stations, guest spots, spot holds, spot swaps, room themes, and equipment constraints.
- Add automated no-show and late-cancel fee collection.
- Add dynamic pricing for excess inventory, early-bird offers, peak pricing, and waitlist pressure.
- Add in-class upsells: rentals, water, towels, merch, guest passes, and intro-to-membership offers.

Phase 5: Expansion and ecosystem.

- Add multi-location dashboards, plan/location rules, location-level bank/payment reporting, permissions, and roll-up analytics.
- Add Reserve with Google and ClassPass/Gympass/Wellhub integrations.
- Add access control/door integrations and performance-tracking integrations.
- Add marketplace/discovery only when the owned-brand experience is mature enough that the marketplace does not dilute the studio brand.
