# Demo Data Profiles

The demo population tool creates a coherent synthetic studio for product demos
and route QA. It is a tenant-scoped fixture system, not a database reset script.

## Safety contract

- Available automatically outside production. Production additionally requires
  `DEMO_DATA_ENABLED=true`.
- Requires an active organization and location plus the `demo.manage`
  capability. Owners and location agency/admin roles receive it by default.
- Requires the exact confirmation phrase shown in the dialog.
- Existing organization-level or location-level product data requires an
  additional explicit opt-in. Existing records are not changed or deleted,
  and other locations do not count as product data in the selected location.
- Uses a per-location advisory lock, active-run constraint, and idempotency key.
  One request either commits completely or keeps no fixture rows. An abandoned
  active run can be marked interrupted only after a 30-minute recovery window,
  with a second exact location confirmation. Recovery is audited and never
  deletes fixture data or resumes unknown work.
- Records every owned fixture in `DemoDataRecord` and every run in
  `DemoDataRun` with a fixed reference date and schema version.
- Never reads an environment provider credential, invokes a provider API,
  publishes a live domain, sends a message, or creates claimable async work.
- Synthetic email uses `.invalid`; provider accounts are disconnected and
  contain no secrets; campaigns, deliveries, SMS, inbox receipts, workflows,
  and executions are terminal, archived, disabled, or inert.
- It does not yet provide bulk deletion. A safe clear must reject unregistered
  user records that reference seeded parents before removing any registered
  row; until that dependency plan exists, use a dedicated demo organization
  and a disposable local/staging database when teardown is required.

## Profiles

| Area | Showcase | QA exhaustive |
| --- | ---: | ---: |
| Clients | 150 | 600 |
| Payments | 320 | 900 |
| Memberships | 110 | 420 |
| Historical class window | 790 days | 790 days |
| Future class window | 35 days | 70 days |
| Finance/marketing history | 26 months | 26 months |
| CRM deals | 48 | 180 |
| Staff rotas | 320 | 1,600 |
| Time logs | 220 | 2,400 |
| Instructor payouts | 24 | 70 |
| Campaign recipients | 72+ | 96+ |
| SMS records | 60 | 120 |
| Workflow executions | 48 | 96 |
| Form submissions | 80 | 180 |
| Ad-spend rows | 2,000+ | 2,000+ |
| Promo codes | 4 | 8 |
| Gift cards | 12 | 40 |
| Account credit balances | 24 | 100 |
| Account credit transactions | 52 | 217 |
| Waiver signatures | 45 | 220 |
| Room spots | 67 | 117 |
| Performance metrics | 60 | 300 |
| Private SOAP notes | 20 | 100 |

`Showcase` is sized for believable demonstrations without making common tables
unwieldy. `QA exhaustive` deliberately exceeds the 500-row report boundary and
common pagination thresholds.

## Coverage

The population run includes:

- Catalogue, rooms, services, instructors, pricing, access grants, inventory,
  memberships, credits, intro offers, bookings, check-ins, and waitlists.
- Clients across lifecycle/acquisition states, churn scores, households,
  assignments, loyalty, referrals, pipelines, deals, tasks, notes, and activity.
- Staff identity/directory records, availability, rotas, time off, swaps,
  overtime, time logs, payroll runs, payroll details, and instructor payments.
- Payments and line items, booking/payment attribution, commerce operations,
  ledger/tender rows, invoices, recurring invoices, reminders, reconciliation
  runs, and deliberately varied success/failure/refund/dispute states.
- Inert provider account/domain/config examples, templates, audiences,
  campaigns, inbox/SMS history, workflow graphs/executions, forms/submissions,
  publication versions, and ad spend.
- Promo codes, gift-card liabilities, account credit ledgers, cancellation
  policies/charges, dynamic pricing, internal payment-plan definitions,
  waivers, room layouts/spots, typed widgets with safe draft publication targets,
  draft sales channels/access control,
  draft marketplace listings, class substitutions, performance history,
  unpublished workout programmes, and private SOAP notes.

Typed widget fixtures use only active, non-system instructors and active,
public, visible memberships, matching the live publication runtime. Their
publication targets remain exact-scoped drafts with no domain, no selected
version, disabled consent, and localhost-only frame origins.

The fixtures are cross-linked so dashboards and reports can use real persisted
relationships rather than decorative totals. Money uses the organization
currency and decimal/minor-unit contracts; service dates anchor to the run's
reference date so future bookings never appear attended.

## Deliberate exclusions

Provider authorization, settlement batches, card-updater results, real OAuth
connections, real Stripe objects, secrets, live domains, and live sends cannot
be safely synthesized. Their report surfaces must show an explicit unsupported
or disconnected state rather than inferred rows. The current schema has no
truthful promo/gift-card transaction entity or payment-installment entity, so
the demo uses the supported redemption links, account-credit transactions, and
internal payment-plan definitions instead of inventing records. Video-on-demand
is excluded because the demo has no real media asset to publish.
