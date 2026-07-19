# Aurea Third-Party Technology Cost Report

**Stakeholder planning report**

**As of:** 18 July 2026  
**Commercial assumption:** £500 per Studio location per month, **excluding VAT**  
**Planning FX:** USD 1 = GBP 0.75  
**Status:** planning model, not a vendor quote or audited forecast

## 1. Executive conclusion

The model supports four distinct conclusions:

1. **Core platform software is not the main unit-economics risk.** In the base case, shared hosting, database, durable jobs, storage, observability, analytics and commercial maps cost £20.03 per location at 100 locations.
2. **Managed communications must be sold as a funded usage add-on.** At base usage, Resend and Twilio cost £52.05 per location at 100 locations. Aurea already records a communications usage ledger, but no current code posts those customer charges to Stripe invoices or meters. The model therefore shows both unrecovered current COGS and a target customer charge.
3. **The current Stripe Connect funds flow is not £0 to Aurea.** The code uses destination charges. Stripe therefore debits Aurea for processing fees and exposes the platform to refunds, disputes and negative balances. Direct charges are the recommended target for a SaaS relationship in which the Studio is the merchant and fee payer.
4. **Several apparent free tiers are not production-appropriate.** Inngest Pro is required before the first Studio because the code creates approximately 219,720 scheduled function runs and at least **602,880 executions** per month after statically observable steps and the minutely delivery dispatch path. Vercel and production PostgreSQL are modelled on commercial paid plans. UploadThing is paid when private/regional documents are enabled. Sentry can only be forecast after production sampling and privacy controls are fixed.

The headline metric in this report is **technology contribution margin**, not accounting gross margin. It excludes payroll, customer support, implementation, insurance, compliance, legal, accounting and other people/operating costs.

## 2. Headline base-case economics

| Locations | Net SaaS revenue | Core software | Managed comms COGS | Stripe SaaS collection | Current tech cost | Current technology margin | Target comms charge | After-offset margin |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | £495 | £154 | £64 | £9 | £227 | 54.1% | £88 | 60.7% |
| 10 | £4,950 | £180 | £511 | £92 | £783 | 84.2% | £702 | 85.9% |
| 25 | £12,375 | £462 | £1,324 | £231 | £2,017 | 83.7% | £1,818 | 85.5% |
| 50 | £24,750 | £972 | £2,625 | £462 | £4,059 | 83.6% | £3,606 | 85.4% |
| 100 | £49,500 | £2,003 | £5,205 | £924 | £8,132 | 83.6% | £7,150 | 85.4% |
| 250 | £123,750 | £4,671 | £12,845 | £2,310 | £19,826 | 84% | £17,644 | 85.7% |
| 500 | £247,500 | £8,823 | £25,665 | £4,620 | £39,108 | 84.2% | £35,254 | 85.9% |
| 1,000 | £495,000 | £17,140 | £51,307 | £9,240 | £77,687 | 84.3% | £70,476 | 86% |

Interpretation:

- Net SaaS revenue is £500 per location less the base 1% planning allowance for failed collections, credits and bad debt.
- Stripe collection assumes each £500 net invoice becomes £600 including 20% VAT, with 80% Bacs Direct Debit and 20% UK cards, plus Stripe Billing PAYG at 0.7%.
- “Current tech cost” includes communications provider COGS but **no communications add-on revenue**, because cash collection is not implemented.
- “Target comms charge” prices provider COGS to produce a 25% add-on contribution margin after a 2.2% collection allowance. It is a commercial target, not current revenue.
- Quote-required scenarios retain a numerical planning placeholder, but their confidence is low and they must not be used as contractual commitments.

## 3. Low, base and high range at every location count

Every customer count has three independent usage profiles. The model does not assume that a larger Studio necessarily has higher intensity, and it does not conflate location count with maturity.

