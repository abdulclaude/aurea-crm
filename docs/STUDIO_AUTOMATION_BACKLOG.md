# Studio Automation Backlog

## Completed in this pass

- Dedicated `AutomationEvent` persistence with execution, workflow, contact, event type, metadata, and dedupe key.
- Persisted conversion signals for membership signups, intro offer redemptions/completions, class milestones, lead conversions, birthdays, no-shows, waitlist spots, membership expiry/cancellation, and class booking/cancellation.
- First-class `BIRTHDAY_TRIGGER` node with channel, executor, configuration dialog, node selector entry, and daily trigger job.
- Birthday starter workflow template.
- Automation Insights now reads persisted automation events and shows recent events.
- Starter workflow templates split into focused modules.

## Immediate QA

- Install studio starter templates from the Templates tab and confirm the new birthday template appears.
- Open the birthday trigger node in the workflow editor and save its configuration.
- Run or wait for a birthday-triggered workflow and verify an `AutomationEvent` row is created.
- Check the Executions → Automation insights tab for aggregate counts and recent events.

## Next backlog

- Add a conversion attribution detail page with filters by event type, workflow, contact, date range, and source trigger.
- Backfill `AutomationEvent` rows from historical successful executions where output is available.
- Add explicit event instrumentation for SMS sent/delivered/replied once inbound SMS replies are modeled.
- Add configurable class milestone thresholds instead of hard-coded every 10 classes.
- Add workflow templates for referrals, churn rescue, inactive-member reactivation, and failed-payment recovery.
- Finish competitor-gap items: Reserve with Google, ClassPass/Gympass/Wellhub, dynamic pricing, BNPL/installments/payment plans, VOD library, access control, performance tracking, WOD builder, SOAP notes, and marketplace listing.
