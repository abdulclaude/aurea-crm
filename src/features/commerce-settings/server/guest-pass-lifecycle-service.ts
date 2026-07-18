import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  commerceGuestPass,
  commerceGuestPassRedemption,
} from "@/db/schema";

import {
  exactCommerceSettingsLocation,
  type CommerceSettingsScope,
} from "./access";
import {
  assertGuestPassApprovable,
  assertGuestPassRedeemable,
} from "./guest-pass-runtime-policy";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type GuestPassRow = typeof commerceGuestPass.$inferSelect;

function scopeWhere(scope: CommerceSettingsScope) {
  return and(
    eq(commerceGuestPass.organizationId, scope.organizationId),
    exactCommerceSettingsLocation(
      commerceGuestPass.locationId,
      scope.locationId,
    ),
  );
}

function view(row: GuestPassRow, redeemedAt: Date | null = null) {
  const status =
    (row.status === "ACTIVE" || row.status === "PENDING_APPROVAL") &&
    row.expiresAt <= new Date()
      ? "EXPIRED"
      : row.status;
  return { ...row, status, redeemedAt };
}

async function lockAndLoadPass(
  tx: Transaction,
  scope: CommerceSettingsScope,
  guestPassId: string,
): Promise<GuestPassRow> {
  const locationPredicate = scope.locationId
    ? sql`"locationId" = ${scope.locationId}`
    : sql`"locationId" IS NULL`;
  await tx.execute(
    sql`SELECT "id" FROM "CommerceGuestPass"
        WHERE "id" = ${guestPassId}
          AND "organizationId" = ${scope.organizationId}
          AND ${locationPredicate}
        FOR UPDATE`,
  );
  const [pass] = await tx
    .select()
    .from(commerceGuestPass)
    .where(and(scopeWhere(scope), eq(commerceGuestPass.id, guestPassId)))
    .limit(1);
  if (!pass) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Guest pass not found." });
  }
  return pass;
}

async function findRedemptionByIdempotencyKey(
  tx: Transaction,
  organizationId: string,
  idempotencyKey: string,
) {
  const [row] = await tx
    .select()
    .from(commerceGuestPassRedemption)
    .where(
      and(
        eq(commerceGuestPassRedemption.organizationId, organizationId),
        eq(commerceGuestPassRedemption.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function approveGuestPass(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  guestPassId: string;
}) {
  return db.transaction(async (tx) => {
    const pass = await lockAndLoadPass(tx, input.scope, input.guestPassId);
    if (pass.status === "ACTIVE") return view(pass);
    const now = new Date();
    assertGuestPassApprovable(pass, now);
    const [approved] = await tx
      .update(commerceGuestPass)
      .set({
        status: "ACTIVE",
        approvedAt: now,
        approvedById: input.actorUserId,
        updatedAt: now,
      })
      .where(
        and(
          scopeWhere(input.scope),
          eq(commerceGuestPass.id, pass.id),
          eq(commerceGuestPass.status, "PENDING_APPROVAL"),
        ),
      )
      .returning();
    if (!approved) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Guest pass status changed while it was being approved.",
      });
    }
    return view(approved);
  });
}

export async function revokeGuestPass(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  guestPassId: string;
}) {
  return db.transaction(async (tx) => {
    const pass = await lockAndLoadPass(tx, input.scope, input.guestPassId);
    if (pass.status === "REVOKED") return view(pass);
    if (pass.status !== "ACTIVE" && pass.status !== "PENDING_APPROVAL") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Only active or pending guest passes can be revoked.",
      });
    }
    const now = new Date();
    const [revoked] = await tx
      .update(commerceGuestPass)
      .set({
        status: "REVOKED",
        revokedAt: now,
        revokedById: input.actorUserId,
        updatedAt: now,
      })
      .where(
        and(
          scopeWhere(input.scope),
          eq(commerceGuestPass.id, pass.id),
          inArray(commerceGuestPass.status, ["PENDING_APPROVAL", "ACTIVE"]),
        ),
      )
      .returning();
    if (!revoked) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Guest pass status changed while it was being revoked.",
      });
    }
    return view(revoked);
  });
}

export async function redeemGuestPass(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  guestPassId: string;
  bookingReference: string | null;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    const idempotencyLockKey = `${input.scope.organizationId}:${input.idempotencyKey}:guest-pass-redemption`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyLockKey}, 0))`,
    );
    const existing = await findRedemptionByIdempotencyKey(
      tx,
      input.scope.organizationId,
      input.idempotencyKey,
    );
    if (existing) {
      if (
        existing.guestPassId !== input.guestPassId ||
        existing.locationId !== input.scope.locationId
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This idempotency key belongs to another redemption.",
        });
      }
      const pass = await lockAndLoadPass(tx, input.scope, input.guestPassId);
      return { pass: view(pass, existing.redeemedAt), redemption: existing };
    }
    const pass = await lockAndLoadPass(tx, input.scope, input.guestPassId);
    const replay = await findRedemptionByIdempotencyKey(
      tx,
      input.scope.organizationId,
      input.idempotencyKey,
    );
    if (replay) {
      if (
        replay.guestPassId !== pass.id ||
        replay.locationId !== input.scope.locationId
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This idempotency key belongs to another redemption.",
        });
      }
      return { pass: view(pass, replay.redeemedAt), redemption: replay };
    }
    const now = new Date();
    assertGuestPassRedeemable(pass, now);
    const [redemption] = await tx
      .insert(commerceGuestPassRedemption)
      .values({
        id: createId(),
        guestPassId: pass.id,
        ...input.scope,
        bookingReference: input.bookingReference,
        idempotencyKey: input.idempotencyKey,
        redeemedById: input.actorUserId,
        redeemedAt: now,
        createdAt: now,
      })
      .returning();
    if (!redemption) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Guest pass redemption could not be recorded.",
      });
    }
    const nextUsedCount = pass.usedCount + 1;
    const [updated] = await tx
      .update(commerceGuestPass)
      .set({
        usedCount: sql`${commerceGuestPass.usedCount} + 1`,
        status: nextUsedCount >= pass.allowedUses ? "REDEEMED" : "ACTIVE",
        updatedAt: now,
      })
      .where(
        and(
          scopeWhere(input.scope),
          eq(commerceGuestPass.id, pass.id),
          eq(commerceGuestPass.status, "ACTIVE"),
          eq(commerceGuestPass.usedCount, pass.usedCount),
          sql`${commerceGuestPass.usedCount} < ${commerceGuestPass.allowedUses}`,
          gt(commerceGuestPass.expiresAt, now),
        ),
      )
      .returning();
    if (!updated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Guest pass availability changed during redemption.",
      });
    }
    return { pass: view(updated, now), redemption };
  });
}