| Locations | Monthly tech cost: Low / Base / High | Technology margin: Low / Base / High | Cost/location: Low / Base / High |
| ---: | ---: | ---: | ---: |
| 1 | £153 / £227 / £360 | 69.3% / 54.1% / 25.7% | £153 / £227 / £360 |
| 10 | £374 / £783 / £2,428 | 92.5% / 84.2% / 49.9% | £37 / £78 / £243 |
| 25 | £767 / £2,017 / £6,185 | 93.8% / 83.7% / 49% | £31 / £81 / £247 |
| 50 | £1,407 / £4,059 / £12,074 | 94.3% / 83.6% / 50.2% | £28 / £81 / £241 |
| 100 | £2,812 / £8,132 / £23,710 | 94.3% / 83.6% / 51.1% | £28 / £81 / £237 |
| 250 | £7,023 / £19,826 / £58,325 | 94.4% / 84% / 51.9% | £28 / £79 / £233 |
| 500 | £14,030 / £39,108 / £116,010 | 94.4% / 84.2% / 52.2% | £28 / £78 / £232 |
| 1,000 | £27,824 / £77,687 / £230,883 | 94.4% / 84.3% / 52.4% | £28 / £78 / £231 |

### Usage cases

| Driver per location/month | Low | Base | High |
| --- | ---: | ---: | ---: |
| Active members | 300 | 750 | 1,500 |
| App/API requests | 150,000 | 500,000 | 1,500,000 |
| Customer workflow runs | 2,000 | 10,000 | 25,000 |
| Durable steps per run | 3 | 5 | 7 |
| Product analytics events | 10,000 | 40,000 | 100,000 |
| Redis commands | 50,000 | 200,000 | 750,000 |
| Sentry errors / spans / replays | 100 / 25k / 25 | 500 / 100k / 100 | 2,000 / 500k / 300 |
| Transactional emails | 1,000 | 6,000 | 15,000 |
| Outbound SMS segments | 250 | 1,000 | 3,000 |
| Inbound SMS segments | 50 | 200 | 500 |
| Voice minutes | 25 | 100 | 300 |
| Private storage | 1 GB | 2 GB | 10 GB |
| Map loads | 1,000 | 3,000 | 10,000 |
| Forecast headroom | 10% | 20% | 30% |
| Bad debt/credits | 0.5% | 1.0% | 3.0% |

## 4. Application-by-application base-case cost

| Application | 1 loc | 10 loc | 25 loc | 50 loc | 100 loc | 250 loc | 500 loc | 1,000 loc |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Vercel | £15 | £15 | £49 | £131 | £279 | £749 | £1,617 | £3,353 |
| Database | £38 | £41 | £75 | £76 | £122 | £238 | £455 | £1,004 |
| Inngest | £74 | £89 | £134 | £208 | £356 | £802 | £1,544 | £3,029 |
| UploadThing | £8 | £8 | £8 | £19 | £19 | £40 | £76 | £148 |
| Upstash | £0 | £4 | £9 | £18 | £187 | £243 | £335 | £521 |
| Sentry | £20 | £24 | £31 | £46 | £82 | £243 | £436 | £821 |
| PostHog | £0 | £0 | £8 | £48 | £110 | £295 | £571 | £1,102 |
| Commercial maps | £0 | £0 | £150 | £428 | £848 | £2,063 | £3,788 | £7,163 |
| Core subtotal | **£154** | **£180** | **£462** | **£972** | **£2,003** | **£4,671** | **£8,823** | **£17,140** |
| Resend | £15 | £22 | £101 | £180 | £315 | £619 | £1,213 | £2,403 |
| Twilio | £49 | £489 | £1,223 | £2,445 | £4,890 | £12,226 | £24,452 | £48,904 |
| Communications subtotal | **£64** | **£511** | **£1,324** | **£2,625** | **£5,205** | **£12,845** | **£25,665** | **£51,307** |
| Stripe SaaS collection | £9 | £92 | £231 | £462 | £924 | £2,310 | £4,620 | £9,240 |
| Total technology cost | **£227** | **£783** | **£2,017** | **£4,059** | **£8,132** | **£19,826** | **£39,108** | **£77,687** |

### 4.1 Vercel

