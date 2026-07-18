import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { CredentialType, type CredentialType as CredentialTypeValue } from "@/db/enums";
import { credential } from "@/db/schema";
import {
  aiCredentialMatchesExactScope,
  selectAiCredentialCandidate,
} from "@/features/ai/lib/credential-selection";
import { decrypt } from "@/lib/encryption";

export const AI_CREDENTIAL_TYPES = [
  CredentialType.GEMINI,
  CredentialType.OPENAI,
  CredentialType.ANTHROPIC,
] as const;

export type AiCredentialType = (typeof AI_CREDENTIAL_TYPES)[number];

export class ScopedAiCredentialError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_CONFIGURED" | "AMBIGUOUS" | "INVALID_SECRET",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ScopedAiCredentialError";
  }
}

export type ResolvedAiCredential = {
  id: string;
  organizationId: string;
  locationId: string | null;
  type: AiCredentialType;
  apiKey: string;
};

function isAiCredentialType(type: CredentialTypeValue): type is AiCredentialType {
  return AI_CREDENTIAL_TYPES.some((candidate) => candidate === type);
}

export async function resolveScopedAiCredential(input: {
  organizationId: string;
  locationId: string | null;
  type: AiCredentialType;
  credentialId?: string;
}): Promise<ResolvedAiCredential> {
  const rows = await db
    .select({
      id: credential.id,
      organizationId: credential.organizationId,
      locationId: credential.locationId,
      type: credential.type,
      value: credential.value,
      isDefault: credential.isDefault,
    })
    .from(credential)
    .where(
      and(
        eq(credential.organizationId, input.organizationId),
        input.locationId
          ? eq(credential.locationId, input.locationId)
          : isNull(credential.locationId),
        eq(credential.type, input.type),
        eq(credential.isActive, true),
        input.credentialId
          ? eq(credential.id, input.credentialId)
          : undefined,
      ),
    )
    .orderBy(desc(credential.isDefault), asc(credential.createdAt), asc(credential.id))
    .limit(input.credentialId ? 1 : 3);

  const selection = selectAiCredentialCandidate(rows);
  if (selection.status === "missing") {
    throw new ScopedAiCredentialError(
      `Configure a ${input.type} credential for the active account before using AI.`,
      "NOT_CONFIGURED",
    );
  }

  if (!input.credentialId && selection.status === "ambiguous") {
    throw new ScopedAiCredentialError(
      `More than one ${input.type} credential exists for the active account. Select a credential explicitly before using AI.`,
      "AMBIGUOUS",
    );
  }

  if (selection.status !== "selected") {
    throw new ScopedAiCredentialError(
      `The selected ${input.type} credential is not available.`,
      "NOT_CONFIGURED",
    );
  }
  const selected = selection.credential;
  if (!aiCredentialMatchesExactScope({ credential: selected, expected: input })) {
    throw new ScopedAiCredentialError(
      "The selected AI credential does not belong to the active account.",
      "NOT_CONFIGURED",
    );
  }
  if (!isAiCredentialType(selected.type)) {
    throw new ScopedAiCredentialError(
      "The selected credential is not an AI provider credential.",
      "NOT_CONFIGURED",
    );
  }

  let apiKey: string;
  try {
    apiKey = decrypt(selected.value).trim();
  } catch (error) {
    throw new ScopedAiCredentialError(
      `The ${input.type} credential for the active account could not be decrypted.`,
      "INVALID_SECRET",
      { cause: error },
    );
  }

  if (!apiKey) {
    throw new ScopedAiCredentialError(
      `The ${input.type} credential for the active account is empty.`,
      "INVALID_SECRET",
    );
  }

  return {
    id: selected.id,
    organizationId: selected.organizationId,
    locationId: selected.locationId,
    type: selected.type,
    apiKey,
  };
}
