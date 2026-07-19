import "server-only";

import type { publicationTarget } from "@/db/schema";
import {
  publicationConsentConfigSchema,
  publicationSeoConfigSchema,
} from "@/features/publications/contracts";
import {
  canonicalPublicationValue,
  createPublicationContentHash,
  type PublicationJsonValue,
} from "@/features/publications/lib/content-hash";
import {
  getPublicationReadiness,
  parseChannelConfigForKind,
} from "@/features/publications/lib/publication-policy";
import { buildChannelSourceSnapshot } from "@/features/publications/server/channel-snapshots";
import { buildFormSourceSnapshot } from "@/features/publications/server/form-snapshot";
import { resolvePublicationSource } from "@/features/publications/server/source-resolver";
import { buildThemeSnapshot } from "@/features/publications/server/theme-snapshot";
import { publishedWidgetSourceSchema } from "@/features/publications/public/contracts";

type PublicationTargetRow = typeof publicationTarget.$inferSelect;

export type PublicationSnapshotBundle = {
  contentHash: string;
  snapshot: PublicationJsonValue;
  themeSnapshot: PublicationJsonValue | null;
  seoSnapshot: PublicationJsonValue;
  consentSnapshot: PublicationJsonValue;
  validation: PublicationJsonValue;
  errors: string[];
  warnings: string[];
};

export async function buildPublicationSnapshot(
  target: PublicationTargetRow,
): Promise<PublicationSnapshotBundle> {
  const scope = {
    organizationId: target.organizationId,
    locationId: target.locationId,
  };
  const source = await resolvePublicationSource({
    scope,
    kind: target.kind,
    sourceKey: target.sourceKey,
  });
  const channelConfig = parseChannelConfigForKind(
    target.kind,
    target.channelConfig,
  );
  const seoConfig = publicationSeoConfigSchema.parse(target.seoConfig);
  const consentConfig = publicationConsentConfigSchema.parse(
    target.consentConfig,
  );

  let sourceSnapshot: PublicationJsonValue;
  let sourceErrors: string[] = [];
  let sourceWarnings: string[] = [];
  if (target.kind === "FORM") {
    const formSnapshot = await buildFormSourceSnapshot({
      sourceId: source.sourceId,
      scope,
    });
    sourceSnapshot = formSnapshot.snapshot;
    sourceErrors = formSnapshot.errors;
    sourceWarnings = formSnapshot.warnings;
  } else {
    sourceSnapshot = await buildChannelSourceSnapshot({
      kind: target.kind,
      sourceId: source.sourceId,
      scope,
    });
    if (
      target.kind === "WIDGET" &&
      !publishedWidgetSourceSchema.safeParse(sourceSnapshot).success
    ) {
      sourceErrors.push(
        "This widget does not have a valid active public snapshot.",
      );
    }
  }

  const snapshot = canonicalPublicationValue({
    schemaVersion: 1,
    source: sourceSnapshot,
    channelConfig,
  });
  const themeSnapshot = await buildThemeSnapshot({
    themePresetId: target.themePresetId,
    scope,
  });
  const seoSnapshot = canonicalPublicationValue(seoConfig);
  const consentSnapshot = canonicalPublicationValue(consentConfig);
  const errors: string[] = [...sourceErrors];
  const warnings: string[] = [...sourceWarnings];
  const readiness = getPublicationReadiness(target.kind);
  if (!readiness.publishable && readiness.reason) errors.push(readiness.reason);
  if (!source.publishable) {
    const sourceError =
      source.unavailableReason ?? "This source is not ready to publish.";
    if (!errors.includes(sourceError)) errors.push(sourceError);
  }
  if (
    consentConfig.mode === "REQUIRED" &&
    consentConfig.privacyPolicyUrl === null
  ) {
    errors.push("A privacy policy URL is required when consent is required.");
  }
  if (
    consentConfig.mode === "REQUIRED" &&
    consentConfig.categories.length === 0
  ) {
    errors.push(
      "Select at least one optional data category when consent is required.",
    );
  }
  if (
    target.kind === "FORM" &&
    channelConfig.kind === "FORM" &&
    channelConfig.submissionMode === "ENABLED" &&
    consentConfig.privacyPolicyUrl === null
  ) {
    errors.push(
      "A privacy policy URL is required before this form can accept responses.",
    );
  }
  const validation = canonicalPublicationValue({ errors, warnings });
  const contentHash = createPublicationContentHash({
    schemaVersion: 1,
    snapshot,
    themeSnapshot,
    seoSnapshot,
    consentSnapshot,
  });
  return {
    contentHash,
    snapshot,
    themeSnapshot,
    seoSnapshot,
    consentSnapshot,
    validation,
    errors,
    warnings,
  };
}