- **Status:** live central platform cost.
- **Plan rule:** Pro from launch because Aurea is commercial. Hobby is not a production assumption.
- **Model driver:** developer seats, requests, active CPU, memory and transfer, with one usage credit.
- **Customer offset:** included in the £500 subscription, not separately recharged.
- **Upgrade trigger:** contractual SLA/security requirements or measured workload beyond the public Pro model.
- **Evidence required:** 30-90 days of environment-tagged Vercel usage and invoice data.

### 4.2 PostgreSQL / Supabase planning proxy

- **Status:** PostgreSQL is live; Supabase is a planning proxy until the production database contract is confirmed. The code’s generic `DATABASE_URL` does not prove the deployed vendor.
- **Plan rule:** no production Free tier. The model uses Pro, compute credit, disk and egress, plus paid non-production projects in Base/High cases.
- **Customer offset:** included core cost.
- **Risks:** 243-table schema, event/receipt/execution growth, PITR, replicas, connection limits, backups, staging and egress.
- **Upgrade trigger:** measured CPU, memory, IOPS, connection saturation, retention growth and recovery objectives.

### 4.3 Inngest

- **Status:** live central durable job and workflow provider.
- **Plan rule:** Pro from day one. Hobby includes 50,000 executions, but the current code has approximately 219,720 scheduled runs and at least 602,880 minimum executions per month before tenant work.
- **Billing definition:** one function run plus every durable step; retries and event fan-out add more.
- **Customer offset:** included core cost. Extremely automation-heavy usage can justify plan limits or a premium automation add-on.
- **Quote trigger:** high execution volume, concurrency, events, span data, users/workers or enterprise support.

### 4.4 UploadThing

- **Status:** live for logos, waivers, invoices, instructor documents and imports.
- **Plan rule:** paid/private plan when document features or regional controls are enabled. Free is valid only before those production requirements exist.
- **Customer offset:** baseline allowance included; exceptional storage/import burst should be metered.
- **Risks:** retention, egress, private access, data residency and permissive Mindbody import sizes.

### 4.5 Upstash Redis

- **Status:** live cache/rate-limit infrastructure.
- **Plan rule:** Free only while within 500k commands/256 MB and while loss/availability impact is acceptable. PAYG is used after that. Prod Pack is triggered by resilience/compliance, not purely volume.
- **Customer offset:** included core cost.

### 4.6 Sentry

- **Status:** live, but current production configuration is not cost-safe.
- **Observed configuration:** 100% trace sampling, logs enabled, console log/warn/error capture, 10% normal-session replay, 100% error-session replay, default PII enabled and AI inputs/outputs recorded.
- **Headline treatment:** Team/Business base, published error and log overage, plus explicit internal planning rates for spans and replays because the public page did not expose a stable unit rate for those surfaces in this audit.
- **Required action:** set sampling, inbound filters, spend caps, privacy redaction and retention before accepting the estimate. The current configuration stress is deliberately not presented as a precise vendor bill.

### 4.7 PostHog

- **Status:** live central product analytics.
- **Observed configuration:** user identification is active; anonymous autocapture is disabled and selected events are captured.
- **Headline treatment:** standard progressive product-event pricing after 1m free events.
- **Sensitivity:** the workbook separately calculates an upper bound using PostHog’s published identified-event starting rate. Confirm the actual billing mode before procurement.

### 4.8 Commercial maps

- **Status:** the UI currently uses public CARTO MapLibre styles. That should not be treated as a free commercial licence.
- **Headline treatment:** Mapbox GL JS commercial map-load pricing is modelled as a replacement: first 50k loads free, then published progressive bands.
- **Decision:** compare Mapbox, MapTiler and self-hosting, then replace the current style contract before commercial launch.

### 4.9 Resend

- **Status:** live managed email service.
- **Headline treatment:** transactional email plans only. No current Resend Contacts/Broadcasts API usage was found, so marketing-contact charges are **not** silently added.
- **Domain constraint:** Pro supports ten domains; more branded Studio domains require Scale even when email volume is low.
- **Enterprise trigger:** 3m+ emails/month or other contractual/deliverability requirements. The model uses the last published marginal rate plus 15% solely as a placeholder and marks the result quote-required.
- **Customer offset:** managed email should be a funded/metered add-on. The current ledger does not collect cash.

