import "server-only";

import {
  classType,
  instructor,
  membershipPlan,
  pricingOption,
  pricingOptionAccessGrant,
  room,
  serviceCategory,
  serviceType,
  studioProduct,
} from "@/db/schema";
import {
  demoMetadata,
  deterministicDemoId,
  recordRefs,
  type DemoDataTransaction,
  type DemoPackResult,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";

export type CatalogPackOutput = DemoPackResult & {
  classTypes: Array<{ id: string; name: string; color: string | null }>;
  instructors: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    isSystem: boolean;
  }>;
  plans: Array<{ id: string; name: string; price: string; classCredits: number | null }>;
  pricingOptions: Array<{
    id: string;
    name: string;
    price: string;
    slug: string;
    description: string | null;
    currency: string;
    billingInterval: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME";
    classCredits: number | null;
    durationDays: number | null;
    isIntroOffer: boolean;
    isBundle: boolean;
    directPurchaseEnabled: boolean;
    buyPagePath: string | null;
    termsText: string | null;
    accessSummary: string | null;
    updatedAt: Date;
    type: "CLASS_PACK" | "MEMBERSHIP" | "DROP_IN" | "INTRO_OFFER";
    isActive: boolean;
    isPublic: boolean;
    isHidden: boolean;
  }>;
  products: Array<{ id: string; name: string; price: string }>;
  rooms: Array<{ id: string; name: string; capacity: number }>;
  services: Array<{
    id: string;
    name: string;
    classTypeId: string | null;
    price: string | null;
    experienceType: "CLASS" | "PRIVATE" | "EVENT";
    isActive: boolean;
  }>;
};

const CLASS_DEFINITIONS = [
  ["Vinyasa Flow", "#635BFF"],
  ["Mat Pilates", "#119C75"],
  ["Reformer Pilates", "#D97706"],
  ["HIIT", "#D9466F"],
  ["Spin", "#2878D0"],
  ["Barre", "#DC6B19"],
  ["Mobility", "#148A8A"],
  ["Breathwork", "#7656C8"],
] as const;

const INSTRUCTOR_NAMES = [
  "Sarah Chen", "James Wilson", "Emma Rodriguez", "Priya Shah", "Marcus Reed", "Nina Patel",
  "Jordan Kim", "Aisha Grant", "Theo Bennett", "Leila Morgan", "Sam Rivera", "Maya Foster",
  "Owen Brooks", "Iris Walker", "Amara Lewis", "Luke Harris", "Sofia King", "Noah Clark",
  "Eva Scott", "Eli Green", "Zara Adams", "Max Nelson", "Lena Baker", "Kai Young",
] as const;

const INSTRUCTOR_PROFILE_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
] as const;

