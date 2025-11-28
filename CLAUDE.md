# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aurea CRM is a Next.js 16-based workflow automation and CRM platform with a visual node-based editor. It features multi-tenant agency/client architecture, real-time workflow execution via Inngest, and integrations with services like WhatsApp, Google Calendar, Gmail, Telegram, and AI providers (Anthropic, OpenAI, Gemini).

**Tech Stack:**
- Next.js 16 (App Router) with React 19
- TypeScript with strict mode
- Prisma (PostgreSQL) with custom output to `src/generated/prisma`
- tRPC for type-safe API routes
- Better Auth with Polar.sh for subscriptions
- Inngest for background jobs and workflow orchestration
- React Flow for visual workflow editor
- Tanstack Table for data tables
- Biome for linting/formatting
- Jotai for state management

## Development Commands

```bash
# Development
bun dev                    # Start Next.js dev server
bun inngest:dev           # Start Inngest dev server
bun dev:all               # Run both with mprocs

# Database
npx prisma migrate dev    # Create and apply migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio

# Code Quality
bun lint                  # Run Biome linter
bun format                # Format with Biome

# Build & Deploy
bun build                 # Production build
bun start                 # Start production server

# Tunneling (for webhooks)
bun ngrok:dev            # Expose local server via ngrok
```

## High-Level Architecture

### Multi-Tenant Structure

The app uses a **three-tier organization model**:

1. **Organization** - Top-level agency/workspace (e.g., "Acme Agency")
2. **Subaccount** - Client workspace under an organization (e.g., "Client XYZ")
3. **User** - Can be members of multiple orgs and subaccounts

**Context Switching:**
- Session stores `activeOrganizationId` and `activeSubaccountId`
- Most resources (workflows, credentials, webhooks, contacts, deals) are scoped to a subaccount
- CRM features (contacts, deals) are **only accessible within a subaccount context**
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

**Contacts & Deals:**
- **Contacts** - Lead/customer profiles with assignees, scoring, lifecycle stages (src/features/crm/server/contacts-router.ts)
- **Deals** - Sales pipeline with stages (LEAD_IN, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST)
- Both are **subaccount-scoped** - require active subaccount context
- Use reusable `DataTable` component (src/components/data-table/data-table.tsx)
- Pagination via cursor-based infinite scroll with `CRM_PAGE_SIZE` constant

**Assignment Model:**
- Contacts have `ContactAssignee` (via `SubaccountMember`)
- Deals have `DealMember` (via `SubaccountMember`)
- Deals can link to multiple contacts via `DealContact`

### tRPC Patterns

**Router Organization:**
```
src/trpc/routers/_app.ts         # Main router
src/features/*/server/routers.ts # Feature routers
```

**Procedures:**
- `baseProcedure` - No auth required
- `protectedProcedure` - Requires auth, loads org/subaccount context
- `premiumProcedure` - Requires active Polar subscription

**Context Available:**
```typescript
{
  auth: Session,           // Better Auth session
  orgId: string | null,    // Active organization
  subaccountId: string | null,  // Active subaccount
  subaccount: Subaccount | null // Full subaccount object
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
- `organizations/` - Org/subaccount management
- `crm/` - Contacts and deals (NEW)

### Database Patterns

**Important Model Relationships:**
- `Workflow` → `Node` → `Connection` (cascade delete)
- `Workflow` → `Execution` (execution history)
- `Organization` → `Subaccount` → scoped resources
- `Subaccount` → `Contact`, `Deal` (CRM)
- `Integration` - OAuth tokens per user+provider (unique constraint)
- `Credential` - Encrypted API keys with optional subaccount scoping

**Prisma Client Location:**
Custom output: `src/generated/prisma` (not node_modules)

**Schema Conventions:**
- Use `cuid()` for IDs (except Organization/Session from better-auth)
- JSON fields for flexible node configuration
- Enums generated to `src/generated/prisma/enums`

### Authentication & Authorization

**Better Auth Setup:**
- Email/password + Google/Facebook OAuth
- Organization plugin for multi-tenancy
- Polar.sh plugin for subscription management
- Session stores active organization/subaccount context

**Permission Model:**
- Organization members have roles: "owner", member roles
- Subaccount members have roles: AGENCY, ADMIN, MEMBER
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
- Prisma types imported from `@/generated/prisma`
- Enums imported from `@/generated/prisma/enums`
- tRPC provides end-to-end type safety
- Use `Prisma.validator` for complex type composition

### Testing Workflows

**Manual Testing:**
1. Start both servers: `bun dev:all`
2. Use Inngest Dev Server UI at `http://localhost:8288`
3. For webhooks, use ngrok: `bun ngrok:dev`
4. Test executions via the timeline view at `/executions/[executionId]`

**Database Inspection:**
Use `npx prisma studio` to view/edit data directly.

### Common Patterns

**Adding a New Node Type:**
1. Add enum to `prisma/schema.prisma` NodeType
2. Create folder: `src/features/nodes/{triggers|executions}/components/<node-name>/`
3. Create files: `node.tsx`, `dialog.tsx`, `executor.ts`, `realtime.ts` (optional)
4. Register executor in `src/features/executions/lib/executor-registry.ts`
5. Add Inngest channel to `src/inngest/channels/<node-name>.ts`
6. Import channel in `src/inngest/functions.ts` executeWorkflow channels array

**Adding a New Router:**
1. Create `src/features/<feature>/server/routers.ts`
2. Export router from `src/trpc/routers/_app.ts`
3. Router is automatically available via `trpc.<feature>.*`

**Subaccount-Scoped Resources:**
Always include in Prisma schema:
```prisma
subaccountId String?
subaccount   Subaccount? @relation(fields: [subaccountId], references: [id], onDelete: SetNull)
```

And filter queries:
```typescript
where: {
  userId: ctx.auth.user.id,
  subaccountId: ctx.subaccountId ?? null
}
```

**Pagination:**
- Lists: Use cursor-based with `cursor` + `limit` inputs
- CRM: `CRM_PAGE_SIZE = 20` (contacts/deals)
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
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Prisma client auto-regenerates
4. Restart dev server if types don't update