### 4.10 Twilio

- **Status:** live managed SMS, voice and number provider.
- **List-price inputs:** outbound UK SMS $0.056/segment, inbound $0.0075/segment, UK mobile number $2.50/month, and a $0.021/minute voice blend.
- **Not fully captured by list price:** carrier, failed-message, international, regulatory, destination, recording and transcription charges.
- **Customer offset:** funded/metered add-on with limits. SMS must be billed by **segment**, not message.

### 4.11 Stripe Billing and SaaS collection

- **Status:** target architecture, not implemented in the current auth/billing flow.
- **Price assumption:** £500 per location **plus VAT**.
- **Collection mix:** 80% Bacs, 20% UK cards. At £600 collected, the weighted base cost is approximately £9.24 per location: £4.20 Billing PAYG plus weighted payment processing.
- **Contracted Billing plans:** compare published annual tiers only after validating eligibility and contract terms. The headline keeps 0.7% PAYG and does not use an unsupported £450-at-scale shortcut.
- **Still required:** subscription creation, location quantity changes, entitlements, raw/signature-verified webhooks, idempotency, dunning, credits, cancellations and finance reconciliation.

## 5. Stripe Connect: current and target economics

The current code creates **destination charges** using `transfer_data.destination` and optional application fees. Under Stripe’s documented funds flow, Stripe debits the platform for processing fees and destination-charge refunds/chargebacks. This is a separate cost surface from collecting Aurea’s £500 SaaS subscription.

### Illustrative current-state exposure

Assumptions: £30,000 monthly Studio GMV per location, £75 average ticket, four payouts, UK-card processing, published Connect account/payout fees and a 0.1% internal loss reserve.

| Locations | Studio GMV | Card processing | Connect account/payout | Loss reserve | Total platform exposure |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | £30,000 | £530 | £77 | £30 | **£637** |
| 10 | £300,000 | £5,300 | £774 | £300 | **£6,374** |
| 25 | £750,000 | £13,250 | £1,935 | £750 | **£15,935** |
| 50 | £1,500,000 | £26,500 | £3,870 | £1,500 | **£31,870** |
| 100 | £3,000,000 | £53,000 | £7,740 | £3,000 | **£63,740** |
| 250 | £7,500,000 | £132,500 | £19,350 | £7,500 | **£159,350** |
| 500 | £15,000,000 | £265,000 | £38,700 | £15,000 | **£318,700** |
| 1,000 | £30,000,000 | £530,000 | £77,400 | £30,000 | **£637,400** |

This exposure is **not** in the main £500 subscription table because it should either:

- move to Studio-paid direct charges, which is the recommended SaaS target; or
- be recovered through an application fee that covers processing, Connect fees, refunds/disputes, negative balances, support and Aurea’s platform margin.

Until one of those policies is implemented and reconciled, “Stripe Connect costs Aurea £0” is not a valid statement.

## 6. What can be offset by customers

| Cost surface | Contracting party | Cash payer | Invoice mechanism | Recovery target | State |
| --- | --- | --- | --- | --- | --- |
| Vercel, database, Inngest, baseline storage, Redis, Sentry, PostHog, maps | Aurea | Aurea | Included in £500 | None | Current |
| Resend transactional email | Aurea | Aurea then Studio | Stripe usage line / prepaid credits | 25% contribution after collection | Target; ledger exists, cash collection missing |
| Twilio SMS, voice and numbers | Aurea | Aurea then Studio | Stripe usage line / prepaid credits | 25% contribution after collection | Target; ledger exists, cash collection missing |
| Exceptional private storage/import burst | Aurea | Aurea then Studio | Included allowance then overage bundle | 25% contribution after collection | Target |
| Stripe Connect, current destination charges | Aurea | Aurea | Application fee | Full cost + risk reserve + platform margin | Current architecture; recovery policy incomplete |
| Stripe Connect, recommended direct charges | Studio connected account | Studio | Stripe deducts from Studio; optional application fee to Aurea | Contracted platform fee | Target decision |
| OpenAI, Anthropic, Gemini | Studio | Studio | BYOK | None | Current target |
| Google Workspace, Microsoft 365, Cal.com, Slack, Zoom and specialist apps | Studio | Studio | Studio direct contract | None | Current |
| Advertising spend | Studio | Studio | Studio ad account | None | Current |
| Premium support, enterprise compliance and vendor quotes | Aurea | Aurea | Included or enterprise uplift | N/A | TBC |

