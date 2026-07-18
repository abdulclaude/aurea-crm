# Arketa node catalog and Aurea automation UX audit

Observed read-only on 2026-07-17 in the signed-in Arketa automation account and compared with the current Aurea node registry. No terminal save, activation, message send, or workflow creation was intentionally run.

## Safety note

Opening Arketa's `Email` builder option displayed an automatic `Saving...` state before any fields were entered. The audit stopped immediately and no compensating edit was attempted. An empty draft Email step may have been inserted into `PIP - Journey`; this should be reviewed by the account owner.

## Arketa surface inventory

### Trigger tab

Arketa groups 27 enrollment triggers into five business categories:

| Group | Triggers |
| --- | --- |
| Client events | New client added; New lead added; Milestone reached; Client tag added; Client transitioned to lifecycle stage; Upcoming birthday |
| Engagement | Chatbot message received; Form submitted; Subscribed to newsletter |
| Purchases and payments | Client purchased pricing option; Client used all pricing option credits; Subscription first payment succeeded; Package credits running low; Package expiring soon; Canceled subscription; Subscription expiring |
| Classes and appointments | Class booked; First class booked; First appointment booked; Checked into class; Checked into first class; Checked out of appointment; One hour before class; Class milestone at location |
| Retention | Client has made no recent bookings; Client has made no recent purchases; Client has made no recent purchases or bookings |

The tab also exposes a workflow-level `Re-enroll` switch. This is policy, not a node: it controls whether a client can enter the same automation again after completion.

### Behavior tab

Arketa keeps outcome and delivery policy outside the graph:

- Conversion goal: no goal, purchase, or booking, optionally scoped to a service/package.
- Communication hour restrictions: enabled/disabled plus start and end hour in the business timezone.

These are useful concepts. Aurea should model them as typed workflow settings rather than graph nodes, with execution-time timezone handling and reporting based on the same goal contract.

### Builder tab

Arketa exposes seven deliberately small action families:

1. Email
2. SMS
3. Task
4. Tag
5. Lifecycle stage
6. Time delay
7. Conditional

The graph cards summarize configured intent in plain language, such as `Wait 5 days`, `remove tag PIP`, `Send [message] to client`, or `Does the client fit the specified criteria?`. Conditional branches are labelled `Yes` and `No`.

### Playbooks

Observed playbooks cover welcome series, first visit follow-up, new member welcome, intro offer to membership, review requests, 1/10/25/50/100 visit milestones, win-back, and cancellation save. Aurea already has equivalent studio templates plus the replicated account workflows; the reusable opportunity is lifecycle coverage and measurable goals, not copying Arketa's wording.

## Product decisions

### Keep from Aurea

- Aurea's provider, CRM, AI, file, calendar, and reusable-workflow actions are substantially more powerful than Arketa's seven-action palette.
- Keep IF/ELSE, Switch, Loop, variables, nested workflows, wait, task, messaging, CRM updates, and provider actions.
- Keep the trigger and previous-step variable model. Future or disconnected nodes must never be selectable.
- Keep tenant-scoped resources referenced by stable IDs and revalidated at activation and execution.

### Improve now

- Make Condition a standard descriptive execution card with `Yes` and `No` outputs.
- Default to a guided sentence builder using trigger and previous-step fields; keep variables under an Advanced tab.
- Support `all`/`any`, multiple rows, typed text/number/boolean/date comparisons, field-to-field comparisons, and fail-closed missing variables.
- Normalize all 137 node detail surfaces onto semantic `bg-background`, `border-border`, and responsive sheet sizing.
- Put configured intent on every node card. Never show raw IDs or raw `{{variable.path}}` syntax when a label is known.

### Add next

| Foundation | Studio capability |
| --- | --- |
| Workflow policy | Re-enrollment rules; frequency caps; quiet hours; timezone; conversion goal; suppression/exclusion rules |
| Booking actions | Book, cancel, reschedule, join/remove waitlist, check in, mark no-show, restore credit |
| Membership actions/events | Create/assign, pause, resume, cancel, renew, plan change, overdue, credits low/exhausted/expiring |
| Payment lifecycle | Renewal, refund, chargeback, retry, comp/credit, recovery status |
| Task lifecycle | Assigned, due, overdue, completed triggers plus update/reassign/complete actions |
| First-class predicates | Has active membership; purchased pricing option; attendance count; booking recency; purchase recency; credits remaining; tag/lifecycle/form answers |
| Operations | Per-step validation, scoped resource revalidation, test run, version history, exception inbox, retry/replay, goal attribution |

### Remove or hide

- Do not copy Arketa's artificial seven-node ceiling; simplify Aurea with categories, search, favorites, and progressive disclosure instead.
- Hide unavailable or stub nodes from normal business-owner palettes until they have a complete executor, tenant checks, observable effects, and tests.
- Remove technical labels such as `Left Operand`, `Right Operand`, and `Variable Name` from default configuration paths.
- Do not allow arbitrary database/table selectors or hidden live lookups inside Condition. Use whitelisted workflow facts or an explicit scoped lookup step.
- Do not expose future, disconnected, or branch-conditional variables as if they were guaranteed.

## Security and reliability gates

Before expanding studio actions, harden existing `CALCULATE_CHURN_SCORE`, `AWARD_LOYALTY_POINTS`, and `SEND_CLASS_REMINDER` executors so every selected client/class is revalidated against the execution organization and location. Add a per-node configuration validator registry: workflow JSON acceptance and graph validation alone are not sufficient authorization.

Resource selector APIs must be capability checked, bounded/searchable, minimally projected, and scoped from authenticated context. Persist `{ kind, id, labelSnapshot }`, validate on save/activation/execution, and fail closed when a resource is deleted, moved, or inaccessible.

## Acceptance matrix

- Configuration A: attendance count is at least 3 AND membership is active.
- Configuration B: form source contains `referral` OR pricing option equals a selected plan.
- Legacy IF/ELSE nodes continue to route on existing `true`/`false` handle IDs.
- Missing or mistyped variables do not satisfy `is empty`.
- Mobile sheets never exceed the viewport; light and dark themes use the same semantic surface structure.
