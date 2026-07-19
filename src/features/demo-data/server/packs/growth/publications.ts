import { createPublicationContentHash } from "@/features/publications/lib/content-hash";

import { before, sha256 } from "./shared";
import type {
  FormFixtures,
  GrowthBuildScope,
  GrowthPackFixtures,
  PublicationFixtures,
} from "./types";

export function buildPublicationFixtures(
  scope: GrowthBuildScope,
  formFixtures: FormFixtures,
): PublicationFixtures {
  const { context, id } = scope;
  const {
    organizationId,
    locationId,
    actorUserId,
    referenceDate,
    runId,
  } = context;
  const { publishedFormId, formSteps, formFields } = formFixtures;
  const targetId = id("publication-target", "form");
  const versionId = id("publication-version", "form-2");
  const seoConfig = {
    title: "Aurea Demo Studio",
    description: "A private demonstration of a complete wellness studio journey.",
    imageUrl: null,
    canonicalUrl: null,
    index: false,
    follow: false,
  };
  const consentConfig = {
    mode: "REQUIRED" as const,
    version: "1.0",
    privacyPolicyUrl: "https://demo.invalid/privacy",
    categories: ["ANALYTICS"] as const,
  };
  const channelConfig = {
    kind: "FORM" as const,
    submissionMode: "DISABLED" as const,
    responseRetentionDays: 365,
    responseConsentLabel:
      "I agree to the demo privacy policy and the use of my response.",
    height: 720,
    transparentBackground: false,
    allowedFrameOrigins: [],
  };
  const publicationTargets: GrowthPackFixtures["publicationTargets"] = [
    {
      id: targetId,
      organizationId,
      locationId,
      kind: "FORM",
      sourceKey: `form:${publishedFormId}`,
      sourceId: publishedFormId,
      name: "New member consultation",
      slug: `new-member-consultation-${runId.slice(0, 8)}`,
      status: "PAUSED",
      publishedVersionId: versionId,
      domainHost: null,
      domainVerificationToken: sha256(`${runId}:form-domain-token`),
      domainStatus: "NOT_CONFIGURED",
      sslStatus: "NOT_CONFIGURED",
      seoConfig,
      consentConfig,
      channelConfig,
      publishedAt: before(referenceDate, 7),
      createdById: actorUserId,
      updatedById: actorUserId,
      updatedAt: before(referenceDate, 7),
    },
  ];
  const fieldsByStep = new Map(
    formSteps.map((step) => [
      step.id,
      formFields
        .filter((field) => field.stepId === step.id)
        .map((field) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          required: field.required ?? false,
          validation: field.validation ?? {},
          options: Array.isArray(field.options) ? field.options : [],
          defaultValue: field.defaultValue ?? null,
          order: field.order ?? 0,
        })),
    ]),
  );
  const source = {
    type: "FORM",
    definitionSchemaVersion: 1,
    form: {
      id: publishedFormId,
      name: "New member consultation",
      description: "A three-step consultation for goals, preferences, and consent.",
      isMultiStep: true,
      showProgress: true,
      successMessage:
        "Thanks. The studio team will review your goals and recommend a first session.",
      redirectUrl: null,
      workflowId: null,
      locationId,
      updatedAt: before(referenceDate, 12).toISOString(),
    },
    steps: formSteps.slice(0, 3).map((step) => ({
      id: step.id,
      name: step.name,
      order: step.order ?? 0,
      fields: fieldsByStep.get(step.id) ?? [],
    })),
  };
  const snapshot = { schemaVersion: 1, source, channelConfig };
  const publicationVersions: GrowthPackFixtures["publicationVersions"] = [
    {
      id: versionId,
      targetId,
      version: 2,
      snapshotSchemaVersion: 1,
      contentHash: createPublicationContentHash({
        schemaVersion: 1,
        snapshot,
        themeSnapshot: null,
        seoSnapshot: seoConfig,
        consentSnapshot: consentConfig,
      }),
      snapshot,
      themeSnapshot: null,
      seoSnapshot: seoConfig,
      consentSnapshot: consentConfig,
      validation: { valid: true, warnings: [], demo: true },
      changeNote: "Published demo consultation",
      isRollback: false,
      createdById: actorUserId,
      createdAt: before(referenceDate, 7),
    },
  ];

  return { publicationTargets, publicationVersions };
}
