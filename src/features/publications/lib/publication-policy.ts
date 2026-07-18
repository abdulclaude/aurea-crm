import { TRPCError } from "@trpc/server";

import {
  publicationChannelConfigSchema,
  type PublicationChannelConfig,
  type PublicationKind,
} from "@/features/publications/contracts";

export type PublicationReadiness = {
  publishable: boolean;
  reason: string | null;
};

export function getPublicationReadiness(
  _kind: PublicationKind,
): PublicationReadiness {
  return { publishable: true, reason: null };
}

export function parseChannelConfigForKind(
  kind: PublicationKind,
  value: unknown,
): PublicationChannelConfig {
  const parsed = publicationChannelConfigSchema.safeParse(value);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The publication channel configuration is invalid.",
      cause: parsed.error,
    });
  }
  if (parsed.data.kind !== kind) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The channel configuration does not match the target type.",
    });
  }
  return parsed.data;
}

export function requirePublishableKind(kind: PublicationKind): void {
  const readiness = getPublicationReadiness(kind);
  if (!readiness.publishable) {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: readiness.reason ?? "This target cannot be published yet.",
    });
  }
}
