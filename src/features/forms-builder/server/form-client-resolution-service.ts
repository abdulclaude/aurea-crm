import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { client, form, formSubmission } from "@/db/schema";
import {
  formCrmResolutionConfigSchema,
  type FormCrmResolutionConfig,
} from "@/features/forms-builder/lib/form-crm-resolution";
import {
  normalizeEmailDestination,
  normalizePhoneDestination,
} from "@/features/delivery/lib/normalization";

const MAX_ATTEMPTS = 10;
const STALE_RESOLUTION_MS = 10 * 60 * 1000;

export async function resolveFormSubmissionClient(
  submissionId: string,
): Promise<FormClientResolutionResult> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_RESOLUTION_MS);
  const [claimed] = await db
    .update(formSubmission)
    .set({
      clientResolutionStatus: "RESOLVING",
      clientResolutionAttempts: sql`${formSubmission.clientResolutionAttempts} + 1`,
      clientResolutionError: null,
      lastClientResolutionAttemptAt: now,
    })
    .where(
      and(
        eq(formSubmission.id, submissionId),
        lt(formSubmission.clientResolutionAttempts, MAX_ATTEMPTS),
        or(
          eq(formSubmission.clientResolutionStatus, "PENDING"),
          and(
            eq(formSubmission.clientResolutionStatus, "RESOLVING"),
            lt(formSubmission.lastClientResolutionAttemptAt, staleBefore),
          ),
        ),
      ),
    )
    .returning({ id: formSubmission.id });

  if (!claimed) {
    const existing = await loadResolutionState(submissionId);
    if (!existing)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Form response not found.",
      });
    if (existing.status === "NOT_CONFIGURED") {
      return { status: "NOT_CONFIGURED", clientId: existing.clientId };
    }
    if (existing.status === "REVIEW") {
      return { status: "REVIEW", clientId: existing.clientId };
    }
    if (existing.status === "RESOLVED") {
      return { status: "RESOLVED", clientId: existing.clientId };
    }
    throw new TRPCError({
      code: "CONFLICT",
      message: "Member resolution is already in progress.",
    });
  }

  try {
    return await db.transaction(async (tx) => {
      const [submission] = await tx
        .select({
          id: formSubmission.id,
          formId: formSubmission.formId,
          organizationId: formSubmission.organizationId,
          locationId: formSubmission.locationId,
          values: formSubmission.data,
          config: formSubmission.crmResolutionConfig,
          formName: form.name,
        })
        .from(formSubmission)
        .innerJoin(form, eq(form.id, formSubmission.formId))
        .where(eq(formSubmission.id, submissionId))
        .limit(1)
        .for("update", { of: formSubmission });
      if (!submission?.organizationId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The form response has no organization scope.",
        });
      }
      const parsed = formCrmResolutionConfigSchema.safeParse(submission.config);
      if (!parsed.success || !parsed.data.enabled) {
        await completeResolution(
          tx,
          submission.id,
          "NOT_CONFIGURED",
          null,
          null,
        );
        return { status: "NOT_CONFIGURED" as const, clientId: null };
      }
      const identity = extractIdentity(
        parsed.data,
        jsonObject(submission.values),
      );
      if (!identity.email && !identity.phone) {
        await completeResolution(
          tx,
          submission.id,
          "REVIEW",
          null,
          "The configured identity fields were empty.",
        );
        return { status: "REVIEW" as const, clientId: null };
      }

      const lockKey = `${submission.organizationId}\u0000${submission.locationId ?? ""}\u0000${identity.email ?? identity.phone}`;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );
      const candidates = await findCandidates(tx, {
        organizationId: submission.organizationId,
        locationId: submission.locationId,
        email: identity.email,
        phone: parsed.data.matchBy === "EMAIL_OR_PHONE" ? identity.phone : null,
      });
      if (candidates.length > 1) {
        await completeResolution(
          tx,
          submission.id,
          "REVIEW",
          null,
          "More than one member matches this response.",
        );
        return { status: "REVIEW" as const, clientId: null };
      }

      const resolvedClientId = candidates[0]
        ? await updateMatchedClient(tx, candidates[0], identity, parsed.data)
        : parsed.data.createIfMissing
          ? await createMember(tx, {
              organizationId: submission.organizationId,
              locationId: submission.locationId,
              formId: submission.formId,
              formName: submission.formName,
              identity,
            })
          : null;
      if (!resolvedClientId) {
        await completeResolution(
          tx,
          submission.id,
          "REVIEW",
          null,
          "No matching member was found.",
        );
        return { status: "REVIEW" as const, clientId: null };
      }
      await completeResolution(
        tx,
        submission.id,
        "RESOLVED",
        resolvedClientId,
        null,
      );
      return { status: "RESOLVED" as const, clientId: resolvedClientId };
    });
  } catch (error) {
    await db
      .update(formSubmission)
      .set({
        clientResolutionStatus: "FAILED",
        clientResolutionError:
          error instanceof Error
            ? error.message.slice(0, 2_000)
            : "Member resolution failed.",
      })
      .where(eq(formSubmission.id, submissionId));
    throw error;
  }
}

