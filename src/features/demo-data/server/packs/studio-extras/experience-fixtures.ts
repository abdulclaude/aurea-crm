import { createHash } from "node:crypto";

import { createPublicationContentHash } from "@/features/publications/lib/content-hash";

import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import type {
  ExperienceFixtures,
  StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras/types";

const DAY_MS = 86_400_000;

function deterministicCuid(
  context: Pick<DemoSeedContext, "runId">,
  kind: string,
  index: number,
): string {
  const suffix = createHash("sha256")
    .update(`${context.runId}:${kind}:${index}`)
    .digest("hex")
    .slice(0, 23);
  return `c${suffix}`;
}

export function buildExperienceFixtures(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
): ExperienceFixtures {
  const now = context.referenceDate;
  const qa = context.profile === "QA_EXHAUSTIVE";
  const templateNames = [
    "Studio participation waiver",
    "Media consent",
    "Minor participation waiver",
    "Equipment safety acknowledgement",
  ] as const;
  const templateCount = qa ? 4 : 3;
  const waiverTemplates = templateNames.slice(0, templateCount).map((name, index) => ({
    id: deterministicDemoId(context.runId, "waiver-template", index),
    organizationId: context.organizationId,
    locationId: context.locationId,
    name,
    content: `DEMO TEMPLATE: ${name}. This synthetic text is for product demonstration only and is not legal advice.`,
    isRequired: index !== 1,
    requiresMinor: index === 2,
    isActive: index !== templateCount - 1 || !qa,
    version: index === 0 ? 3 : 1,
    createdAt: new Date(now.getTime() - (240 - index * 30) * DAY_MS),
    updatedAt: now,
  }));

  const signatureCount = Math.min(dependencies.clients.length, qa ? 220 : 45);
  const waiverSignatures = Array.from({ length: signatureCount }, (_, index) => {
    const template = waiverTemplates[index % waiverTemplates.length];
    const signedAt = new Date(now.getTime() - (3 + (index * 11) % 300) * DAY_MS);
    const isMinor = template.requiresMinor;
    return {
      id: deterministicDemoId(context.runId, "waiver-signature", index),
      templateId: template.id,
      clientId: dependencies.clients[index].id,
      signatureData: `DEMO_SIGNATURE_${context.runId.slice(0, 8)}_${index + 1}`,
      signedAt,
      ipAddress: null,
      emergencyName: `Demo emergency contact ${index + 1}`,
      emergencyPhone: `+4477007${String(10000 + index).slice(-5)}`,
      healthConditions: index % 9 === 0 ? "Synthetic note: discuss modifications before class." : null,
      agreedToTerms: true,
      minorName: isMinor ? `Demo minor ${index + 1}` : null,
      guardianName: isMinor ? `Demo guardian ${index + 1}` : null,
      expiresAt: index % 13 === 0 ? new Date(now.getTime() - DAY_MS) : new Date(signedAt.getTime() + 365 * DAY_MS),
      createdAt: signedAt,
    };
  });

  const layoutCount = Math.min(dependencies.catalog.rooms.length, qa ? 5 : 3);
  const roomLayouts = dependencies.catalog.rooms.slice(0, layoutCount).map((room, index) => {
    const rows = index === 1 ? 3 : 5;
    const columns = Math.max(2, Math.min(8, Math.ceil(room.capacity / rows)));
    return {
      id: deterministicDemoId(context.runId, "room-layout", index),
      roomId: room.id,
      name: `${room.name} demo layout`,
      rows,
      columns,
      layoutData: demoMetadata(context, {
        equipment: index === 1 ? "REFORMER" : index === 2 ? "BIKE" : "MAT",
        pattern: index % 2 === 0 ? "CENTER_AISLE" : "GRID",
        density: index === 0 ? "PREMIUM" : "BALANCED",
        theme: "LIGHT",
        showClearance: true,
        showInstructorZone: true,
        showMirrors: index !== 2,
        showWindows: true,
        showStorage: true,
        spaceCount: Math.min(room.capacity, rows * columns),
      }),
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };
  });

  const spots = roomLayouts.flatMap((layout, layoutIndex) => {
    const room = dependencies.catalog.rooms[layoutIndex];
    const count = Math.min(room.capacity, layout.rows * layout.columns);
    return Array.from({ length: layout.rows * layout.columns }, (_, index) => {
      const row = Math.floor(index / layout.columns);
      const col = index % layout.columns;
      const isInstructor = index === 0;
      const isBlocked = index >= count;
      const equipment = layoutIndex === 1 ? "REFORMER" : layoutIndex === 2 ? "BIKE" : "MAT";
      return {
        id: deterministicDemoId(context.runId, `spot-${layoutIndex}`, index),
        layoutId: layout.id,
        label: isInstructor ? "Coach" : `${String.fromCharCode(65 + row)}${col + 1}`,
        row,
        col,
        type: isInstructor
          ? ("INSTRUCTOR" as const)
          : isBlocked
            ? ("BLOCKED" as const)
            : ("EQUIPMENT" as const),
        isActive: !isBlocked && !isInstructor,
        equipment: isInstructor ? null : equipment,
        metadata: demoMetadata(context, { visualizerIndex: index }),
        createdAt: now,
        updatedAt: now,
      };
    });
  });

  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const scheduleWidgets = Array.from({ length: qa ? 2 : 1 }, (_, index) => ({
    id: deterministicCuid(context, "schedule-widget", index),
    ...scope,
    name: `${index === 0 ? "Website schedule" : "Weekend timetable"} (demo)`,
    type: "SCHEDULE" as const,
    config: {
      schemaVersion: 1,
      primaryColor: index === 0 ? "#2563eb" : "#119c75",
      accentColor: index === 0 ? "#16a34a" : "#dc6b19",
      fontFamily: index === 0 ? "Inter" : "Georgia",
      borderRadius: index === 0 ? 8 : 4,
      showPrices: index === 0,
      showInstructors: true,
      maxDaysAhead: index === 0 ? 30 : 14,
      classTypeIds:
        index === 0 ? [] : [dependencies.catalog.classTypes[0].id],
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  const publicInstructors = dependencies.catalog.instructors.filter(
    ({ isActive, isSystem }) => isActive && !isSystem,
  );
  const instructorWidgets = Array.from({ length: qa ? 2 : 1 }, (_, index) => ({
    id: deterministicCuid(context, "instructor-widget", index),
    ...scope,
    name: `${index === 0 ? "Meet the team" : "Coach directory"} (demo)`,
    type: "INSTRUCTORS" as const,
    config: {
      schemaVersion: 1,
      instructorIds: publicInstructors
        .slice(index * 4, index * 4 + (index === 0 ? 6 : 4))
        .map(({ id }) => id),
      layout: index === 0 ? "GRID" : "LIST",
      columns: index === 0 ? 3 : 1,
      showProfilePhoto: true,
      showBio: index === 0,
      showSpecialties: true,
      showCertifications: index !== 0,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  const publicMemberships = dependencies.catalog.pricingOptions.filter(
    ({ type, isActive, isPublic, isHidden }) =>
      type === "MEMBERSHIP" && isActive && isPublic && !isHidden,
  );
  const membershipWidgets = Array.from({ length: qa ? 2 : 1 }, (_, index) => ({
    id: deterministicCuid(context, "membership-widget", index),
    ...scope,
    name: `${index === 0 ? "Membership plans" : "Compact plans"} (demo)`,
    type: "MEMBERSHIP" as const,
    config: {
      schemaVersion: 1,
      pricingOptionIds: (index === 0 ? publicMemberships : publicMemberships.slice(0, 1))
        .map(({ id }) => id),
      layout: index === 0 ? "GRID" : "LIST",
      showPrice: true,
      showDescription: index === 0,
      showAccessSummary: true,
      showBillingInterval: true,
      featuredPricingOptionId: index === 0 ? publicMemberships[0]?.id ?? null : null,
    },
    isActive: index === 0,
    createdAt: now,
    updatedAt: now,
  }));
  const introOption = dependencies.catalog.pricingOptions.find(
    ({ type, isActive, isPublic, isHidden }) =>
      type === "INTRO_OFFER" && isActive && isPublic && !isHidden,
  );
  const pricingTargetId = introOption
    ? deterministicDemoId(context.runId, "intro-pricing-target", 0)
    : null;
  const pricingVersionId = introOption
    ? deterministicDemoId(context.runId, "intro-pricing-version", 0)
    : null;
  const pricingChannelConfig = {
    kind: "PRICING" as const,
    showTerms: false,
    allowDirectPurchase: false,
  };
  const pricingSeoConfig = {
    title: introOption?.name ?? "Demo intro offer",
    description: "Synthetic demo pricing with checkout disabled.",
    imageUrl: null,
    canonicalUrl: null,
    index: false,
    follow: false,
  };
  const disabledConsent = {
    mode: "DISABLED" as const,
    version: "1.0",
    privacyPolicyUrl: null,
    categories: [] as const,
  };
  const pricingSnapshot = introOption
    ? {
        schemaVersion: 1 as const,
        channelConfig: pricingChannelConfig,
        source: {
          type: "PRICING" as const,
          pricingOption: {
            id: introOption.id,
            name: introOption.name,
            slug: introOption.slug,
            description: introOption.description,
            type: introOption.type,
            price: introOption.price,
            currency: introOption.currency,
            billingInterval: introOption.billingInterval,
            classCredits: introOption.classCredits,
            durationDays: introOption.durationDays,
            isIntroOffer: introOption.isIntroOffer,
            isBundle: introOption.isBundle,
            isPublic: introOption.isPublic,
            isHidden: introOption.isHidden,
            directPurchaseEnabled: introOption.directPurchaseEnabled,
            buyPagePath: introOption.buyPagePath,
            termsText: introOption.termsText,
            accessSummary: introOption.accessSummary,
            locationId: context.locationId,
            updatedAt: introOption.updatedAt.toISOString(),
          },
        },
      }
    : null;
  const pricingPublicationTargets =
    introOption && pricingTargetId && pricingVersionId
      ? [{
          id: pricingTargetId,
          ...scope,
          kind: "PRICING" as const,
          sourceKey: `pricing:${introOption.id}`,
          sourceId: introOption.id,
          name: `${introOption.name} (demo publication)`,
          slug: `demo-intro-offer-${context.runId.slice(0, 8)}`,
          status: "PAUSED" as const,
          publishedVersionId: pricingVersionId,
          domainHost: null,
          domainVerificationToken: createHash("sha256")
            .update(`${context.runId}:intro-pricing-domain`)
            .digest("hex"),
          domainStatus: "NOT_CONFIGURED" as const,
          sslStatus: "NOT_CONFIGURED" as const,
          seoConfig: pricingSeoConfig,
          consentConfig: disabledConsent,
          channelConfig: pricingChannelConfig,
          publishedAt: now,
          createdById: context.actorUserId,
          updatedById: context.actorUserId,
          createdAt: now,
          updatedAt: now,
        }]
      : [];
  const pricingPublicationVersions =
    pricingSnapshot && pricingTargetId && pricingVersionId
      ? [{
          id: pricingVersionId,
          targetId: pricingTargetId,
          version: 1,
          snapshotSchemaVersion: 1,
          contentHash: createPublicationContentHash({
            schemaVersion: 1,
            snapshot: pricingSnapshot,
            themeSnapshot: null,
            seoSnapshot: pricingSeoConfig,
            consentSnapshot: disabledConsent,
          }),
          snapshot: pricingSnapshot,
          themeSnapshot: null,
          seoSnapshot: pricingSeoConfig,
          consentSnapshot: disabledConsent,
          validation: { valid: true, warnings: [], demo: true },
          changeNote: "Published synthetic intro offer for widget testing",
          isRollback: false,
          createdById: context.actorUserId,
          createdAt: now,
        }]
      : [];
  const introOfferWidgets = introOption
    ? [{
        id: deterministicCuid(context, "intro-offer-widget", 0),
        ...scope,
        name: "Intro offer (demo)",
        type: "INTRO_OFFER" as const,
        config: {
          schemaVersion: 1,
          pricingOptionIds: [introOption.id],
          layout: "GRID" as const,
          showPrice: true,
          showDescription: true,
          showDuration: true,
          showAccessSummary: true,
          featuredPricingOptionId: introOption.id,
          buttonLabel: "View intro offer",
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }]
    : [];
  const publicEvents = dependencies.catalog.services.filter(
    ({ experienceType, isActive }) => experienceType === "EVENT" && isActive,
  );
  const eventWidgets = Array.from({ length: qa ? 2 : 1 }, (_, index) => ({
    id: deterministicCuid(context, "event-widget", index),
    ...scope,
    name: `${index === 0 ? "Upcoming workshops" : "Event list"} (demo)`,
    type: "EVENT" as const,
    config: {
      schemaVersion: 1,
      serviceTypeIds: publicEvents.map(({ id }) => id),
      layout: index === 0 ? "GRID" : "LIST",
      occurrencesPerEvent: index === 0 ? 3 : 6,
      showDescription: true,
      showImage: true,
      showPrice: true,
      showSchedule: true,
      showLocation: true,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  const publicVideoCount = qa ? 10 : 5;
  const onDemandWidgets = Array.from({ length: qa ? 2 : 1 }, (_, index) => ({
    id: deterministicCuid(context, "on-demand-widget", index),
    ...scope,
    name: `${index === 0 ? "Free video library" : "Recovery videos"} (demo)`,
    type: "ON_DEMAND" as const,
    config: {
      schemaVersion: 1,
      assetIds: Array.from(
        { length: index === 0 ? publicVideoCount : Math.min(4, publicVideoCount) },
        (_, assetIndex) => deterministicDemoId(context.runId, "vod-asset", assetIndex),
      ),
      layout: index === 0 ? "GRID" : "LIST",
      columns: index === 0 ? 3 : 1,
      showDescription: true,
      showDuration: true,
      showInstructor: true,
      showClassType: true,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  const referralWidgets = [{
    id: deterministicCuid(context, "referral-widget", 0),
    ...scope,
    name: "Refer a friend (demo)",
    type: "REFERRAL" as const,
    config: {
      schemaVersion: 1,
      programId: deterministicDemoId(context.runId, "referral-program", 0),
      layout: "STACKED" as const,
      showReferrerReward: true,
      showRefereeReward: true,
      showOfferWindow: true,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }];
  const widgets = [
    ...scheduleWidgets,
    ...instructorWidgets,
    ...membershipWidgets,
    ...introOfferWidgets,
    ...eventWidgets,
    ...onDemandWidgets,
    ...referralWidgets,
  ];
  const widgetPublicationTargets = widgets.map((widget, index) => ({
    id: deterministicDemoId(context.runId, "widget-publication-target", index),
    ...scope,
    kind: "WIDGET" as const,
    sourceKey: `widget:${widget.id}:location:${context.locationId}`,
    sourceId: widget.id,
    name: widget.name,
    slug: `demo-widget-${index + 1}-${context.runId.slice(0, 8)}`,
    status: "DRAFT" as const,
    publishedVersionId: null,
    domainHost: null,
    domainVerificationToken: createHash("sha256")
      .update(`${context.runId}:widget-domain:${widget.id}`)
      .digest("hex"),
    domainStatus: "NOT_CONFIGURED" as const,
    sslStatus: "NOT_CONFIGURED" as const,
    seoConfig: {
      title: null,
      description: null,
      imageUrl: null,
      canonicalUrl: null,
      index: false,
      follow: false,
    },
    consentConfig: {
      mode: "DISABLED" as const,
      version: "1.0",
      privacyPolicyUrl: null,
      categories: [],
    },
    channelConfig: {
      kind: "WIDGET" as const,
      height:
        widget.type === "INSTRUCTORS" || widget.type === "ON_DEMAND"
          ? 760
          : 640,
      transparentBackground: false,
      allowedFrameOrigins: ["http://localhost:3000"],
    },
    createdById: context.actorUserId,
    updatedById: context.actorUserId,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    waiverTemplates,
    waiverSignatures,
    roomLayouts,
    spots,
    widgets,
    widgetPublicationTargets,
    pricingPublicationTargets,
    pricingPublicationVersions,
  };
}
