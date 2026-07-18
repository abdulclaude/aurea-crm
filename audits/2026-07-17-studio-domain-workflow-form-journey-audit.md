# Studio Domain, Workflow, and Forms Journey Audit

Date: 2026-07-17

## Product verdict

Aurea's core studio records are connected at the data layer, but the navigation
and automation editor do not yet explain those relationships as one business
journey. A studio owner can create services, pricing, classes, bookings, and
memberships, but must understand internal concepts and identifiers to automate
them. The product is therefore capable but not yet self-serve for complex work.

The target is progressive disclosure:

- Simple mode uses studio language, recipes, and resource selectors.
- Advanced mode exposes variables, conditions, graph control, and HTTP tools.
- Both modes save the same typed workflow graph.
- No trigger or action is selectable until its producer or side effect is real.

## Authoritative studio graph

| Business concept     | Canonical model            | Connects to                                                        | Current owner experience                                                    |
| -------------------- | -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Service              | `ServiceType`              | category, optional class type, default rooms/instructors           | Correct foundation; defaults and downstream navigation are incomplete       |
| Scheduled occurrence | `StudioClass`              | service, class type, instructor, room, capacity, pricing, waitlist | Creation is well linked; calendar/list/series navigation is fragmented      |
| Recurring schedule   | `ClassSeries`              | service, class type, room, generated occurrences                   | Created indirectly; difficult to discover or edit as a first-class object   |
| Pricing option       | `PricingOption`            | membership plan and access grants                                  | Strong access model; backing membership plan leaks as a separate concept    |
| Access policy        | `PricingOptionAccessGrant` | all services, service, category, class type, or product            | Powerful API; creation UI exposes less than the persisted model             |
| Booking              | `StudioBooking`            | member and class occurrence                                        | Booking/cancellation/check-in paths exist and emit several events           |
| Membership           | `StudioMembership`         | member and backing plan                                            | Operational actions are missing from client and workflow surfaces           |
| Form                 | `Form`                     | steps, fields, submissions, optional workflow                      | Hidden in navigation; editing/publishing and automation semantics are split |

## What links correctly today

1. Class creation selects scoped service, class type, instructor, and room.
   Selecting a service copies its operational defaults into the occurrence.
2. Recurring creation persists a series and links generated occurrences.
3. Pricing access evaluation checks the booked class's service, category, and
   class type against pricing option access grants.
4. Booking, cancellation, check-in, no-show, waitlist-opened, membership,
   payment, intro-offer, referral, form, and inactivity producers exist for a
   meaningful subset of the workflow triggers.
5. Published form submission dispatch is scoped and idempotent within each of
   its two dispatch mechanisms.

## Trust failures

### Advertised but nonfunctional nodes

- Birthday and membership-expiring triggers have no event producer or evaluator.
- Send class reminder does not send a message.
- Award loyalty points and calculate churn score are selectable without a
  complete user-configurable side effect.
- Starter templates referenced these nodes, making a broken recipe look ready.

These nodes are now unavailable and templates containing them are filtered out.
They should return only after producer/executor integration tests prove the full
path from domain event to execution result.

### Raw resource identifiers

- Form submitted asked for a form UUID.
- Pricing option purchased asked for comma-separated UUIDs.
- Class booked asks for a class UUID or exact free-text name.
- Most studio triggers expose no service/category/pricing/member filter at all.

Form and pricing triggers now use scoped system selectors. The remaining nodes
need a shared `StudioResourcePicker` rather than one-off dialog implementations.

### Output contracts did not match producers

- Waitlist help advertised nested client/class records and `spotsAvailable`, but
  the producer emits `waitlistId`, `clientId`, and `classId`.
- Studio payment help advertised top-level payment fields, but the producer emits
  a nested `payment` record.
- Membership cancellation help advertised enriched plan/member data not emitted
  by the cancellation producer.

The known examples are corrected. All remaining outputs need producer-derived
contract tests before they are shown as variables.

### Form control plane is split

- Forms existed at `/builder/forms` but had no direct sidebar destination.
- Preview was a no-op.
- Publish called a deliberately retired mutation and always failed.
- Publication state and form status can disagree.
- A form can directly link one workflow while matching form-trigger workflows
  also run, allowing invisible duplicate automation.
- Native submissions do not resolve a CRM member, while templates assume a
  `clientId` may exist.

Forms now have a direct Marketing navigation item and the editor routes users to
Responses and the real Publication control plane. Canonical submission dispatch,
member matching, and a manual review path now share one visible response flow.
Field editing and richer consent/conditional controls remain product work.

## Arketa comparison

Arketa's advantage is not deeper logic. It is a clearer business mental model:

- Classes, private appointments, events, and categories are visible schedule
  views rather than graph concepts.
- Service type rows lead to recurring series, then occurrences.
- Schedule filters use instructors, locations, services, and categories.
- Pricing options expose direct purchase links as a first-class outcome.
- Forms and automations are neighboring Marketing destinations.
- Automation triggers are grouped by Client, Engagement, Purchases,
  Classes/Appointments, and Retention.