### Proposed managed-usage pricing logic

The exact break-even sell price is:

`provider cost / (1 - target contribution margin - collection rate)`

At a 25% target contribution and 2.2% collection allowance, the multiplier is **1.374x provider cost**. Examples:

- UK outbound SMS cost £0.04 per segment; exact recovery price £0.06; proposed rate £0.06 plus unpriced carrier/international fees.
- UK mobile number cost £1.88; exact recovery price £2.58; proposed rate £3/month.
- Blended voice cost £0.02 per minute; proposed planning rate £0.025/minute, subject to destination mix.
- Transactional email overage should allocate both marginal send volume and fixed/domain plan cost; a simple per-email rate alone can under-recover Resend Scale.
- Exceptional private storage should use an included allowance plus a minimum overage bundle rather than penny-level invoices.

Required billing controls are: funded balance or approved credit limit, idempotent ledger-to-Stripe export, VAT/markup policy, per-channel spend caps, customer-visible usage, dunning/non-payment rules and provider-ledger-invoice-cash reconciliation.

## 7. Stress tests

| Stress case | Locations | Monthly exposure | Annualised | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Prelaunch with zero paying Studios | 0 | £154 | £1,845 | Fixed production/staging tooling before revenue; excludes payroll and unpriced tools. |
| No managed communications | 100 | £2,927 | £35,118 | Shows subscription platform cost without Resend/Twilio usage. |
| Base managed communications | 100 | £8,132 | £97,583 | Reference case from the 24-scenario model. |
| Email-heavy: 30k emails/location | 100 | £9,030 | £108,356 | Requires Resend Enterprise quote at 3m emails; numeric value is a planning placeholder. |
| SMS-heavy: 10k outbound segments/location | 100 | £51,602 | £619,223 | Carrier and international fees can increase this. |
| Voice-heavy: 1,000 minutes/location | 100 | £9,762 | £117,144 | Recording storage/transcription is not included without an approved product policy. |
| Automation-heavy: 100k runs, 8 steps/location | 100 | £12,290 | £147,479 | Concurrency, event volume and Enterprise quote gates may dominate before the linear overage. |
| Import/storage burst: 500 GB/location | 100 | £11,117 | £133,410 | A single permissive import can create a large temporary storage and egress event. |
| Analytics-heavy: 500k events/location | 100 | £9,332 | £111,986 | Validate event taxonomy and identified-event billing mode. |
| Current Connect destination charges: £30k GMV/location | 100 | £63,740 | £764,880 | Separate Studio-payment cost surface; must be recovered with application fees or removed through direct charges. |

These are not additive. They show which workload can break the base case:

- **Email/SMS/voice heavy:** communications dominates and must be funded by the Studio.
- **Automation heavy:** Inngest’s execution definition, concurrency and enterprise gates matter more than raw workflow-run count.
- **Import/storage burst:** a single oversized import can create a temporary storage/egress spike.
- **Analytics heavy:** event taxonomy and identified-event billing mode must be governed.
- **Connect high GMV:** platform liability grows with Studio GMV, not Aurea SaaS revenue.
- **Prelaunch:** paid commercial infrastructure exists before revenue; the model estimates about £154/month before unpriced tools and people.

## 8. VAT, cash and commercial sensitivities

### £500 plus VAT versus VAT-inclusive

- **Report convention:** £500 net revenue, £100 VAT, £600 customer cash invoice.
- **If £500 is VAT-inclusive:** net revenue is £416.67 per location before discounts, credits and bad debt. That reduces technology contribution by £83.33 per location even though most software costs do not fall.

### Collection mix