export async function seedCatalogPack(
  tx: DemoDataTransaction,
  context: DemoSeedContext,
): Promise<CatalogPackOutput> {
  const now = context.referenceDate;
  const scope = { organizationId: context.organizationId, locationId: context.locationId };
  const rooms = [
    ["Main Studio", 25], ["Reformer Lab", 12], ["Spin Studio", 30],
    ["Private Suite", 2], ["Hybrid Studio", 50],
  ].map(([name, capacity], index) => ({
    id: deterministicDemoId(context.runId, "room", index), name: String(name),
    capacity: Number(capacity), description: `${name} demo space`, ...scope,
    createdAt: now, updatedAt: now,
  })) satisfies Array<typeof room.$inferInsert>;

  const classTypes = CLASS_DEFINITIONS.map(([name, color], index) => ({
    id: deterministicDemoId(context.runId, "class-type", index), name,
    slug: `demo-${name.toLowerCase().replaceAll(" ", "-")}-${context.runId.slice(0, 8)}`,
    description: `${name} classes for all experience levels.`, color, isActive: true,
    ...scope, createdAt: now, updatedAt: now,
  })) satisfies Array<typeof classType.$inferInsert>;

  const categories = ["Mind and body", "Strength", "Recovery", "Private coaching"].map(
    (name, index) => ({
      id: deterministicDemoId(context.runId, "service-category", index), name,
      slug: `demo-${name.toLowerCase().replaceAll(" ", "-")}-${context.runId.slice(0, 8)}`,
      description: `${name} services`, color: CLASS_DEFINITIONS[index]?.[1] ?? "#536070",
      sortOrder: index, isActive: true, ...scope, createdAt: now, updatedAt: now,
    }),
  ) satisfies Array<typeof serviceCategory.$inferInsert>;

  const instructorCount = context.profile === "QA_EXHAUSTIVE" ? 24 : 10;
  const instructors = INSTRUCTOR_NAMES.slice(0, instructorCount).map((name, index) => {
    const [firstName, lastName] = name.split(" ");
    return {
      id: deterministicDemoId(context.runId, "instructor", index), name,
      firstName, lastName, email: `instructor.${index + 1}.${context.runId.slice(0, 6)}@example.invalid`,
      phone: `+4477009${String(10000 + index).slice(-5)}`, role: index === 0 ? "Lead Instructor" : "Instructor",
      hourlyRate: String(30 + (index % 6) * 5), currency: context.currency,
      skills: [CLASS_DEFINITIONS[index % CLASS_DEFINITIONS.length][0]],
      qualifications: ["Demo coaching certification"],
      instructorSpecialties: [CLASS_DEFINITIONS[index % CLASS_DEFINITIONS.length][0]],
      instructorCertifications: [
        index % 2 === 0 ? "Level 3 Exercise Referral" : "First Aid for Fitness",
      ],
      bio: `${name} is a synthetic demo instructor focused on ${CLASS_DEFINITIONS[index % CLASS_DEFINITIONS.length][0].toLowerCase()} and sustainable progress.`,
      profilePhoto: INSTRUCTOR_PROFILE_PHOTOS[index % INSTRUCTOR_PROFILE_PHOTOS.length],
      onboardingCompleted: true, onboardingCompletedAt: new Date(now.getTime() - 180 * 86_400_000),
      employmentStart: new Date(now.getTime() - (300 + index * 11) * 86_400_000),
      maxHoursPerWeek: 30 + (index % 3) * 5,
      isActive: index !== instructorCount - 1,
      isSystem: false,
      ...scope, customFields: demoMetadata(context), createdAt: now, updatedAt: now,
    };
  }) satisfies Array<typeof instructor.$inferInsert>;

  const services = Array.from({ length: 10 }, (_, index) => {
    const selectedClassType = classTypes[index % classTypes.length];
    const paid = index < 7;
    return {
      id: deterministicDemoId(context.runId, "service-type", index), ...scope,
      categoryId: categories[index % categories.length].id,
      classTypeId: index < 8 ? selectedClassType.id : null,
      name: index < 8 ? selectedClassType.name : index === 8 ? "Private assessment" : "Community workshop",
      slug: `demo-service-${index + 1}-${context.runId.slice(0, 8)}`,
      description: "Synthetic demo service with no external provider dependency.",
      experienceType: index < 8 ? "CLASS" as const : index === 8 ? "PRIVATE" as const : "EVENT" as const,
      format: index === 7 ? "VIRTUAL" as const : index === 9 ? "HYBRID" as const : "IN_PERSON" as const,
      durationMinutes: index === 8 ? 45 : 60, capacity: index === 8 ? 1 : rooms[index % rooms.length].capacity,
      roomIds: [rooms[index % rooms.length].id], instructorIds: [instructors[index % instructors.length].id],
      paymentType: paid ? "PAID" as const : index === 9 ? "FREE" as const : "PACKAGE_ONLY" as const,
      price: paid ? String(22 + index * 3) : null, currency: context.currency,
      revenueCategory: index < 8 ? "Classes" : "Appointments", allowUnpaidBookings: !paid,
      allowRecurringBookings: true, calendarColor: selectedClassType.color,
      sortOrder: index, isActive: true, metadata: demoMetadata(context), createdAt: now, updatedAt: now,
    };
  }) satisfies Array<typeof serviceType.$inferInsert>;

  const planDefinitions = [
    ["Unlimited Monthly", "UNLIMITED", "149.00", "MONTHLY", null],
    ["Eight Class Monthly", "CLASS_PACK", "119.00", "MONTHLY", 8],
    ["Ten Class Pack", "CLASS_PACK", "180.00", "ONE_TIME", 10],
    ["Drop-In", "DROP_IN", "25.00", "ONE_TIME", 1],
    ["Intro Reformer Trial", "INTRO_OFFER", "39.00", "ONE_TIME", 3],
  ] as const;
  const plans = planDefinitions.map(([name, type, price, billingInterval, classCredits], index) => ({
    id: deterministicDemoId(context.runId, "membership-plan", index), ...scope, name,
    description: `${name} demo plan`, type, price, currency: context.currency, billingInterval,
    classCredits, durationDays: billingInterval === "ONE_TIME" ? 90 : 30,
    isIntroOffer: type === "INTRO_OFFER", sortOrder: index, isActive: true,
    isPublic: false, createdAt: now, updatedAt: now,
  })) satisfies Array<typeof membershipPlan.$inferInsert>;

  const pricingOptions = plans.map((plan, index) => ({
    id: deterministicDemoId(context.runId, "pricing-option", index), ...scope,
    membershipPlanId: plan.id, name: plan.name,
    slug: `demo-pricing-${index + 1}-${context.runId.slice(0, 8)}`,
    description: `<p>${plan.description}</p>`,
    type:
      plan.billingInterval !== "ONE_TIME" || plan.type === "UNLIMITED"
        ? ("MEMBERSHIP" as const)
        : plan.type,
    price: plan.price, currency: context.currency, billingInterval: plan.billingInterval,
    classCredits: plan.classCredits, durationDays: plan.durationDays,
    revenueCategory: plan.type === "INTRO_OFFER" ? "Intro offers" : "Memberships",
    isIntroOffer: plan.isIntroOffer, isBundle: false,
    isPublic: index < 2 || plan.type === "INTRO_OFFER",
    isHidden: index >= 2 && plan.type !== "INTRO_OFFER",
    showInPos: true, directPurchaseEnabled: false, buyPagePath: null,
    termsText: null, sortOrder: index, isActive: true,
    bookingLimits: {}, accessSummary: "Demo-only package access", metadata: demoMetadata(context),
    createdAt: now, updatedAt: now,
  })) satisfies Array<typeof pricingOption.$inferInsert>;

  const products = Array.from({ length: context.profile === "QA_EXHAUSTIVE" ? 30 : 15 }, (_, index) => {
    const retail = index < 10;
    const price = retail ? 12 + index * 4 : 25 + (index - 10) * 15;
    return {
      id: deterministicDemoId(context.runId, "product", index), ...scope,
      externalId: `demo-product-${context.runId.slice(0, 8)}-${index + 1}`,
      sku: `DEMO-${context.runId.slice(0, 6).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
      name: retail ? ["Grip socks", "Water bottle", "Yoga mat", "Resistance band", "Towel", "Foam roller", "Tote bag", "Massage ball", "Training gloves", "Studio journal"][index] : `Demo package ${index - 9}`,
      description: "Synthetic demo catalogue item", type: retail ? "RETAIL" as const : "FEE" as const,
      category: retail ? "Retail" : "Services", price: price.toFixed(2),
      cost: retail ? (price * 0.42).toFixed(2) : null, currency: context.currency,
      taxRate: retail ? "20.00" : "0.00", trackInventory: retail,
      stockQuantity: retail ? (index % 4 === 0 ? 3 : 18 + index * 2) : null,
      lowStockThreshold: retail ? 5 : null, isActive: true, isPublic: false,
      metadata: demoMetadata(context), createdAt: now, updatedAt: now,
    };
  }) satisfies Array<typeof studioProduct.$inferInsert>;

  await tx.insert(room).values(rooms);
  await tx.insert(classType).values(classTypes);
  await tx.insert(serviceCategory).values(categories);
  await tx.insert(instructor).values(instructors);
  await tx.insert(serviceType).values(services);
  await tx.insert(membershipPlan).values(plans);
  await tx.insert(pricingOption).values(pricingOptions);
  const grants = pricingOptions.map((option, index) => ({
    id: deterministicDemoId(context.runId, "pricing-grant", index), ...scope,
    pricingOptionId: option.id, targetType: "ALL_SERVICES" as const,
    visitLimit: option.classCredits, metadata: demoMetadata(context), createdAt: now, updatedAt: now,
  })) satisfies Array<typeof pricingOptionAccessGrant.$inferInsert>;
  await tx.insert(pricingOptionAccessGrant).values(grants);
  await tx.insert(studioProduct).values(products);

  const groups = [
    ["Room", rooms], ["ClassType", classTypes], ["ServiceCategory", categories],
    ["Instructor", instructors], ["ServiceType", services], ["MembershipPlan", plans],
    ["PricingOption", pricingOptions], ["PricingOptionAccessGrant", grants], ["StudioProduct", products],
  ] as const;
  return {
    counts: Object.fromEntries(groups.map(([key, rows]) => [key, rows.length])),
    records: groups.flatMap(([key, rows]) => recordRefs(key, rows)),
    classTypes,
    instructors: instructors.map(
      ({ id, name, email, isActive, isSystem }) => ({
        id,
        name,
        email: email ?? "",
        isActive: isActive ?? true,
        isSystem: isSystem ?? false,
      }),
    ),
    plans: plans.map(({ id, name, price, classCredits }) => ({ id, name, price, classCredits: classCredits ?? null })),
    pricingOptions: pricingOptions.map(
      ({
        id,
        name,
        price,
        slug,
        description,
        currency,
        billingInterval,
        classCredits,
        durationDays,
        isIntroOffer,
        isBundle,
        directPurchaseEnabled,
        buyPagePath,
        termsText,
        accessSummary,
        updatedAt,
        type,
        isActive,
        isPublic,
        isHidden,
      }) => ({
        id,
        name,
        price,
        slug,
        description: description ?? null,
        currency,
        billingInterval,
        classCredits: classCredits ?? null,
        durationDays: durationDays ?? null,
        isIntroOffer,
        isBundle,
        directPurchaseEnabled,
        buyPagePath: buyPagePath ?? null,
        termsText: termsText ?? null,
        accessSummary: accessSummary ?? null,
        updatedAt,
        type,
        isActive: isActive ?? true,
        isPublic: isPublic ?? false,
        isHidden: isHidden ?? false,
      }),
    ),
    products: products.map(({ id, name, price }) => ({ id, name, price })),
    rooms: rooms.map(({ id, name, capacity }) => ({ id, name, capacity: capacity ?? 1 })),
    services: services.map(({ id, name, classTypeId, price, experienceType, isActive }) => ({
      id,
      name,
      classTypeId: classTypeId ?? null,
      price: price ?? null,
      experienceType,
      isActive: isActive ?? true,
    })),
  };
}
