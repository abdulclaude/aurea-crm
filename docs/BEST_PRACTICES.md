# Aurea CRM — Engineering Best Practices

Sourced from official docs, production guides, and current (2025/2026) community standards.
All contributors must follow these rules. No exceptions without a team discussion.

---

## 1. Architecture — Feature-Sliced Design

### Folder layout (non-negotiable)
```
src/
  features/<feature>/
    components/    ← UI only, no direct DB calls
    server/        ← tRPC routers, never imported by client bundles
    hooks/         ← client-side custom hooks
    lib/           ← pure utilities, no React, no direct DB calls
    types.ts       ← shared types inferred from Zod or Drizzle
  components/      ← global shared UI only (no feature logic)
  lib/             ← global utilities (auth, db, encryption, etc.)
  trpc/            ← router aggregation + client helpers
  stores/          ← Zustand stores (client state only)
```

### Rules
- **Features own their data.** A feature's server router is the only place that queries the DB for that feature's entities.
- **No cross-feature imports from `server/`.** Feature A must never import Feature B's router or Drizzle queries directly. Use tRPC calls instead.
- **Components never touch Drizzle.** Any file with `"use client"` must never import from `@/db`, `@/db/schema`, or any tRPC router directly.
- **Flat is better than nested.** Keep component trees shallow. Prefer composition over deep inheritance.
- **One concern per file.** A file that defines a router should not also define React components.

---

## 2. TypeScript — Zero Compromise

### Non-negotiable rules
```typescript
// NEVER do this
const result: any = await fetch(...);
const thing = value as SomeType;  // assertion without narrowing

// DO this
const result = await fetch(...);
if (!result.ok) throw new Error(...);
const data: unknown = await result.json();
const parsed = MySchema.parse(data);  // Zod narrows to the real type
```

- `any` is banned. Use `unknown` and narrow it. If you need to escape the type system, use `satisfies` or `as const` instead.
- Never widen types to make errors go away. Fix the underlying shape.
- All exported functions must have explicit return types.
- Prefer `type` over `interface` for non-extendable shapes; use `interface` only when extension (merging) is the intent.
- Use Drizzle table inference (`typeof table.$inferSelect`, `typeof table.$inferInsert`) and Zod-derived input types instead of hand-written DB row shapes.

### Zod validation pattern
```typescript
// Define schema first, infer type from it — never duplicate
const CreateMembershipSchema = z.object({
  planId: z.string().cuid(),
  clientId: z.string().cuid(),
  startDate: z.coerce.date(),
  billingInterval: z.enum(["month", "year"]),
});
type CreateMembershipInput = z.infer<typeof CreateMembershipSchema>;

// Validate at the BOUNDARY (tRPC input, webhook body, form submit)
// Trust the type INSIDE the boundary — do not re-validate
```

- Use `.parse()` when a failure should throw (tRPC procedures; caller handles the TRPCError).
- Use `.safeParse()` at user-facing boundaries (form validation, API edge inputs) where you need to return field-level errors rather than throw.
- Never duplicate a Zod schema and a TypeScript interface. Infer one from the other.

---

## 3. tRPC — Consistent API Layer

### Error codes — use the right code every time
| Situation | Code |
|---|---|
| Missing / invalid auth token | `UNAUTHORIZED` |
| Valid token but no permission for this resource | `FORBIDDEN` |
| Resource does not exist | `NOT_FOUND` |
| Input fails validation | `BAD_REQUEST` |
| A business rule violation (e.g. membership already active) | `PRECONDITION_FAILED` |
| Something we didn't anticipate broke | `INTERNAL_SERVER_ERROR` |
| Feature not yet implemented | `NOT_IMPLEMENTED` |

```typescript
// Always include a cause for INTERNAL_SERVER_ERROR so logs have context
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Failed to process payment",
  cause: originalError,
});
```

### Middleware vs procedure error handling
- **Auth / org-scoping** → middleware (runs once, shared).
- **Resource ownership checks** → inside the procedure (specific to the query).
- Never catch-and-swallow in procedures. Let errors bubble to the error formatter.

### Input/output validators
- Every mutation **must** have a Zod input validator.
- Queries with parameters **must** have a Zod input validator.
- Add output validators for any public-facing procedure where the return shape matters for client type safety.

### Procedure naming conventions
```typescript
// Queries: getOne, getMany, list, search
// Mutations: create, update, delete, archive, publish, send
// Avoid: fetch, retrieve, set, handle, process (ambiguous)
trpc.memberships.getMany(...)
trpc.memberships.create(...)
trpc.memberships.cancel(...)
```

---

## 4. Drizzle — Database Layer

### Single global client (already in `src/db/client.ts`)
```typescript
// src/db/client.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as tables from "./schema";

export const dbSchema = { ...tables, ...relations };
export type Database = NodePgDatabase<typeof dbSchema>;

const globalForDrizzle = globalThis as unknown as {
  drizzleDb?: Database;
  drizzlePool?: Pool;
};

export const dbPool =
  globalForDrizzle.drizzlePool ??
  new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });

export const db = globalForDrizzle.drizzleDb ?? drizzle(dbPool, { schema: dbSchema });
if (process.env.NODE_ENV !== "production") globalForDrizzle.drizzleDb = db;
```
Never create another Drizzle client or `Pool` outside this file.

