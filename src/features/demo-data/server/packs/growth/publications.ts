import { createPublicationContentHash } from "@/features/publications/lib/content-hash";

import type {
  FormFixtures,
  GrowthBuildScope,
  GrowthPackFixtures,
  PublicationFixtures,
} from "./types";
import { before, sha256 } from "./shared";

export function buildPublicationFixtures(
  scope: GrowthBuildScope,
  formFixtures: FormFixtures,
): PublicationFixtures {
  const { context, id, metadata } = scope;
  const { organizationId, locationId, actorUserId, referenceDate, runId } = context;
  const { publishedFormId, formSteps, formFields } = formFixtures;
const internalFunnelId = id("funnel", "studio-reset");
const externalFunnelId = id("funnel", "partner");
const funnels: GrowthPackFixtures["funnels"] = [
  {
    id: internalFunnelId,
    name: "28-day studio reset",
    description: "A safe draft demo funnel with no executable custom code.",
    status: "DRAFT",
    organizationId,
    locationId,
    publishedAt: null,
    funnelType: "INTERNAL",
    isReadOnly: false,
    trackingConfig: metadata({ consentMode: "CONSENTED" }),
    updatedAt: before(referenceDate, 7),
  },
  {
    id: externalFunnelId,
    name: "Partner wellness guide",
    description: "Read-only external funnel fixture with no API key or live domain.",
    status: "DRAFT",
    organizationId,
    locationId,
    funnelType: "EXTERNAL",
    isReadOnly: true,
    externalUrl: "https://partner.demo.invalid/wellness-guide",
    externalDomains: ["partner.demo.invalid"],
    externalMetadata: metadata({ connection: "DISCONNECTED" }),
    trackingConfig: metadata({ disabled: true }),
    updatedAt: before(referenceDate, 18),
  },
];
const pageDefinitions = [
  ["Start", "start", "A calmer way to build consistency"],
  ["Your plan", "plan", "A 28-day plan shaped around real life"],
  ["Book", "book", "Choose your first studio session"],
] as const;
const funnelPages: GrowthPackFixtures["funnelPages"] = pageDefinitions.map(
  ([name, slug, title], index) => ({
    id: id("funnel-page", index),
    funnelId: internalFunnelId,
    name,
    slug,
    order: index,
    isPublished: true,
    metaTitle: title,
    metaDescription: "A demo wellness studio journey built with Aurea's existing visual language.",
    customCss: null,
    customJs: null,
    updatedAt: before(referenceDate, 7),
  }),
);
const blockTypes = ["SECTION", "HEADING", "PARAGRAPH", "BUTTON", "FEATURE_GRID", "TESTIMONIAL"] as const;
const funnelBlocks: GrowthPackFixtures["funnelBlocks"] = [];
for (const [pageIndex, page] of funnelPages.entries()) {
  for (let blockIndex = 0; blockIndex < blockTypes.length; blockIndex += 1) {
    const type = blockTypes[blockIndex] ?? "PARAGRAPH";
    funnelBlocks.push({
      id: id(`funnel-page-${pageIndex}-block`, blockIndex),
      pageId: page.id,
      type,
      props: type === "HEADING"
        ? { text: pageDefinitions[pageIndex]?.[2] ?? "Studio reset" }
        : type === "BUTTON"
          ? { text: "Continue", href: pageIndex === 2 ? "/forms/new-member-consultation" : `/${pageDefinitions[pageIndex + 1]?.[1] ?? "book"}` }
          : type === "PARAGRAPH"
            ? { text: "Move with confidence, recover well, and build a rhythm you can keep." }
            : metadata({ blockType: type }),
      styles: { padding: "24px", backgroundColor: type === "SECTION" ? "#ffffff" : "transparent" },
      order: blockIndex,
      visible: true,
      locked: false,
      updatedAt: before(referenceDate, 7),
    });
  }
}

const funnelTargetId = id("publication-target", "funnel");
const formTargetId = id("publication-target", "form");
const funnelVersionId = id("publication-version", "funnel-2");
const formVersionId = id("publication-version", "form-2");
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
const funnelChannelConfig = { kind: "FUNNEL" as const, allowCustomCode: false, analytics: "CONSENTED" as const };
const formChannelConfig = {
  kind: "FORM" as const,
  submissionMode: "DISABLED" as const,
  responseRetentionDays: 365,
  responseConsentLabel: "I agree to the demo privacy policy and the use of my response.",
};
const publicationTargets: GrowthPackFixtures["publicationTargets"] = [
  {
    id: funnelTargetId,
    organizationId,
    locationId,
    kind: "FUNNEL",
    sourceKey: `funnel:${internalFunnelId}`,
    sourceId: internalFunnelId,
    name: "28-day studio reset",
    slug: `studio-reset-${runId.slice(0, 8)}`,
    status: "PAUSED",
    publishedVersionId: funnelVersionId,
    domainHost: null,
    domainVerificationToken: sha256(`${runId}:funnel-domain-token`),
    domainStatus: "NOT_CONFIGURED",
    sslStatus: "NOT_CONFIGURED",
    seoConfig,
    consentConfig,
    channelConfig: funnelChannelConfig,
    publishedAt: before(referenceDate, 7),
    createdById: actorUserId,
    updatedById: actorUserId,
    updatedAt: before(referenceDate, 7),
  },
  {
    id: formTargetId,
    organizationId,
    locationId,
    kind: "FORM",
    sourceKey: `form:${publishedFormId}`,
    sourceId: publishedFormId,
    name: "New member consultation",
    slug: `new-member-consultation-${runId.slice(0, 8)}`,
    status: "PAUSED",
    publishedVersionId: formVersionId,
    domainHost: null,
    domainVerificationToken: sha256(`${runId}:form-domain-token`),
    domainStatus: "NOT_CONFIGURED",
    sslStatus: "NOT_CONFIGURED",
    seoConfig,
    consentConfig,
    channelConfig: formChannelConfig,
    publishedAt: before(referenceDate, 7),
    createdById: actorUserId,
    updatedById: actorUserId,
    updatedAt: before(referenceDate, 7),
  },
];
const funnelSource = {
  type: "FUNNEL",
  funnel: { id: internalFunnelId, name: "28-day studio reset", locationId },
  pages: funnelPages.map((page) => ({
    id: page.id,
    name: page.name,
    slug: page.slug,
    order: page.order ?? 0,
    isPublished: page.isPublished ?? false,
    metaTitle: page.metaTitle ?? null,
    metaDescription: page.metaDescription ?? null,
    metaImage: page.metaImage ?? null,
    customCss: null,
    customJs: null,
  })),
  blocks: funnelBlocks.map((block) => ({
    id: block.id,
    pageId: block.pageId ?? null,
    parentBlockId: block.parentBlockId ?? null,
    type: block.type,
    props: block.props ?? {},
    styles: block.styles ?? {},
    order: block.order ?? 0,
    visible: block.visible ?? true,
  })),
  breakpoints: [],
  events: [],
  pixels: [],
};
const fieldsByStep = new Map(formSteps.map((step) => [
  step.id,
  formFields.filter((field) => field.stepId === step.id).map((field) => ({
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
]));
const formSource = {
  type: "FORM",
  definitionSchemaVersion: 1,
  form: {
    id: publishedFormId,
    name: "New member consultation",
    description: "A three-step consultation for goals, preferences, and consent.",
    isMultiStep: true,
    showProgress: true,
    successMessage: "Thanks. The studio team will review your goals and recommend a first session.",
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
const versionDefinitions = [
  { targetId: funnelTargetId, versionId: funnelVersionId, source: funnelSource, channelConfig: funnelChannelConfig, note: "Published demo funnel" },
  { targetId: formTargetId, versionId: formVersionId, source: formSource, channelConfig: formChannelConfig, note: "Published demo consultation" },
];
const publicationVersions: GrowthPackFixtures["publicationVersions"] = versionDefinitions.map((definition) => {
  const snapshot = { schemaVersion: 1, source: definition.source, channelConfig: definition.channelConfig };
  return {
    id: definition.versionId,
    targetId: definition.targetId,
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
    changeNote: definition.note,
    isRollback: false,
    createdById: actorUserId,
    createdAt: before(referenceDate, 7),
  };
});


  return {
    funnels,
    funnelPages,
    funnelBlocks,
    publicationTargets,
    publicationVersions,
    internalFunnelId,
  };
}