- Trigger and action cards describe the business sentence they represent.
- Re-enrollment, quiet hours, and goals are workflow behavior, not fake nodes.

Aurea should adopt this organization and language, but keep its more powerful
graph, reusable variables, branching, and provider actions in Advanced mode.

## Keep, improve, add, remove

### Keep

- Typed graph execution, branching, variables, reusable bundles, and templates.
- Service-to-class defaults and pricing access grants.
- Schedule calendar, attendance, waitlist, booking, and payment event producers.
- One trigger per workflow and activation readiness checks.

### Improve

- Make Service the business-facing offering. Treat Class Type as optional
  advanced taxonomy and ensure it can be configured on the service.
- Add `Calendar | List | Series` navigation in one schedule context.
- Hide the backing membership plan behind Pricing Option.
- Put resource labels and links on every configured trigger/action card.
- Put `Used by N workflows` and `Create automation` on service, class, series,
  pricing option, form, and member detail surfaces.
- Group the studio node selector by business outcome rather than a flat list.
- Add workflow-level Behavior for re-enrollment, frequency caps, timezone,
  quiet hours, suppression, and conversion goals.

### Add

- Shared capability-checked resource pickers for form, service, category, class,
  series, pricing option, membership, member, and workflow.
- Booking actions: book, cancel, reschedule, check in, mark no-show.
- Waitlist actions: join, remove, promote, expire offer.
- Membership actions: assign, pause, resume, change, cancel, adjust credits.
- Payment actions: retry, refund, credit, and notify with approval boundaries.
- Resource lifecycle triggers: class/series changed, capacity threshold,
  credits low/exhausted/expiring, membership renewed/paused/payment retry.
- Recipe-first workflow creation for welcome, first visit, no-show, expiring
  credits, cancellation, win-back, and lead nurture.
- Form field inspector, preview, conditional UI, CRM mapping, consent, and a
  single visible After submission section.

### Remove or hide until real

- Nodes without a producer, usable executor, and activation contract.
- Raw ID inputs from default studio workflows.
- A separate business-facing Membership Plan setup concept.
- Broken preview/publish controls and duplicate invisible dispatch semantics.
- Technical repair/backfill controls from primary studio-owner pages.

## Navigation recommendation

1. **Schedule**: Calendar, List, Series; create/edit occurrences and recurring
   schedules from the same context.
2. **Services**: services with defaults, access, upcoming schedule, and linked
   automations. Categories/class types live under an Advanced taxonomy view.
3. **Pricing**: pricing option detail owns access, sales channels, buy page,
   subscribers, Stripe health, and automations.
4. **Members**: member detail owns bookings, memberships, credits, forms,
   messages, and lifecycle automations.
5. **Marketing**: Forms and Funnels are distinct neighboring destinations.
6. **Automations**: Recipes first, Blank workflow second; Studio resources are
   selected by name, with variables and graph primitives available in Advanced.

## Delivery sequence

### Phase 1: truth and discoverability

- Hide nonfunctional nodes and recipes.
- Add default variable names and real resource selectors.
- Correct output examples from actual producer payloads.
- Expose Forms and route publishing to the canonical control plane.
- Add activation validation for every typed studio node configuration.

### Phase 2: unified studio control plane

- Consolidate schedule navigation and service inheritance.
- Put edit/access/subscriber/automation surfaces on Pricing Option.
- Add resource backlinks and `Create automation` entry points.
- Fix exact organization, location, and capability validation for associations.

### Phase 3: complete domain automation

- Implement the missing booking, waitlist, membership, credit, and payment
  actions with idempotency and execution observability.
- Add producer-backed lifecycle triggers and a registry test that prevents UI
  availability without a producer.
- Build sentence-driven trigger filters over shared resource pickers.

### Phase 4: simple and advanced authoring

- Recipe wizard generates the same graph used by the advanced editor.
- Behavior tab owns enrollment policy, timing, suppression, and goals.
- Form conditions and IF/ELSE use the same typed condition builder.
- Variables default to prior-node outputs; system selectors deliberately fetch
  tenant resources when the condition or action needs a current system record.

## Variable decision

Variables should primarily reference trigger data and outputs from previous
nodes. This preserves deterministic execution and makes data lineage explainable.
They should not be the only way to choose business records.

Use a system Select when configuration means a stable resource, such as a
service, pricing option, form, class series, tag, or pipeline. Use variables when
the record is produced or discovered during the workflow, such as the member who
submitted a form or the class returned by a lookup. Advanced users may switch a
resource field from Select to variable input, but the default must remain the
named system object and activation must revalidate its scope.

## Implementation progress

### Connected studio control plane

- Schedule, class list, and class series now share one segmented local
  navigation control.
- Schedule and class series can be filtered by a named Service from the URL,
  making resource links stable and shareable.
- Service rows lead to their recurring series, linked-class counts lead to the
  filtered calendar, and actions expose both destinations.
