# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

## ⚠️ MANDATORY — READ BEFORE WRITING A SINGLE LINE OF CODE

**Every feature, every file, every PR must comply with [`docs/BEST_PRACTICES.md`](docs/BEST_PRACTICES.md).**

This is not optional and applies to ALL work in this repository — new features, bug fixes, refactors, and one-liners alike.

**Checklist before implementing anything:**
1. Read the relevant section(s) of `docs/BEST_PRACTICES.md` for the domain you are touching (TypeScript, tRPC, Drizzle, Stripe, React/Next.js).
2. Confirm you have a clear server/client split — no Drizzle or DB calls in client components, no UI logic in routers.
3. Confirm all new tRPC procedures have Zod input validators and use `TRPCError` (not `throw new Error`).
4. Confirm any multi-step DB write uses `db.transaction`.
5. Confirm any money value uses Postgres `numeric` or integer pence/cents (not `doublePrecision`, not JavaScript floats).
6. Confirm any new Stripe webhook uses raw body + signature verify + idempotency in one transaction.

**Hard rules (zero exceptions):**
- No `any`. Use `unknown` + Zod at boundaries.
- No Drizzle or direct DB calls inside `"use client"` files.
- No N+1 queries — use Drizzle joins, relation queries, and explicit `select` projections in a single query.
- `TRPCError` with the right code every time. The correct codes are in `docs/BEST_PRACTICES.md` §3.
- Stripe Connect: Express accounts, destination charges, `application_fee_amount`. Never manual transfers.
- All money: Postgres `numeric` / integer pence. Never floating point.
- Webhooks: `req.text()` → verify → idempotency + business logic in `db.transaction` → 200. Heavy work → Inngest.
- No `TODO`/`FIXME` in committed code.
- **Always use ShadCN components** where one exists (`Button`, `Separator`, `Badge`, `Input`, `Select`, etc.). Never create raw `<button>`, `<input>`, or `<select>` elements when a ShadCN equivalent is available in `src/components/ui/`.
- **Keep files small and focused.** Never dump an entire page's worth of components, helpers, constants, and types into a single file. Extract into `src/features/<feature>/components/`, `src/features/<feature>/constants.ts`, `src/features/<feature>/helpers.ts`, etc. Each component should be its own file. Use barrel `index.ts` exports. Target ≤ 200 lines per file for components, ≤ 300 for pages.

---

## Project Overview

Aurea CRM is a Next.js 16-based workflow automation and CRM platform with a visual node-based editor. It features multi-tenant agency/client architecture, real-time workflow execution via Inngest, and integrations with services like WhatsApp, Google Calendar, Gmail, Telegram, and AI providers (Anthropic, OpenAI, Gemini).

**Tech Stack:**

- Next.js 16 (App Router) with React 19
- TypeScript with strict mode
- Drizzle ORM (PostgreSQL) with schema in `src/db/schema.ts`
- tRPC for type-safe API routes
- Better Auth with Polar.sh for subscriptions
- Inngest for background jobs and workflow orchestration
- React Flow for visual workflow editor
- Tanstack Table for data tables
- TypeScript checks through `npm run typecheck`
- Jotai for state management

## Development Commands

```bash
# Development
npm dev                    # Start Next.js dev server
npm inngest:dev           # Start Inngest dev server
npm dev:all               # Run both with mprocs

# Database
npm run db:generate       # Generate Drizzle migrations
npm run db:migrate        # Apply Drizzle migrations
npm run db:push           # Push schema in local/dev only
npm run db:studio         # Open Drizzle Studio

# Code Quality
npm run typecheck         # Run TypeScript without emitting files

# Build & Deploy
npm build                 # Production build
npm start                 # Start production server

# Tunneling (for webhooks)
npm ngrok:dev            # Expose local server via ngrok
```

## High-Level Architecture

### Multi-Tenant Structure

The app uses a **three-tier organization model**:

1. **Organization** - Top-level agency/workspace (e.g., "Acme Agency")
2. **Location** - Studio/client workspace under an organization (e.g., "Wembley Studio")
3. **User** - Can be members of multiple orgs and locations

**Context Switching:**