### N+1 prevention
```typescript
// BAD — N+1: one query per membership
const memberships = await db.select().from(studioMembership).where(where);
for (const m of memberships) {
  const [plan] = await db.select().from(membershipPlan).where(eq(membershipPlan.id, m.planId));
}

// GOOD — single query with explicit projection
const memberships = await db
  .select({
    id: studioMembership.id,
    clientId: studioMembership.clientId,
    planName: membershipPlan.name,
    planPrice: membershipPlan.price,
  })
  .from(studioMembership)
  .leftJoin(membershipPlan, eq(studioMembership.planId, membershipPlan.id))
  .where(where);
```

Always use `select` to whitelist only the fields you need. Never return full rows to the client.

### Transactions
```typescript
// Use db.transaction for multi-step writes that must be atomic
const [membership, payment] = await db.transaction(async (tx) => {
  const [membership] = await tx.insert(studioMembership).values(...).returning();
  const [payment] = await tx.insert(studioPayment).values({ membershipId: membership.id, ... }).returning();
  return [membership, payment];
});

// Keep transactions SHORT. No network calls (Stripe, email) inside a transaction.
// Capture the Stripe result BEFORE the transaction, pass the ID in.
```

### Soft deletes vs hard deletes
- Financial records (payments, invoices, payouts): **never hard delete**. Add `deletedAt DateTime?` and filter `where: { deletedAt: null }`.
- Operational records (bookings, memberships): soft delete.
- Transient records (sessions, tokens): hard delete is fine.

### Migrations
```bash
# Development only
npm run db:generate -- --name "descriptive_name"
npm run db:migrate

# Production — CI/CD only
npm run db:migrate

# NEVER run db:push in production
```

---

## 5. Stripe Integration

### Webhook handler — the canonical pattern

```typescript
// src/app/api/webhooks/stripe/route.ts
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Get RAW body — NEVER parse as JSON first
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. Idempotency — check if already processed
  const existing = await db.query.stripeEvent.findFirst({
    where: eq(stripeEvent.stripeEventId, event.id),
  });
  if (existing) return new Response("Already processed", { status: 200 });

  // 3. Persist event (idempotency record + business update in ONE transaction)
  await db.transaction(async (tx) => {
    await tx.insert(stripeEvent).values({ stripeEventId: event.id, type: event.type });
    await handleStripeEvent(tx, event);
  });

  // 4. Return 200 immediately — enqueue slow work (emails) via Inngest
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

Rules:
- The webhook endpoint **must** be excluded from `express.json()` / Next.js body parsing. Always use `req.text()`.
- Idempotency record and business logic **must** be in the same transaction.
- Heavy side-effects (emails, push notifications) → Inngest job, not inline.
- Return 200 within 10 seconds or Stripe considers it a failure.
- Differentiate transient (5xx) vs permanent (200 + dead letter) errors.
- Keep a `StripeEvent` table as your idempotency store.

### Stripe Connect — architecture decisions

**Account type: Express** for instructors/sellers.
- Stripe handles compliance, identity verification (KYC), and the dashboard.
- Platform is responsible for losses but does not manage the onboarding UI complexity.
- Use Stripe-hosted or Embedded onboarding — never build your own KYC flow.

**Charge type: Destination charges** for the platform.
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInPence,
  currency: "gbp",
  application_fee_amount: platformFeeInPence,  // platform's cut
  transfer_data: {
    destination: instructor.stripeAccountId,   // instructor's Express account
  },
});
```

- Platform receives the full charge, then Stripe transfers `amount - application_fee` to the instructor.
- Platform is liable for disputes and refunds (not the instructor).
- Never hardcode fee percentages — store them in `MembershipPlan.platformFeePercent`.

**Payout flow for instructors:**
1. Studio charges customer via destination charge with `application_fee_amount`.
2. Instructor's Stripe balance accumulates.
3. Stripe auto-pays out on the instructor's configured schedule (default: daily rolling).
4. Platform can override per-account with `stripe.accounts.update({ settings: { payouts: { schedule: ... } } })`.

**Onboarding flow:**
```typescript
// Create Express account
const account = await stripe.accounts.create({ type: "express", country: "GB" });

// Generate onboarding link (expire after 1 use)
const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${APP_URL}/instructors/connect/refresh`,
  return_url: `${APP_URL}/instructors/connect/complete`,
  type: "account_onboarding",
});