- Services can now own an optional reporting type. New class occurrences inherit
  the persisted `classTypeId`, so reporting and pricing-access classification no
  longer has to be selected again for every class.
- Category and reporting-type references are validated against the exact active
  organization and location before a Service can save them.

### Resource-aware automation entry

- Class booked no longer asks for an exact class ID or free-text class name.
  Owners choose any class or one or more named Services.
- Booking dispatch includes the occurrence's Service ID and applies the selected
  Service filters before enrolling a workflow.
- A Service action can create a booking automation. The server revalidates the
  Service in the current tenant and creates the workflow with a configured
  `CLASS_BOOKED_TRIGGER`, label snapshots, and a default output variable.
- A single class date and a recurring class series now expose the same booking
  automation entry point. Exact class and series filters are carried in the
  trigger contract, revalidated in the current workspace, and described by name
  on the workflow canvas.
- Generic starter and trigger-matching tests cover two materially different
  services and preserve backward compatibility for existing exact-class rules.
- Pricing Option actions can now start a purchase automation with the selected
  option already configured on the trigger. The same typed starter contract is
  covered for recurring membership and one-time intro-offer examples.
- Technical membership backfill has been removed from the primary Pricing page;
  the compatibility mutation remains available for controlled migration work.
- Pricing access grants, workflow starters, and archive operations now revalidate
  the exact active organization and location instead of organization alone.

### Forms and response automation

- Forms now use the same full-width DataTable and toolbar language as the other
  operational lists, with search, status filters, sorting, column controls, and
  direct response links.
- Each Form exposes a Create response automation action. The server validates
  the exact workspace and creates a configured `FORM_SUBMITTED_TRIGGER` with a
  human-readable form label and default response variable.
- Newly published form snapshots deliberately clear the legacy direct workflow
  pointer. One canonical form-trigger dispatcher now owns new response
  automation, preventing a linked workflow and a trigger workflow from both
  enrolling on the same response. Legacy immutable published versions retain
  their recorded behavior until republished.

### Truthful class actions

- The editor now exposes one business-facing Attendance and waitlist action
  instead of separate technical nodes. Owners choose check-in, no-show, add to
  waitlist, or remove from waitlist in the same detail sheet.
- Class and member fields default to workflow data for event-driven recipes, but
  each can switch independently to a searchable, named studio resource. Saved
  labels make the canvas sentence explain what the action will do.
- The executor rechecks `attendance.manage` or `schedule.manage`, requires an
  exact location-scoped workflow, and revalidates both resources during the
  transactional domain action.
- Check-in and waitlist operations return the already-satisfied result when
  retried, preventing duplicate attendance increments or repeated waitlist
  changes.
- No-show actions only accept a scoped active booking after the class has ended.
  They reuse the studio cancellation-policy ledger, so fee and credit effects
  remain idempotent and the detail sheet warns owners before they enable it.
- Booking and cancellation are deliberately not exposed through this node yet.
  Booking can create a payment hold and cancellation can advance the waitlist;
  both require durable action receipts and explicit commerce behavior before
  they are safe workflow actions.

### Form-to-member resolution

- Form owners can map named email, phone, and name fields to the CRM without
  writing variables or copying field IDs. Advanced policies remain available as
  simple switches for phone fallback, member creation, and filling empty data.
- Each submission snapshots the published matching policy so later form edits
  cannot silently change how an already submitted response is interpreted.
- Matching is location-scoped, normalizes email/phone, serializes concurrent
  create attempts, and never picks arbitrarily when multiple members match.
- Ambiguous or failed matches pause form-trigger automations. The Responses
  table explains the state, lets an owner choose the correct named member, then
  safely requeues the waiting automation.
- Member creation only uses explicitly mapped identity fields. Health answers
  and other sensitive form values are not copied into the CRM by default.

### Workflow behavior

- The editor now has a Behavior sheet with a deliberately small enrollment
  choice: every matching event or only once per member.
- Once-per-member is enforced transactionally when an execution is claimed. A
  tenant-scoped enrollment ledger resolves concurrent events, and later events
  appear in execution history as Skipped instead of disappearing silently.
- Events without a member identity continue normally. Quiet hours, frequency
  windows, conversion goals, and suppression remain hidden until their runtime
  enforcement and observability are implemented.

## Verification

- `npm test`: 636 tests across 118 suites passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, including all 143 generated routes.
- Desktop browser checks covered Services, Schedule, Class Series, class detail,
  Pricing Option automations, Forms, Workflows, Archives, the condition sheet,
  and the Behavior sheet.
- Mobile browser checks covered the Workflows and Archives data tables at
  390 by 844, including a visible empty state and horizontally scrollable rows.
- Migrations `0072_form_member_resolution.sql` and
  `0073_workflow_enrollment_behavior.sql` are required before the new form
  resolution and enrollment behavior can run against an existing database.
  They were not applied during this audit because the connected database
  environment was not explicitly approved for mutation.
