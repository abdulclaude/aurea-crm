import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gt, inArray, max, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  commerceGuestPass,
  commerceGuestPassPolicyVersion,
  commerceGuestPassRedemption,
} from "@/db/schema";
import { guestPassPolicyValuesSchema } from "@/features/commerce-settings/contracts";

import {
  exactCommerceSettingsLocation,
  type CommerceSettingsScope,
} from "./access";
import { buildGuestPassIssueDecision } from "./guest-pass-runtime-policy";

export {
  assertGuestPassApprovable,
  assertGuestPassRedeemable,
  buildGuestPassIssueDecision,
} from "./guest-pass-runtime-policy";
export {
  approveGuestPass,
  redeemGuestPass,
  revokeGuestPass,
} from "./guest-pass-lifecycle-service";

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

async function assertOwnerInScope(
  tx: Transaction,
  scope: CommerceSettingsScope,
  ownerClientId: string,
): Promise<void> {
  const [owner] = await tx
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.id, ownerClientId),
        eq(client.organizationId, scope.organizationId),
        exactCommerceSettingsLocation(client.locationId, scope.locationId),
      ),
    )
    .limit(1);
  if (!owner) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }
}

async function findPassByIdempotencyKey(
  tx: Transaction,
  organizationId: string,
  idempotencyKey: string,
) {
  const [row] = await tx
    .select()
    .from(commerceGuestPass)
    .where(
      and(
        eq(commerceGuestPass.organizationId, organizationId),
        eq(commerceGuestPass.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listGuestPasses(input: {
  scope: CommerceSettingsScope;
  ownerClientId: string;
}) {
  const passes = await db
    .select()
    .from(commerceGuestPass)
    .where(
      and(
        scopeWhere(input.scope),
        eq(commerceGuestPass.ownerClientId, input.ownerClientId),
      ),
    )
    .orderBy(desc(commerceGuestPass.issuedAt));
  if (passes.length === 0) return [];
  const redemptions = await db
    .select({
      guestPassId: commerceGuestPassRedemption.guestPassId,
      redeemedAt: max(commerceGuestPassRedemption.redeemedAt),
    })
    .from(commerceGuestPassRedemption)
    .where(
      and(
        eq(
          commerceGuestPassRedemption.organizationId,
          input.scope.organizationId,
        ),
        exactCommerceSettingsLocation(
          commerceGuestPassRedemption.locationId,
          input.scope.locationId,
        ),
        inArray(
          commerceGuestPassRedemption.guestPassId,
          passes.map((pass) => pass.id),
        ),
      ),
    )
    .groupBy(commerceGuestPassRedemption.guestPassId);
  const redeemedAtByPass = new Map(
    redemptions.map((redemption) => [
      redemption.guestPassId,
      redemption.redeemedAt,
    ]),
  );
  return passes.map((pass) => view(pass, redeemedAtByPass.get(pass.id) ?? null));
}

export async function issueGuestPass(input: {
  scope: CommerceSettingsScope;
  actorUserId: string;
  ownerClientId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    const idempotencyLockKey = `${input.scope.organizationId}:${input.idempotencyKey}:guest-pass-issue`;
    const ownerLockKey = `${input.scope.organizationId}:${input.scope.locationId ?? "organization"}:${input.ownerClientId}:guest-pass-issue`;
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyLockKey}, 0))`,
    );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${ownerLockKey}, 0))`,
    );
    const existing = await findPassByIdempotencyKey(
      tx,
      input.scope.organizationId,
      input.idempotencyKey,
    );
    if (existing) {
      if (
        existing.ownerClientId !== input.ownerClientId ||
        existing.locationId !== input.scope.locationId
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This idempotency key belongs to another guest-pass request.",
        });
      }
      return view(existing);
    }
    await assertOwnerInScope(tx, input.scope, input.ownerClientId);
    const [activePolicy] = await tx
      .select()
      .from(commerceGuestPassPolicyVersion)
      .where(
        and(
          eq(
            commerceGuestPassPolicyVersion.organizationId,
            input.scope.organizationId,
          ),
          exactCommerceSettingsLocation(
            commerceGuestPassPolicyVersion.locationId,
            input.scope.locationId,
          ),
          eq(commerceGuestPassPolicyVersion.isActive, true),
        ),
      )
      .limit(1);
    if (!activePolicy) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Configure an active guest-pass policy before issuing passes.",
      });
    }
    const now = new Date();
    const [quota] = await tx
      .select({ total: count() })
      .from(commerceGuestPass)
      .where(
        and(
          scopeWhere(input.scope),
          eq(commerceGuestPass.ownerClientId, input.ownerClientId),
          inArray(commerceGuestPass.status, ["PENDING_APPROVAL", "ACTIVE"]),
          gt(commerceGuestPass.expiresAt, now),
        ),
      );
    const decision = buildGuestPassIssueDecision({
      policyId: activePolicy.id,
      policyVersion: activePolicy.version,
      policy: guestPassPolicyValuesSchema.parse(activePolicy.values),
      outstandingPasses: quota?.total ?? 0,
      issuedAt: now,
    });
    const [created] = await tx
      .insert(commerceGuestPass)
      .values({
        id: createId(),
        ...input.scope,
        ownerClientId: input.ownerClientId,
        policyVersionId: activePolicy.id,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        status: decision.status,
        policySnapshot: decision.policySnapshot,
        idempotencyKey: input.idempotencyKey,
        issuedAt: now,
        expiresAt: decision.expiresAt,
        createdById: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Guest pass could not be issued.",
      });
    }
    return view(created);
  });
}