export type FormClientResolutionResult = {
  status: "NOT_CONFIGURED" | "RESOLVED" | "REVIEW";
  clientId: string | null;
};

type Identity = {
  email: string | null;
  phone: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

function extractIdentity(
  config: FormCrmResolutionConfig,
  values: Record<string, unknown>,
): Identity {
  const rawEmail = fieldText(values, config.emailFieldId);
  const rawPhone = fieldText(values, config.phoneFieldId);
  return {
    email: normalizeOptionalEmail(rawEmail),
    phone: normalizeOptionalPhone(rawPhone),
    fullName: fieldText(values, config.fullNameFieldId),
    firstName: fieldText(values, config.firstNameFieldId),
    lastName: fieldText(values, config.lastNameFieldId),
  };
}

function fieldText(values: Record<string, unknown>, fieldId: string | null) {
  if (!fieldId) return null;
  const value = values[fieldId];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalEmail(value: string | null) {
  if (!value) return null;
  try {
    return normalizeEmailDestination(value);
  } catch {
    return null;
  }
}

function normalizeOptionalPhone(value: string | null) {
  if (!value) return null;
  try {
    return normalizePhoneDestination(value);
  } catch {
    return null;
  }
}

type ResolutionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

async function findCandidates(
  tx: ResolutionTransaction,
  input: {
    organizationId: string;
    locationId: string | null;
    email: string | null;
    phone: string | null;
  },
) {
  const identityConditions = [
    input.email
      ? sql`lower(trim(${client.email})) = ${input.email}`
      : undefined,
    input.phone
      ? sql`regexp_replace(coalesce(${client.phone}, ''), '[^+0-9]', '', 'g') = ${input.phone}`
      : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> =>
    Boolean(condition),
  );
  if (!identityConditions.length) return [];
  return tx
    .select({
      id: client.id,
      name: client.name,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    })
    .from(client)
    .where(
      and(
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
        or(...identityConditions),
      ),
    )
    .limit(3);
}

async function updateMatchedClient(
  tx: ResolutionTransaction,
  matched: Awaited<ReturnType<typeof findCandidates>>[number],
  identity: Identity,
  config: FormCrmResolutionConfig,
) {
  if (config.updateExisting === "NEVER") return matched.id;
  const name =
    (identity.fullName ??
      [identity.firstName, identity.lastName].filter(Boolean).join(" ")) ||
    null;
  await tx
    .update(client)
    .set({
      name: matched.name.trim() ? matched.name : (name ?? matched.name),
      firstName: matched.firstName ?? identity.firstName,
      lastName: matched.lastName ?? identity.lastName,
      email: matched.email ?? identity.email,
      phone: matched.phone ?? identity.phone,
      updatedAt: new Date(),
    })
    .where(eq(client.id, matched.id));
  return matched.id;
}

async function createMember(
  tx: ResolutionTransaction,
  input: {
    organizationId: string;
    locationId: string | null;
    formId: string;
    formName: string;
    identity: Identity;
  },
) {
  const name =
    input.identity.fullName ??
    [input.identity.firstName, input.identity.lastName]
      .filter(Boolean)
      .join(" ");
  if (!name) return null;
  const [created] = await tx
    .insert(client)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      name,
      firstName: input.identity.firstName,
      lastName: input.identity.lastName,
      email: input.identity.email,
      phone: input.identity.phone,
      type: "LEAD",
      source: "FORM",
      metadata: { sourceFormId: input.formId, sourceFormName: input.formName },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: client.id });
  if (!created)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Member creation returned no record.",
    });
  return created.id;
}

async function completeResolution(
  tx: ResolutionTransaction,
  submissionId: string,
  status: "NOT_CONFIGURED" | "RESOLVED" | "REVIEW",
  clientId: string | null,
  error: string | null,
) {
  await tx
    .update(formSubmission)
    .set({
      clientId,
      clientResolutionStatus: status,
      clientResolutionError: error,
      clientResolvedAt: status === "RESOLVED" ? new Date() : null,
    })
    .where(eq(formSubmission.id, submissionId));
}

async function loadResolutionState(submissionId: string) {
  const [row] = await db
    .select({
      clientId: formSubmission.clientId,
      status: formSubmission.clientResolutionStatus,
    })
    .from(formSubmission)
    .where(eq(formSubmission.id, submissionId))
    .limit(1);
  return row;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}