- 100% UK cards on a £600 invoice: approximately £13.40/location including Billing PAYG.
- 100% Bacs: approximately £8.20/location including Billing PAYG.
- Base 80% Bacs / 20% cards: approximately £9.24/location.
- Failed attempts, disputes, refunds and non-UK payment methods require actual Stripe data.

### FX

Most core vendors are modelled in USD while SaaS revenue is GBP. At 100 base-case locations, a move from 0.75 to 0.80 GBP/USD increases the USD-priced cost base by about 6.7%. The workbook contains 0.70/0.75/0.80 sensitivities.

### Annual contracts and discounts

The model does not assume discounts that have not been signed. Annual commitments should be evaluated against:

- forecast confidence and downside risk;
- minimum spend and overage definitions;
- FX/payment terms;
- support/SLA/data-residency controls;
- exit, portability and data-export terms;
- whether the quoted savings exceed the cost of lost flexibility.

## 9. Full software inventory

| Application | Lifecycle status | Primary payer | Commercial treatment | Model treatment | Confidence |
| --- | --- | --- | --- | --- | --- |
| Vercel | Live central | Aurea | Included | Pro from launch | High |
| PostgreSQL / Supabase | Live; vendor assumption | Aurea | Included | Pro from launch | Medium |
| Inngest | Live central | Aurea | Included | Pro from launch | High |
| UploadThing | Live central | Aurea | Included allowance + overage | Paid/private from document launch | High |
| Upstash Redis | Live central | Aurea | Included | PAYG; Prod Pack by resilience trigger | High |
| Sentry | Live central | Aurea | Included | Team/Business when production telemetry is controlled | High |
| PostHog | Live central | Aurea | Included | PAYG after free allowance | High |
| MapLibre + CARTO styles | Live with licensing risk | Aurea | Included | Replace with commercial map contract | High |
| Mapbox | Target commercial provider | Aurea | Included | PAYG map loads | Medium |
| Resend | Live managed | Aurea | Metered add-on | Pro/Scale by volume and domain count | High |
| Twilio | Live managed | Aurea | Metered add-on | PAYG then committed quote | High |
| Stripe Billing | Target; not implemented | Aurea | Included in subscription economics | PAYG until contracted tier | High |
| Stripe Connect | Live destination charges | Aurea today; target Studio | Application fee or Studio direct | Direct charges target or full recovery | High |
| Better Auth | Live open source | Aurea | Included | No SaaS fee | High |
| Polar | Removed; stale env/docs | None | None | £0 | High |
| Google Workspace / Gmail / Calendar / Drive / Forms | Live tenant-owned | Studio | Studio direct | Studio plan | High |
| Microsoft 365 / Outlook / OneDrive | Live tenant-owned | Studio | Studio direct | Studio plan | High |
| Slack | Live tenant-owned | Studio | Studio direct | Studio plan | High |
| Discord | Live tenant-owned | Studio | Studio direct | Studio plan | High |
| Telegram | Live tenant-owned | Studio | Studio direct | Studio plan | High |
| Cal.com | Live tenant-owned | Studio | Studio direct | Studio plan | Medium |
| Mindbody | Live integration | Studio | Studio direct | Studio contract | Medium |
| Meta / Facebook / Instagram / WhatsApp | Mixed live/configured | Studio | Studio direct | Studio/ad spend | Medium |
| Google Ads | Integrated/tenant-owned | Studio | Studio direct | Studio/ad spend | Medium |
| TikTok Ads | Integrated/tenant-owned | Studio | Studio direct | Studio/ad spend | Medium |
| OpenAI | BYOK | Studio | Studio direct | Tenant credential | High |
| Anthropic | BYOK | Studio | Studio direct | Tenant credential | High |
| Google Gemini | BYOK; model migration required | Studio | Studio direct | Tenant credential | Medium |
| Vonage | Implemented but inactive | None until selected | None | £0 base | Medium |
| MessageBird | Implemented but inactive | None until selected | None | £0 base | Medium |
| ClassPass | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Wellhub | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Kisi | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Mailchimp | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Zoom | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Spivi | Catalogue only | Studio | Studio direct | £0 Aurea until adapter exists | Medium |
| Google Cloud Pub/Sub | Live indirect dependency | Aurea or Studio cloud project | Included | Likely £0 initially | Medium |
| Domains / DNS / registrar | Not evidenced | TBC | TBC | TBC | Low |
| GitHub / CI | Not evidenced | Aurea | Included overhead | TBC | Low |
| Status / uptime / security scanning | Not evidenced | Aurea | Included overhead | TBC | Low |
| Open-source npm libraries | Live | Aurea | Included | £0 licence fee unless support purchased | High |

