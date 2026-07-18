import { randomBytes, randomUUID } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { calComCredential, calComWebhookReceipt } from "@/db/schema";
import { createCalComClient } from "@/lib/calcom";
import { decrypt, encrypt } from "@/lib/encryption";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

import { syncCalComEventTypes } from "./calcom-event-type-sync";
import {
  calComConnectionView,
  calComWebhookSubscriberUrl,
  extractCalUser,
  getScopedCalComCredential,
  requireVerifiedCalUsername,
  requireCalComManagement,
  requireCalComScope,
} from "./calcom-credential-helpers";

const WEBHOOK_TRIGGERS = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
] as const;

export const calComCredentialsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const scope = requireCalComScope(ctx);
    const credential = await getScopedCalComCredential(scope);
    return credential?.isActive && credential.apiKey
      ? calComConnectionView(credential)
      : null;
  }),

  getRecentReceipts: protectedProcedure.query(async ({ ctx }) => {
    const scope = requireCalComScope(ctx);
    return db
      .select({
        id: calComWebhookReceipt.id,
        triggerEvent: calComWebhookReceipt.triggerEvent,
        status: calComWebhookReceipt.status,
        outcome: calComWebhookReceipt.outcome,
        receivedAt: calComWebhookReceipt.receivedAt,
        workflowDispatchedAt: calComWebhookReceipt.workflowDispatchedAt,
        workflowDispatchError: calComWebhookReceipt.workflowDispatchError,
      })
      .from(calComWebhookReceipt)
      .where(
        and(
          eq(calComWebhookReceipt.organizationId, scope.organizationId),
          eq(calComWebhookReceipt.locationId, scope.locationId),
        ),
      )
      .orderBy(desc(calComWebhookReceipt.receivedAt))
      .limit(20);
  }),

  testConnection: protectedProcedure
    .input(z.object({ apiKey: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireCalComManagement(ctx);
      try {
        const response: unknown = await createCalComClient(input.apiKey).getMe();
        const user = extractCalUser(response);
        return {
          success: true,
          user: user
            ? {
                id: user.id,
                email: user.email ?? "",
                name: user.name ?? "Cal.com",
                username: user.username ?? "",
              }
            : null,
        };
      } catch {
        return { success: false, user: null };
      }
    }),

  upsert: protectedProcedure
    .input(z.object({ apiKey: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const scope = await requireCalComManagement(ctx);
      let calUser: ReturnType<typeof extractCalUser>;
      let calUsername: string;
      try {
        const response: unknown = await createCalComClient(input.apiKey).getMe();
        calUser = extractCalUser(response);
        calUsername = requireVerifiedCalUsername(calUser);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cal.com rejected this API key.",
          cause: error,
        });
      }

      const existing = await getScopedCalComCredential(scope);
      if (existing?.webhookId && existing.apiKey) {
        await createCalComClient(decrypt(existing.apiKey))
          .deleteWebhook(existing.webhookId)
          .catch(() => undefined);
      }
      const values = {
        apiKey: encrypt(input.apiKey),
        calUserId:
          typeof calUser?.id === "number"
            ? calUser.id
            : Number.isSafeInteger(Number(calUser?.id))
              ? Number(calUser?.id)
              : null,
        calUsername,
        isActive: true,
        lastError: null,
        webhookId: null,
        webhookSecret: null,
        webhookConfiguredAt: null,
        lastWebhookError: null,
        updatedAt: new Date(),
      };
      const [credential] = existing
        ? await db
            .update(calComCredential)
            .set(values)
            .where(
              and(
                eq(calComCredential.id, existing.id),
                eq(calComCredential.organizationId, scope.organizationId),
                eq(calComCredential.locationId, scope.locationId),
              ),
            )
            .returning()
        : await db
            .insert(calComCredential)
            .values({
              id: randomUUID(),
              ...scope,
              ...values,
              createdAt: new Date(),
            })
            .returning();
      if (!credential) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save the Cal.com connection.",
        });
      }
      return calComConnectionView(credential);
    }),

  configureWebhook: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await requireCalComManagement(ctx);
    const credential = await getScopedCalComCredential(scope);
    if (!credential?.isActive || !credential.apiKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Connect Cal.com before configuring its webhook.",
      });
    }
    const subscriberUrl = calComWebhookSubscriberUrl(credential.id);
    const secret = randomBytes(32).toString("hex");
    const client = createCalComClient(decrypt(credential.apiKey));
    if (credential.webhookId) {
      await client.deleteWebhook(credential.webhookId);
    }
    const remote = await client.createWebhook({
      subscriberUrl,
      triggers: [...WEBHOOK_TRIGGERS],
      secret,
    });
    const now = new Date();
    const [updated] = await db
      .update(calComCredential)
      .set({
        webhookId: remote.id,
        webhookSecret: encrypt(secret),
        webhookConfiguredAt: now,
        lastWebhookError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(calComCredential.id, credential.id),
          eq(calComCredential.organizationId, scope.organizationId),
          eq(calComCredential.locationId, scope.locationId),
        ),
      )
      .returning();
    if (!updated) {
      await client.deleteWebhook(remote.id).catch(() => undefined);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cal.com webhook registration could not be saved.",
      });
    }
    return calComConnectionView(updated);
  }),

  syncEventTypes: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await requireCalComManagement(ctx);
    const credential = await getScopedCalComCredential(scope);
    if (!credential?.isActive || !credential.apiKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Connect Cal.com before syncing event types.",
      });
    }
    try {
      return await syncCalComEventTypes({
        ...scope,
        credentialId: credential.id,
        encryptedApiKey: credential.apiKey,
      });
    } catch (error) {
      await db
        .update(calComCredential)
        .set({ lastError: "Event type sync failed", updatedAt: new Date() })
        .where(
          and(
            eq(calComCredential.id, credential.id),
            eq(calComCredential.organizationId, scope.organizationId),
            eq(calComCredential.locationId, scope.locationId),
          ),
        );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sync Cal.com event types.",
        cause: error,
      });
    }
  }),

  remove: protectedProcedure.mutation(async ({ ctx }) => {
    const scope = await requireCalComManagement(ctx);
    const credential = await getScopedCalComCredential(scope);
    if (!credential) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cal.com connection not found." });
    }
    if (credential.webhookId && credential.apiKey) {
      await createCalComClient(decrypt(credential.apiKey)).deleteWebhook(
        credential.webhookId,
      );
    }
    await db
      .update(calComCredential)
      .set({
        apiKey: null,
        isActive: false,
        webhookId: null,
        webhookSecret: null,
        webhookConfiguredAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(calComCredential.id, credential.id),
          eq(calComCredential.organizationId, scope.organizationId),
          eq(calComCredential.locationId, scope.locationId),
        ),
      );
    return { success: true };
  }),
});