// Store account.id in DB immediately, before redirect
await db.update(instructor).set({ stripeAccountId: account.id }).where(eq(instructor.id, id));
redirect(link.url);
```

**Capability checks before charging:**
```typescript
const account = await stripe.accounts.retrieve(instructor.stripeAccountId);
const canCharge = account.charges_enabled && account.payouts_enabled;
if (!canCharge) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instructor payout account not ready" });
```

### Application fees — always use, never skip
```typescript
// Correct: application_fee_amount flows to your platform
// WRONG: manually transferring later creates reconciliation nightmares
```

### Stripe client singleton
```typescript
// src/lib/stripe.ts
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20",  // pin to an exact version
  typescript: true,
});
```

---

## 6. React / Next.js — Component Boundaries

### Server vs Client — the decision tree
```
Does this component:
  - Need onClick, onChange, useState, useEffect?        → "use client"
  - Need to talk directly to the DB / auth session?    → Server Component (no directive)
  - Render mostly static structure with dynamic data?  → Server Component + Suspense

Default to Server Components. Add "use client" only when interactivity forces it.
```

### Data fetching hierarchy
```
Page (Server) → fetches data, passes as props
  ↓
Layout (Server) → wraps with shared state (sidebar, auth)
  ↓
Feature Component (Server) → composes sub-components
  ↓
Interactive Widget ("use client") → receives data as props, owns local state
```

Never do data fetching inside a `"use client"` component that can be moved to the server parent.

### Server Actions vs tRPC mutations
- **Forms and progressive enhancement** → Server Actions (`"use server"`).
- **Complex mutations with optimistic updates, error handling, and loading states** → tRPC mutations via `useMutation`.
- In this project: use tRPC for all mutations. Server Actions are reserved for simple form POSTs only.

### Suspense boundaries
```tsx
// Wrap async server data in Suspense — never block the entire page
<Suspense fallback={<KpiCardsSkeleton />}>
  <KpiCards />       {/* async server component */}
</Suspense>
<Suspense fallback={<ChartSkeleton />}>
  <RevenueChart />   {/* async server component */}
</Suspense>
```

---

## 7. Security

### Input validation at every boundary
```typescript
// Trust inside, validate outside
// tRPC: Zod validator on every procedure input
// Webhooks: Stripe signature + Zod on payload
// Forms: Zod safeParse on submit
// URL params: nuqs with explicit parsers (never raw searchParams)
```

### Authentication checks
```typescript
// protectedProcedure already handles auth — don't add manual session checks
// But DO add resource ownership checks:
const [membership] = await db
  .select({ id: studioMembership.id })
  .from(studioMembership)
  .where(and(eq(studioMembership.id, input.id), eq(studioMembership.locationId, ctx.locationId ?? "")))
  .limit(1);
if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
// NOT_FOUND, not FORBIDDEN — don't leak existence of other tenants' resources
```

### Sensitive data
- Never log or return Stripe secret keys, webhook secrets, or encryption keys.
- Use Drizzle `select` projections to exclude sensitive fields from query results before sending to client.
- Stripe API keys go in `.env` only, not in `next.config.ts` NEXT_PUBLIC variables.

---

## 8. Error Handling — Be Intentional

### The three categories
1. **Expected errors** (validation, business rules) → `TRPCError` with a meaningful code and message.
2. **Unexpected errors** (DB unavailable, Stripe timeout) → let them bubble, catch at the router's `onError`, log with full context.
3. **Idempotency errors** (duplicate webhook, double-submit) → return 200 silently; these are not failures.

### Logging pattern
```typescript
// Every caught unexpected error must include context
console.error("[billing.createSubscription]", {
  userId: ctx.auth.user.id,
  locationId: ctx.locationId,
  error: err instanceof Error ? err.message : String(err),
  stack: err instanceof Error ? err.stack : undefined,
});
```

---

## 9. Code Style

- **No comments that explain WHAT.** Only explain WHY (a non-obvious invariant, a workaround).
- **No TODO/FIXME in committed code.** Raise a GitHub issue instead.
- **Constants over magic numbers.** `PLATFORM_FEE_PERCENT` not `0.1` scattered everywhere.
- **Enums for fixed value sets.** Use Drizzle schema enums or exported local enum constants on both server and client rather than ad hoc string literals.
- **Derive, don't store.** If a value can be computed from existing data, compute it in the query or a getter, not as a persisted column.
- **Fail loudly in development.** Use `invariant()` assertions for states that should never happen. Don't silently return `null` and wonder why the UI is blank.

---

## 10. Financial / Payments-Specific Rules

- All monetary values are stored as **Postgres `numeric` strings or integer pence/cents** — never `doublePrecision` or JavaScript floating-point numbers for persisted money.
- Every payment record must reference a `stripePaymentIntentId` or equivalent — never store money without an audit trail.
- Refunds and cancellations are new records, not updates. Immutable financial history.
- Fee splits are always calculated server-side. Never trust the client for an amount.
- Use `Stripe-Idempotency-Key` on all Stripe API create calls from your server:
  ```typescript
  await stripe.paymentIntents.create(
    { amount, currency, ... },
    { idempotencyKey: `pi_${membershipId}_${Date.now()}` }
  );
  ```
