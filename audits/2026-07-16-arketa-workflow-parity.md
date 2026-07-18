# Arketa workflow parity audit

- Date: 2026-07-16
- Source: `https://dashboard.arketa.com/dashboard/marketing/workflows`
- Scope: all active/inactive automation rows and all built-in playbook templates visible to the signed-in account
- Safety: read-only inspection; no saves, status changes, sends, or data mutations
- Discovery: two complete Active/Inactive list passes returned the same 10 active and 2 inactive automations

## Selector-complete builder audit

The builder audit did not stop at node titles or the text visible before opening
a sheet. Every populated node was opened, every sheet was captured, and every
native or custom Select was expanded and inventoried.

- Populated workflow builders inspected: 10
- Populated graph nodes inspected: 114
- Node detail sheets captured: 114
- Select controls expanded and recorded: 175
- Arketa mutations performed: 0

The selector inventory covered:

- Trigger type: all 27 available trigger options.
- Trigger resources: tenant forms, tags, pricing options, class scope, lifecycle
  stages, milestones, inactivity periods, and package/subscription timing where
  the chosen trigger exposes them.
- Email: sender identity and the variable picker available for that trigger.
- Tag: add/remove mode plus the tenant tag multi-select.
- Time delay: minutes, hours, and days.
- Conditional: client attributes, custom fields, tags, pricing options,
  booked/cancelled/attended reservations, on-demand viewing, email
  delivered/opened/clicked/bounced, and AND/OR groups.
- Variables: the trigger-sensitive client, reservation, class, location,
  instructor, pricing-option, calendar-link, and studio fields offered by
  Arketa.

The audit artifact records selector labels, current values, option text,
disabled state, selected state, and multi-select behavior. Tenant-specific
option names are evidence only and are not copied into Aurea runtime defaults.

## Inventory

| Status | Automation | Trigger | Observed graph | Aurea starter pattern |
| --- | --- | --- | --- | --- |
| Active | BXT Events | Client tag added | Email follow-up | Tag added: email follow-up |
| Active | BXT | Form submitted | Add tag | Form submission: add lead tag |
| Active | Remove First Timers | First class check-in | Condition, remove tag | First check-in: remove first-timer tag |
| Active | Remove ex client Automation | Class booked | Condition, remove tag | Class booked: remove former-client tag |
| Active | Level 1 | Class count milestone (2) | Add tag | Class count: level milestone |
| Active | Lead into PIP | Form submitted | Email/SMS nurture, waits, conversion checks, final tag | Form lead nurture journey |
| Active | Determine Off Peak | Pricing option purchased | Add tag | Pricing option purchased: add segment tag |
| Active | PIP - Journey | First class check-in | Branched waits, email/SMS, conditions, tag transitions | First class intro journey |
| Active | Inactive/Ex Clients | No recent activity (90 days) | Add tag | Client inactivity: add re-engagement tag |
| Active | PIP - Book First Class | Pricing option purchased | Onboarding tags, email/SMS reminders, waits and conditions | Intro purchase: book first class |
| Inactive | Untitled Automation | Pricing option purchased | No action | Draft: pricing purchase automation |
| Inactive | Untitled Automation | Form submitted | Placeholder tag | Draft: form review tag |

## Common product behavior

- Workflow list: Active/Inactive filters, search, status, name, updated date, enrollment count, conversion result, and create action.
- Trigger configuration: resource filters where relevant and a re-enrollment option.
- Graph actions: first-party client email, SMS, add/remove tag, wait, and yes/no conditions.
- Behavior settings: optional conversion goal and communication-hour restriction for outbound messages.
- Inactive rows remain editable and can be reactivated after review.

## Built-in playbook inventory