Important classifications:

- **Live central:** committed or usage-driven Aurea cost.
- **Live tenant-owned/BYOK:** the feature is integrated, but the Studio contracts and pays the provider.
- **Target:** needed for the intended commercial model but not yet implemented or contracted.
- **Implemented but inactive:** £0 base; becomes relevant only if selected.
- **Catalogue only:** no central spend until a real adapter and contract exist.
- **Removed/deprecated:** £0, with cleanup work if stale configuration remains.
- **Not evidenced:** `TBC`; the codebase cannot prove the plan or payer.

## 10. Decision register

| ID | Decision | Recommended position | Owner | Status | Severity |
| --- | --- | --- | --- | --- | --- |
| D01 | Stripe Connect charge type | Direct charges for SaaS-style Studio relationships unless marketplace control is required | Product + Finance + Engineering | Open | Critical |
| D02 | Aurea subscription billing | £500 ex VAT; 80% Bacs / 20% card planning mix | Finance + Engineering | Open | Critical |
| D03 | Communications recovery | Prepaid or funded usage with 25% contribution target and spend caps | Product + Finance | Open | Critical |
| D04 | Sentry production policy | Sampling, inbound filters, budgets, data minimisation | Engineering + Privacy | Open | Critical |
| D05 | Maps licensing | Mapbox PAYG is modelled; compare MapTiler/self-hosting | Engineering + Procurement | Open | High |
| D06 | Database vendor and resilience | Supabase Pro is a modelling proxy only | Engineering | Open | High |
| D07 | Price and VAT | Model assumes £500 net of VAT; invoice £600 | Finance | Open | High |
| D08 | Retention and storage | Tenant-configurable within compliance minimums | Product + Privacy | Open | High |
| D09 | AI commercial policy | BYOK by default | Product + Finance | Open | Medium |
| D10 | Enterprise/SLA thresholds | Quote gates are decisions, not automatic cost savings | Leadership | Open | Medium |

## 11. Evidence plan and confidence

### High-confidence elements

- Which vendors and integrations exist in current code.
- Stripe destination-charge implementation.
- Communications usage ledger exists but Stripe collection export was not found.
- Inngest schedule frequency and static durable-step baseline.
- Sentry/PostHog current configuration.
- Public list-price definitions and plan limits cited below.

### Medium-confidence elements

- Low/Base/High per-location operating drivers.
- Vercel and PostgreSQL compute sizing.
- Voice destination blend.
- Map-load and event volume.
- Database/storage retention.

### Low-confidence / quote-required

- Enterprise Resend, Inngest, maps, database or support pricing.
- Sentry span/replay unit rates until a live calculator export or quote is attached.
- Production database vendor and contract.
- GitHub/CI, DNS/registrar, status/uptime, security tooling and premium support not evidenced in source or invoices.
- Current destination-charge loss experience.

### Replace estimates with these controls

1. Collect 30-90 days of vendor invoices and product usage.
2. Export Vercel usage by production/preview and workload.
3. Benchmark PostgreSQL query load, storage growth, connections, IOPS and restore objectives.
4. Export Inngest function, step, retry, event and concurrency usage.
5. Reconcile Resend/Twilio provider invoices to the communications ledger, customer invoice and cash.
6. Run Stripe test-mode balance-transaction scenarios for direct/destination charges, refunds and disputes.
7. Apply Sentry budgets/privacy controls, then export errors/logs/spans/replays by environment.
8. Validate PostHog billing mode and event taxonomy.
9. Test at least two materially different Studio configurations, for example a low-communication boutique Studio and a high-automation/high-SMS multi-location operator.