- Session stores `activeOrganizationId` and `activeLocationId`
- Most resources (workflows, credentials, webhooks, clients, deals) are scoped to a location
- CRM features (clients, deals) are **only accessible within a location context**
- The `protectedProcedure` in tRPC automatically loads context from session (see `src/trpc/init.ts:33-103`)

### Workflow System

**Node-Based Workflow Engine:**

- Workflows are directed acyclic graphs (DAG) of nodes connected by edges
- **Triggers** - Start workflows (Manual, Google Form, Calendar, Gmail, Telegram, WhatsApp, Stripe)
- **Executions** - Perform actions (HTTP, AI models, Discord, Slack, Calendar, Gmail, Telegram, WhatsApp)
- Nodes store configuration in a `data` JSON field
- Workflows can be archived or marked as templates

**Execution Flow:**

1. Trigger initiates workflow via `sendWorkflowExecution()` to Inngest
2. `executeWorkflow` function (src/inngest/functions.ts:40) processes nodes in topological order
3. Each node type has an executor that receives context and returns updated context
4. Execution state tracked in `Execution` table with real-time updates

**Node Structure:**

- All trigger nodes extend `BaseTriggerNode` (src/features/nodes/triggers/base-trigger-node.tsx)
- All execution nodes extend `BaseExecutionNode` (src/features/nodes/executions/base-execution-node.tsx)
- Each node type has: `node.tsx`, `dialog.tsx`, `executor.ts`, `realtime.ts` (if applicable)
- Executors registered in `src/features/executions/lib/executor-registry.ts`

### CRM Features (New)

**Clients & Deals:**

- **Clients** - Lead/member/customer profiles with assignees, scoring, lifecycle stages (src/features/crm/server/clients-router.ts)
- **Deals** - Sales pipeline with stages (LEAD_IN, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST)
- Both are **location-scoped** - require active location context
- Use reusable `DataTable` component (src/components/data-table/data-table.tsx)
- Pagination via cursor-based infinite scroll with `CRM_PAGE_SIZE` constant

**Assignment Model:**

- Clients have `ClientAssignee` (via `LocationMember`)
- Deals have `DealMember` (via `LocationMember`)
- Deals can link to multiple clients via `DealClient`

### tRPC Patterns

**Router Organization:**

```
src/trpc/routers/_app.ts         # Main router
src/features/*/server/routers.ts # Feature routers
```

**Procedures:**

- `baseProcedure` - No auth required
- `protectedProcedure` - Requires auth, loads org/location context
- `premiumProcedure` - Requires active Polar subscription

**Context Available:**

```typescript
{
  auth: Session,           // Better Auth session
  orgId: string | null,    // Active organization
  locationId: string | null,  // Active location
  location: Location | null   // Full location object
}
```

### Feature-Based Folder Structure

```
src/features/<feature>/
  ├── components/        # React components
  ├── server/           # tRPC routers, server utils
  ├── hooks/            # React hooks
  ├── lib/              # Feature utilities
  └── types.ts          # Type definitions
```

**Key Features:**

- `nodes/` - Triggers and executions (shared folder)
- `workflows/` - Workflow management
- `executions/` - Execution history and timeline
- `credentials/` - API keys (encrypted with Cryptr)
- `integrations/` - OAuth integrations (Google, Facebook/WhatsApp)
- `webhooks/` - Reusable webhook configurations
- `organizations/` - Org/location management
- `crm/` - Clients and deals

### Database Patterns

**Important Model Relationships:**

- `Workflow` → `Node` → `Connection` (cascade delete)
- `Workflow` → `Execution` (execution history)
- `Organization` → `Location` → scoped resources
- `Location` → `Client`, `Deal` (CRM)
- `Integration` - OAuth tokens per user+provider (unique constraint)
- `Credential` - Encrypted API keys with optional location scoping

**Drizzle Client Location:**
Schema lives in `src/db/schema.ts`; the shared client lives in `src/db/client.ts` and is re-exported from `src/db/index.ts`.

**Schema Conventions:**

- Use `cuid()` for IDs (except Organization/Session from better-auth)
- JSON fields for flexible node configuration
- Enums are declared in `src/db/schema.ts` with `pgEnum` and exported from the schema module.

