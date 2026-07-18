import {
  demoMetadata,
  deterministicDemoId,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import type {
  AddOnFixtures,
  StudioExtrasDependencies,
} from "@/features/demo-data/server/packs/studio-extras/types";

const DAY_MS = 86_400_000;

export function buildAddOnFixtures(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
): AddOnFixtures {
  const qa = context.profile === "QA_EXHAUSTIVE";
  const now = context.referenceDate;
  const scope = {
    organizationId: context.organizationId,
    locationId: context.locationId,
  };
  const channelProviders = [
    "RESERVE_WITH_GOOGLE",
    "CLASSPASS",
    "GYMPASS",
    "WELLHUB",
  ] as const;
  const channels = channelProviders.slice(0, qa ? 4 : 2).map((provider, index) => ({
    id: deterministicDemoId(context.runId, "discovery-channel", index),
    ...scope,
    provider,
    status: index % 2 === 0 ? ("DRAFT" as const) : ("PAUSED" as const),
    accountName: "Demo configuration",
    externalAccountId: null,
    bookingUrl: null,
    credentials: null,
    config: demoMetadata(context, { connectionRequired: true }),
    lastSyncedAt: null,
    enabledAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const accessProviders = ["KISI", "BRIVO", "SALTO", "GANTNER"] as const;
  const accessIntegrations = accessProviders.slice(0, qa ? 4 : 2).map((provider, index) => ({
    id: deterministicDemoId(context.runId, "access-integration", index),
    ...scope,
    provider,
    locationName: ["Front entrance", "Members door", "Staff office", "Equipment store"][index],
    status: index % 2 === 0 ? ("DRAFT" as const) : ("PAUSED" as const),
    config: demoMetadata(context, { connectionRequired: true }),
    credentials: null,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const listingCount = qa ? 5 : 2;
  const marketplaceListings = Array.from({ length: listingCount }, (_, index) => ({
    id: deterministicDemoId(context.runId, "marketplace-listing", index),
    ...scope,
    title: ["Intro week", "Reformer fundamentals", "Weekend reset", "Lunch express", "Mobility clinic"][index],
    description: "Synthetic marketplace draft. It is not published or claimable.",
    categories: [index % 2 === 0 ? "wellness" : "fitness", "demo"],
    bookingUrl: null,
    status: index % 3 === 2 ? ("PAUSED" as const) : ("DRAFT" as const),
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const metricCount = Math.min(dependencies.clients.length, qa ? 300 : 60);
  const metricDefinitions = [
    ["Resting heart rate", "bpm", 58],
    ["Mobility score", "points", 72],
    ["Plank hold", "seconds", 45],
    ["Recovery score", "points", 68],
  ] as const;
  const performanceMetrics = Array.from({ length: metricCount }, (_, index) => {
    const [metricType, unit, baseline] = metricDefinitions[index % metricDefinitions.length];
    const recordedAt = new Date(now.getTime() - (index % 180) * DAY_MS);
    return {
      id: deterministicDemoId(context.runId, "performance-metric", index),
      ...scope,
      clientId: dependencies.clients[index % dependencies.clients.length].id,
      source: "MANUAL" as const,
      metricType,
      value: String(baseline + (index % 17)),
      unit,
      recordedAt,
      notes: "Synthetic demo measurement; not clinical data.",
      createdAt: recordedAt,
    };
  });

  const workoutCount = qa ? 18 : 6;
  const workoutPrograms = Array.from({ length: workoutCount }, (_, index) => ({
    id: deterministicDemoId(context.runId, "workout-program", index),
    ...scope,
    title: ["Foundation strength", "Mobility reset", "Core control", "Conditioning circuit"][index % 4],
    description: "Synthetic internal demo programme.",
    classTypeId: dependencies.catalog.classTypes[index % dependencies.catalog.classTypes.length].id,
    coachId: dependencies.catalog.instructors[index % dependencies.catalog.instructors.length].id,
    difficulty: ["BEGINNER", "INTERMEDIATE", "ALL_LEVELS"][index % 3] as
      | "BEGINNER"
      | "INTERMEDIATE"
      | "ALL_LEVELS",
    blocks: {
      text: "Warm-up: 8 minutes\nMain block: 3 rounds\nCooldown: 6 minutes",
      ...demoMetadata(context),
    },
    isPublished: false,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const soapCount = Math.min(dependencies.clients.length, qa ? 100 : 20);
  const soapNotes = Array.from({ length: soapCount }, (_, index) => ({
    id: deterministicDemoId(context.runId, "soap-note", index),
    ...scope,
    clientId: dependencies.clients[index].id,
    authorId: dependencies.catalog.instructors[index % dependencies.catalog.instructors.length].id,
    subjective: "Synthetic demo note: member reports good energy and no new concerns.",
    objective: "Movement quality reviewed using the demo assessment protocol.",
    assessment: "Demo-only observation; no medical diagnosis recorded.",
    plan: "Continue current programme and review next month.",
    privateNote: true,
    signedAt: index % 4 === 0 ? new Date(now.getTime() - (index + 1) * DAY_MS) : null,
    createdAt: new Date(now.getTime() - (index + 2) * DAY_MS),
    updatedAt: now,
  }));

  const payoutCount = qa ? 70 : 24;
  const payoutStatuses = [
    "PAID",
    "PAID",
    "PROCESSING",
    "PENDING",
    "FAILED",
    "CANCELLED",
  ] as const;
  const instructorPayouts = Array.from({ length: payoutCount }, (_, index) => {
    const periodEnd = new Date(now.getTime() - (index * 11 + 2) * DAY_MS);
    const periodStart = new Date(periodEnd.getTime() - 14 * DAY_MS);
    const status = payoutStatuses[index % payoutStatuses.length];
    return {
      id: deterministicDemoId(context.runId, "instructor-payout", index),
      instructorId:
        dependencies.catalog.instructors[index % dependencies.catalog.instructors.length].id,
      ...scope,
      stripeTransferId: null,
      amount: String(180 + (index % 9) * 35),
      currency: context.currency,
      status,
      periodStart,
      periodEnd,
      classesCount: 4 + (index % 12),
      notes: "Synthetic demo payout; no provider transfer was created.",
      paidAt: status === "PAID" ? new Date(periodEnd.getTime() + DAY_MS) : null,
      deletedAt: null,
      createdAt: periodEnd,
      updatedAt: now,
    };
  });

  const videoCount = qa ? 18 : 8;
  const videoOnDemandAssets = Array.from({ length: videoCount }, (_, index) => {
    const isPublicFree = index < (qa ? 10 : 5);
    const isPaid = !isPublicFree && index % 2 === 0;
    return {
      id: deterministicDemoId(context.runId, "vod-asset", index),
      ...scope,
      title: [
        "Morning mobility",
        "Foundations of breathwork",
        "Core control express",
        "Post-session recovery",
        "Desk reset",
        "Reformer fundamentals",
      ][index % 6] + ` ${index + 1}`,
      description: "Synthetic on-demand demo session with no member entitlement or provider dependency.",
      videoUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      thumbnailUrl: null,
      durationSeconds: 420 + (index % 6) * 180,
      classTypeId: dependencies.catalog.classTypes[index % dependencies.catalog.classTypes.length].id,
      instructorId: dependencies.catalog.instructors[index % dependencies.catalog.instructors.length].id,
      accessLevel: isPublicFree
        ? ("PUBLIC" as const)
        : isPaid
          ? ("PAID" as const)
          : ("MEMBERS_ONLY" as const),
      price: isPaid ? "12.00" : null,
      isPublished: isPublicFree,
      publishedAt: isPublicFree ? new Date(now.getTime() - (index + 1) * DAY_MS) : null,
      createdAt: new Date(now.getTime() - (60 + index) * DAY_MS),
      updatedAt: now,
    };
  });

  return {
    channels,
    accessIntegrations,
    marketplaceListings,
    performanceMetrics,
    workoutPrograms,
    soapNotes,
    instructorPayouts,
    videoOnDemandAssets,
  };
}
