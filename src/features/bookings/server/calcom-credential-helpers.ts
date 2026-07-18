import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { calComCredential } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";

const calUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  email: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
});

const calUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/);

export type CalComContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export function requireCalComScope(ctx: CalComContext): {
  organizationId: string;
  locationId: string;
} {
  if (!ctx.orgId || !ctx.locationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a location before managing Cal.com.",
    });
  }
  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

export async function requireCalComManagement(ctx: CalComContext) {
  const scope = requireCalComScope(ctx);
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
    capability: "provider.manage",
  });
  return scope;
}

export async function getScopedCalComCredential(scope: {
  organizationId: string;
  locationId: string;
}) {
  return db.query.calComCredential.findFirst({
    where: and(
      eq(calComCredential.organizationId, scope.organizationId),
      eq(calComCredential.locationId, scope.locationId),
    ),
  });
}

export function calComConnectionView(
  credential: NonNullable<
    Awaited<ReturnType<typeof getScopedCalComCredential>>
  >,
) {
  return {
    id: credential.id,
    isActive: credential.isActive && Boolean(credential.apiKey),
    lastSyncedAt: credential.lastSyncedAt,
    lastError: credential.lastError,
    webhookConfigured: Boolean(
      credential.webhookId &&
        credential.webhookSecret &&
        credential.webhookConfiguredAt,
    ),
    webhookConfiguredAt: credential.webhookConfiguredAt,
    lastWebhookAt: credential.lastWebhookAt,
    lastWebhookError: credential.lastWebhookError,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  };
}

export function calComWebhookSubscriberUrl(credentialId: string): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Set APP_URL before configuring Cal.com webhooks.",
    });
  }
  const baseUrl = new URL(configured);
  if (baseUrl.protocol !== "https:") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Cal.com webhooks require a public HTTPS APP_URL.",
    });
  }
  return new URL(`/api/webhooks/calcom/${credentialId}`, baseUrl).toString();
}

export function extractCalUser(value: unknown): z.infer<typeof calUserSchema> | null {
  const root = record(value);
  const data = record(root?.data);
  for (const candidate of [record(data?.user), data, record(root?.user), root]) {
    const parsed = calUserSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return null;
}

export function requireVerifiedCalUsername(
  user: z.infer<typeof calUserSchema> | null,
): string {
  const parsed = calUsernameSchema.safeParse(user?.username);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cal.com did not return a valid public username for this account.",
    });
  }
  return parsed.data;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
