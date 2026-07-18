import { NonRetriableError } from "inngest";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { AppProvider } from "@/db/enums";
import { apps } from "@/db/schema";
import {
  fullMindbodySync,
  syncClientBookingsAndMemberships,
  syncMindbodyClasses,
  syncMindbodyClients,
  type SyncResult,
} from "@/features/modules/pilates-studio/server/sync";
import { inngest } from "@/inngest/client";

const mindbodySyncEventSchema = z
  .object({
    appId: z.string().min(1).max(128),
    organizationId: z.string().min(1).max(128),
    locationId: z.string().min(1).max(128).nullable().optional(),
  })
  .strict();

const mindbodyClientSyncEventSchema = mindbodySyncEventSchema.extend({
  clientId: z.string().min(1).max(128),
  mindbodyClientId: z.string().min(1).max(256),
});

type MindbodySyncEvent = z.infer<typeof mindbodySyncEventSchema>;

export const processMindbodySync = inngest.createFunction(
  {
    id: "process-mindbody-sync",
    retries: 2,
    idempotency: "event.id",
    concurrency: [{ limit: 1, key: "event.data.appId" }, { limit: 2 }],
    timeouts: { start: "10m", finish: "2h" },
  },
  [
    { event: "mindbody/sync.full" },
    { event: "mindbody/sync.clients" },
    { event: "mindbody/sync.classes" },
    { event: "mindbody/sync.client" },
  ],
  async ({ event, step }) => {
    if (event.name === "mindbody/sync.client") {
      const input = parseEvent(mindbodyClientSyncEventSchema, event.data);
      return step.run("sync-client-bookings-and-memberships", async () => {
        const app = await loadScopedMindbodyApp(input);
        const result = await syncClientBookingsAndMemberships(
          app,
          input.clientId,
          input.mindbodyClientId,
          scopeFromEvent(input),
        );
        return requireSuccessfulResult("Mindbody client detail sync", result);
      });
    }

    const input = parseEvent(mindbodySyncEventSchema, event.data);
    if (event.name === "mindbody/sync.clients") {
      return step.run("sync-mindbody-clients", async () => {
        const app = await loadScopedMindbodyApp(input);
        const result = await syncMindbodyClients(app, scopeFromEvent(input));
        return requireSuccessfulResult("Mindbody client sync", result);
      });
    }

    if (event.name === "mindbody/sync.classes") {
      return step.run("sync-mindbody-classes", async () => {
        const app = await loadScopedMindbodyApp(input);
        const result = await syncMindbodyClasses(app, scopeFromEvent(input));
        return requireSuccessfulResult("Mindbody class sync", result);
      });
    }

    if (event.name === "mindbody/sync.full") {
      return step.run("run-full-mindbody-sync", async () => {
        const app = await loadScopedMindbodyApp(input);
        const result = await fullMindbodySync(app, scopeFromEvent(input));
        requireSuccessfulResult("Mindbody full client sync", result.clients);
        requireSuccessfulResult("Mindbody full class sync", result.classes);
        requireSuccessfulResult(
          "Mindbody full booking and membership sync",
          result.bookingsAndMemberships,
        );
        return result;
      });
    }

    throw new NonRetriableError("Mindbody sync event type is not supported.");
  },
);

function parseEvent<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new NonRetriableError("Mindbody sync event payload is invalid.");
  }
  return parsed.data;
}

function scopeFromEvent(input: MindbodySyncEvent): {
  organizationId: string;
  locationId: string | null;
} {
  return {
    organizationId: input.organizationId,
    locationId: input.locationId ?? null,
  };
}

async function loadScopedMindbodyApp(input: MindbodySyncEvent) {
  const app = await db.query.apps.findFirst({
    where: and(
      eq(apps.id, input.appId),
      eq(apps.organizationId, input.organizationId),
      input.locationId
        ? eq(apps.locationId, input.locationId)
        : isNull(apps.locationId),
      eq(apps.provider, AppProvider.MINDBODY),
    ),
    columns: {
      id: true,
      organizationId: true,
      locationId: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
      expiresAt: true,
      scopes: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (!app) {
    throw new NonRetriableError(
      "Mindbody connection is not valid for the persisted event scope.",
    );
  }

  return app;
}

function requireSuccessfulResult(
  label: string,
  result: SyncResult,
): SyncResult {
  if (result.success) return result;
  const summary = result.errors.slice(0, 3).join("; ");
  throw new Error(`${label} failed${summary ? `: ${summary}` : "."}`);
}