## 12. Explicit exclusions

The technology contribution margin excludes:

- salaries, contractors, customer success, support and implementation;
- legal, tax, audit, accounting, insurance and compliance;
- office, devices and general corporate software not evidenced here;
- Studio ad spend and tenant-owned SaaS contracts;
- refunds/credits/bad debt beyond the stated scenario assumption;
- supplier VAT recoverability and corporation tax;
- financing and working-capital cost;
- unquoted enterprise support, security and SLA contracts;
- new AI credits, recording/transcription or WhatsApp usage until commercially approved.

## 13. Sources

- **Vercel — Pro and usage pricing:** https://vercel.com/pricing — Commercial production plan; validate invoices and current rate card.
- **Supabase — Pro, compute, disk and egress:** https://supabase.com/pricing — Provider is an architectural assumption until the production database contract is confirmed.
- **Inngest — Execution definition and Pro rate:** https://www.inngest.com/pricing — One function run plus every durable step is an execution.
- **UploadThing — Storage plans:** https://uploadthing.com/pricing — Paid/private plan assumed when documents and regional controls are enabled.
- **Upstash — Redis plans and PAYG:** https://upstash.com/pricing/redis — Prod Pack is a resilience decision, not a pure volume threshold.
- **Sentry — Team/Business quotas and known overages:** https://sentry.io/pricing/ — Span/replay rates in this model are internal planning placeholders pending a live calculator export or quote.
- **PostHog — Product analytics pricing:** https://posthog.com/pricing — Headline uses standard event pricing; identified-event upper bound is separate.
- **Resend — Transactional email tiers:** https://resend.com/pricing — Contacts/Broadcasts pricing is excluded because no current API use was found.
- **Twilio — UK SMS pricing:** https://www.twilio.com/en-us/sms/pricing/gb — Carrier, failed-message, international and regulatory fees require invoice telemetry.
- **Twilio — UK Voice pricing:** https://www.twilio.com/en-us/voice/pricing/gb — Model uses a blended local/mobile planning rate.
- **Stripe — UK payment pricing:** https://stripe.com/gb/pricing — Subscription collection assumes 80% Bacs and 20% UK cards.
- **Stripe Billing — Billing pricing:** https://stripe.com/gb/billing/pricing — Headline uses 0.7% PAYG until a contracted plan is signed.
- **Stripe Connect — Charge type and liability:** https://docs.stripe.com/connect/charges?locale=en-GB — Current destination charges debit Aurea for processing, refunds and chargebacks.
- **Mapbox — Mapbox GL JS map loads:** https://www.mapbox.com/pricing — Proposed commercial replacement for current CARTO public basemap assumption.
- **Google Cloud Pub/Sub — Pub/Sub pricing:** https://cloud.google.com/pubsub/pricing — Expected to remain within the first 10 GiB allowance initially.
- **Bank of England — Exchange rates:** https://www.bankofengland.co.uk/boeapps/database/Rates.asp?Travel=NIxIRx&into=GBP — The workbook uses a round planning rate of USD 1 = GBP 0.75 and includes FX sensitivities.

## 14. Repository evidence reviewed

- `src/features/stripe-connect/lib/destination-charge.ts`
- `src/features/studio/server/billing-router.ts`
- `src/features/studio/server/cancellation-collection-service.ts`
- `src/features/communications/server/`
- `src/features/communications/components/communications-usage.tsx`
- `src/inngest/functions/`
- `src/features/delivery/server/inngest/functions.ts`
- `src/features/communications/server/inngest-functions.ts`
- `src/app/api/uploadthing/core.ts`
- `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`
- `src/lib/posthog/`
- `src/components/ui/map.tsx`
- `.env.example`, `package.json`, `src/lib/auth.ts`

---

**Use with the editable workbook:** the workbook contains all 24 core scenarios, service-by-service costs, ownership policy, stress tests, Stripe Connect GMV sensitivity, rate cards, decisions, checks and source URLs. Any board or investor use should refresh the blue assumption cells with actual invoices and usage first.