### Authentication & Authorization

**Better Auth Setup:**

- Email/password + Google/Facebook OAuth
- Organization plugin for multi-tenancy
- Polar.sh plugin for subscription management
- Session stores active organization/location context

**Permission Model:**

- Organization members have roles: "owner", member roles
- Location members have roles: AGENCY, ADMIN, MANAGER, STANDARD, LIMITED, VIEWER
- AGENCY role = agency team member working on client's behalf
- Resource access checked via `workflowScopeWhere()` pattern

### Realtime & Background Jobs

**Inngest Functions:**

- `executeWorkflow` - Main workflow runner with channels for each node type
- `handleGoogleCalendarNotification` - Process calendar webhooks
- `renewGoogleCalendarSubscriptions` - Hourly cron job
- `handleGmailNotification` - Process Gmail push notifications
- `handleTelegramUpdate` - Process Telegram bot updates
- `handleWhatsAppUpdate` - Process WhatsApp webhook events

**Channels:**
Each node type has an Inngest channel in `src/inngest/channels/` that handles execution logic.

### Important Conventions

**File Imports:**

- Use `@/` path alias for `src/`
- Prefer named exports over default exports (except Next.js pages)
- Server code uses `"use server"` directive (rarely needed due to file location)
- Client components use `"use client"` directive

**Styling:**

- Tailwind CSS with custom dark theme
- UI components in `src/components/ui/` (shadcn-style)
- Custom colors: `#202e32` for backgrounds, `white/5` for borders
- All UI is dark-themed

**Type Safety:**

- Drizzle tables and enums imported from `@/db/schema`
- tRPC provides end-to-end type safety
- Use `typeof table.$inferSelect`, `typeof table.$inferInsert`, and Zod inference for type composition

### Testing Workflows

**Manual Testing:**

1. Start both servers: `npm dev:all`
2. Use Inngest Dev Server UI at `http://localhost:8288`
3. For webhooks, use ngrok: `npm ngrok:dev`
4. Test executions via the timeline view at `/executions/[executionId]`

**Database Inspection:**
Use `npm run db:studio` or SQL to inspect data directly.

### Common Patterns

**Adding a New Node Type:**

1. Add enum value to `nodeType` in `src/db/schema.ts`
2. Create folder: `src/features/nodes/{triggers|executions}/components/<node-name>/`
3. Create files: `node.tsx`, `dialog.tsx`, `executor.ts`, `realtime.ts` (optional)
4. Register executor in `src/features/executions/lib/executor-registry.ts`
5. Add Inngest channel to `src/inngest/channels/<node-name>.ts`
6. Import channel in `src/inngest/functions.ts` executeWorkflow channels array

**Adding a New Router:**

1. Create `src/features/<feature>/server/routers.ts`
2. Export router from `src/trpc/routers/_app.ts`
3. Router is automatically available via `trpc.<feature>.*`

**Location-Scoped Resources:**
Always include in the Drizzle table:

```typescript
locationId: text(),
foreignKey({
  columns: [table.locationId],
  foreignColumns: [location.id],
  name: "Resource_locationId_fkey",
}).onUpdate("cascade").onDelete("set null")
```

And filter queries:

```typescript
where(and(eq(resource.userId, ctx.auth.user.id), eq(resource.locationId, ctx.locationId ?? "")))
```

**Pagination:**

- Lists: Use cursor-based with `cursor` + `limit` inputs
- CRM: `CRM_PAGE_SIZE = 20` (clients/deals)
- Standard: `PAGINATION.DEFAULT_PAGE_SIZE = 10`

### Environment Variables

Key variables (see `.env.local`):

- `DATABASE_URL` - PostgreSQL connection
- `INNGEST_*` - Inngest configuration
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth
- `FACEBOOK_CLIENT_ID/SECRET` - WhatsApp integration
- `POLAR_*` - Subscription management
- `ENCRYPTION_KEY` - For Cryptr (credentials)
- `APP_URL` - Base URL for OAuth callbacks

### Migration Workflow

When modifying schema:

1. Edit `src/db/schema.ts`
2. Run `npm run db:generate -- --name <description>`
3. Run `npm run db:migrate`
4. Restart dev server if types do not update
