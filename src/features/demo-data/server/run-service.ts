import "server-only";

import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { activity, demoDataRecord, demoDataRun } from "@/db/schema";
import {
  DEMO_DATA_SCHEMA_VERSION,
  demoConfirmationText,
  demoRecoveryConfirmationText,
  existingDemoProductDataTotal,
  type DemoDataProfile,
} from "@/features/demo-data/contracts";
import { decideDemoRunRecovery } from "@/features/demo-data/server/recovery-policy";
import {
  getExistingDataCounts,
  type DemoDataScope,
} from "@/features/demo-data/server/scope";
import { deterministicDemoId } from "@/features/demo-data/server/types";

const countSchema = z.record(z.string(), z.number().int().nonnegative());

export async function prepareDemoDataRun(input: {
  scope: DemoDataScope;
  profile: DemoDataProfile;
  confirmation: string;
  idempotencyKey: string;
  allowExistingData: boolean;
  referenceDate: Date;
}): Promise<{ kind: "created"; runId: string } | { kind: "replay"; runId: string; counts: Record<string, number> }> {
  if (input.confirmation !== demoConfirmationText(input.scope.locationName)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The confirmation text does not match the active location." });
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:${input.scope.locationId}`}, 0))`);
    const replay = await tx.query.demoDataRun.findFirst({
      where: and(
        eq(demoDataRun.organizationId, input.scope.organizationId),
        eq(demoDataRun.locationId, input.scope.locationId),
        eq(demoDataRun.idempotencyKey, input.idempotencyKey),
      ),
    });
    if (replay?.status === "COMPLETED") {
      return { kind: "replay" as const, runId: replay.id, counts: countSchema.catch({}).parse(replay.counts) };
    }
    if (replay) throw new TRPCError({ code: "CONFLICT", message: "This demo population request is already in progress or failed." });

    const active = await tx.query.demoDataRun.findFirst({
      where: and(
        eq(demoDataRun.organizationId, input.scope.organizationId),
        eq(demoDataRun.locationId, input.scope.locationId),
        inArray(demoDataRun.status, ["RUNNING", "CLEARING"]),
      ),
      columns: { id: true },
    });
    if (active) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Another demo data operation is already running for this location. Resolve the run before retrying.",
      });
    }

    const existingCounts = await getExistingDataCounts(input.scope);
    if (
      existingDemoProductDataTotal(existingCounts) > 0 &&
      !input.allowExistingData
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "This location already contains data. Confirm that demo fixtures may be added alongside it.",
      });
    }
    const runId = crypto.randomUUID();
    const now = new Date();
    await tx.insert(demoDataRun).values({
      id: runId,
      organizationId: input.scope.organizationId,
      locationId: input.scope.locationId,
      profile: input.profile,
      status: "RUNNING",
      schemaVersion: DEMO_DATA_SCHEMA_VERSION,
      idempotencyKey: input.idempotencyKey,
      requestedByUserId: input.scope.userId,
      referenceDate: input.referenceDate,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { kind: "created" as const, runId };
  });
}

export async function markDemoDataRunFailed(input: {
  runId: string;
  scope: DemoDataScope;
  error: unknown;
}): Promise<void> {
  const message = input.error instanceof Error ? input.error.message : "Unknown demo population failure";
  const now = new Date();
  await db.update(demoDataRun).set({
    status: "FAILED",
    errorMessage: message.slice(0, 1_000),
    failedAt: now,
    updatedAt: now,
  }).where(and(
    eq(demoDataRun.id, input.runId),
    eq(demoDataRun.organizationId, input.scope.organizationId),
    eq(demoDataRun.locationId, input.scope.locationId),
    eq(demoDataRun.status, "RUNNING"),
  ));
}

export async function recoverInterruptedDemoDataRun(input: {
  runId: string;
  scope: DemoDataScope;
  confirmation: string;
}): Promise<{ status: "FAILED" | "CLEARED"; registryCount: number }> {
  if (
    input.confirmation !==
    demoRecoveryConfirmationText(input.scope.locationName)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The recovery confirmation does not match the active location.",
    });
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.scope.organizationId}:${input.scope.locationId}`}, 0))`,
    );
    const [run] = await tx
      .select({
        id: demoDataRun.id,
        profile: demoDataRun.profile,
        schemaVersion: demoDataRun.schemaVersion,
        status: demoDataRun.status,
        updatedAt: demoDataRun.updatedAt,
      })
      .from(demoDataRun)
      .where(
        and(
          eq(demoDataRun.id, input.runId),
          eq(demoDataRun.organizationId, input.scope.organizationId),
          eq(demoDataRun.locationId, input.scope.locationId),
        ),
      )
      .limit(1)
      .for("update");
    if (!run) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "The demo data run is not available in this location.",
      });
    }
    if (run.status !== "RUNNING" && run.status !== "CLEARING") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Only an interrupted active demo operation can be recovered.",
      });
    }
    const [registry] = await tx
      .select({ value: count() })
      .from(demoDataRecord)
      .where(eq(demoDataRecord.runId, run.id));
    const registryCount = registry?.value ?? 0;
    const now = new Date();
    const decision = decideDemoRunRecovery({
      status: run.status,
      updatedAt: run.updatedAt,
      now,
      registryCount,
    });
    if (decision.kind === "TOO_RECENT") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This demo operation is still within its active recovery window.",
      });
    }

    const status = decision.kind === "MARK_CLEARED" ? "CLEARED" : "FAILED";
    await tx
      .update(demoDataRun)
      .set({
        status,
        clearedAt: status === "CLEARED" ? now : null,
        failedAt: status === "FAILED" ? now : null,
        errorMessage:
          status === "FAILED"
            ? "The demo data operation was marked as interrupted by an authorized user."
            : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(demoDataRun.id, run.id),
          eq(demoDataRun.organizationId, input.scope.organizationId),
          eq(demoDataRun.locationId, input.scope.locationId),
          eq(demoDataRun.status, run.status),
        ),
      );
    await tx
      .insert(activity)
      .values({
        id: deterministicDemoId(run.id, "recovery-audit", status),
        organizationId: input.scope.organizationId,
        locationId: input.scope.locationId,
        userId: input.scope.userId,
        type: "LOCATION",
        action: "STATUS_CHANGED",
        entityType: "demo_data_run",
        entityId: run.id,
        entityName: input.scope.locationName,
        metadata: {
          profile: run.profile,
          schemaVersion: run.schemaVersion,
          recoveredStatus: status,
          registryCount,
        },
        createdAt: now,
      })
      .onConflictDoNothing();
    return { status, registryCount };
  });
}