| Arketa playbook | Observed graph | Aurea template |
| --- | --- | --- |
| Welcome series | Client created, task, email, 7d, email, 24h, SMS, 24h, email | Playbook: new lead welcome series |
| New member welcome | Pricing purchase, SMS, 15d, email, 15d, email | Playbook: new membership welcome |
| Intro Offer to Membership | Pricing purchase, 5 emails, four waits, task | Playbook: intro offer to membership |
| Leave us a google review! | First-class milestone, SMS | Playbook: review request after first class |
| First visit follow up | Pricing purchase, task, four emails, SMS, five waits | Playbook: first purchase follow-up |
| Milestone - 1st Class Attended (SMS) | First check-in, SMS, 2d, email, 2d, SMS, 24h | Playbook: first class follow-up |
| Milestone - 10th visit | Class count 10, email | Playbook: 10-class milestone |
| Milestone - 25 classes | Class count 25, email | Playbook: 25-class milestone |
| Milestone - 50 visits | Class count 50, email | Playbook: 50-class milestone |
| Milestone - 100 classes attended | Class count 100, email, task due in 60m | Playbook: 100-class milestone |
| We Miss You | Inactivity, 3 emails, 2 SMS, five waits | Playbook: win-back sequence |
| Cancellation Flow | Membership cancelled, 2 emails, task, three waits | Playbook: membership cancellation follow-up |

Message content was rewritten as neutral editable copy. The reusable trigger/action/wait structure was preserved without copying proprietary content.

## Aurea implementation map

| Capability | Result |
| --- | --- |
| Form submitted | Added generic tenant-scoped trigger with optional form filter and durable pending/recovery dispatch |
| Pricing option purchased | Added generic tenant-scoped trigger driven by settled commerce records |
| Client inactivity | Added configurable scheduled trigger with stable occurrence keys and idempotent execution replay |
| Class/tag/check-in/milestone triggers | Added missing configuration dialogs and producer-side filtering |
| Client email | Added first-party `SEND_EMAIL` action through the durable delivery outbox with explicit marketing/transactional purpose and suppression enforcement |
| CRM task | Added tenant-scoped `CREATE_TASK` action with editable due time/priority, execution-node idempotency, current workflow-owner authorization, and atomic locked client/assignee validation |
| SMS | Added configuration dialog for client or direct-number delivery |
| Delayed client checks | Added exact tenant-scoped `clientId` filter to `FIND_CLIENTS` |
| Twelve observed patterns | Added neutral, editable starter templates installed inactive for review |
| Twelve built-in playbooks | Added a second neutral template pack preserving the observed trigger/action/wait graphs |
| Workflow operations UI | Replaced active and archived lists with server-paginated data tables and toolbars |
| Node detail sheets | Standardized the replicated sheets on the shared light/dark theme-aware sheet layout |
| Sheet Selects | Backed resource Selects with the active tenant's forms, tags, pricing options, lifecycle data, custom fields, and verified senders |
| Conditional editor | Replaced the raw expression-first form with guided Selects plus an explicit advanced-variable mode |
| Conditional graph | Uses one visible stem that splits into labelled True and False branches |

## Current capability boundary

The selector-complete comparison also identified product domains that must not
be represented by a cosmetic node before Aurea has a truthful event source:

- Chatbot message received requires a tenant-scoped public chatbot ingress.
- Checked out of appointment requires an actual appointment-completion
  operation or provider completion event.
- Watched on demand requires authenticated playback progress/engagement data.

These are recorded as platform capabilities, not disguised as aliases to
unrelated events. The remaining Arketa triggers map to Aurea event producers or
scheduled evaluators, including birthday, expiry, credit thresholds, class
booking/check-in, first-event filters, lifecycle changes, tags, forms,
settled purchases, cancellation, milestones, and inactivity.

## Generalization notes

- No Arketa account names, resource IDs, tags, pricing option IDs, or message copy are runtime constants.
- Templates are policy examples. Operators select tenant-owned forms, tags, pricing options, senders, and message content before activation.
- Activation remains guarded by Aurea's workflow readiness review instead of enabling imported behavior automatically.
- The twelve graph patterns are covered. Arketa's account-wide re-enrollment, conversion-reporting, and communication-hour controls are documented product settings rather than nodes in these starter graphs.

## Local installation result

- Target: local `aurea_crm_local`, organization `testing studio`, location `testing - Kensington`.
- Created: 12 archived workflow replicas and 12 archived reusable templates.
- Replica graphs: 118 nodes and 106 connections across the 12 archived
  workflow replicas, with no invalid endpoints.
- Exact large-journey checks: Lead into PIP is 25/24 nodes/connections,
  PIP - Journey is 57/56, and PIP - Book First Class is 16/15.
- Safety: no installed row is active; installation created no executions, messages, tasks, or provider calls.
- Existing data: all pre-existing workflow and template rows were preserved.
