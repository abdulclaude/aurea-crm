import type {
  accessControlIntegration,
  cancellationCharge,
  cancellationPolicy,
  clientAccountBalance,
  clientAccountCreditTransaction,
  dynamicPricingRule,
  externalChannelIntegration,
  giftCard,
  instructorSubstitutionRequest,
  instructorPayout,
  marketplaceListing,
  performanceMetric,
  publicationTarget,
  publicationVersion,
  promoCode,
  roomLayout,
  spot,
  spotBooking,
  soapNote,
  studioPaymentPlan,
  waiverSignature,
  waiverTemplate,
  videoOnDemandAsset,
  widgetConfig,
  workoutProgram,
} from "@/db/schema";
import type { DemoPackResult } from "@/features/demo-data/server/types";

export type StudioExtrasDependencies = {
  clients: ReadonlyArray<{ id: string; name: string }>;
  catalog: {
    classTypes: ReadonlyArray<{ id: string; name: string }>;
    instructors: ReadonlyArray<{
      id: string;
      name: string;
      isActive: boolean;
      isSystem: boolean;
    }>;
    plans: ReadonlyArray<{ id: string; name: string }>;
    pricingOptions: ReadonlyArray<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      type: "CLASS_PACK" | "MEMBERSHIP" | "DROP_IN" | "INTRO_OFFER";
      price: string;
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
      isActive: boolean;
      isPublic: boolean;
      isHidden: boolean;
    }>;
    rooms: ReadonlyArray<{ id: string; name: string; capacity: number }>;
    services: ReadonlyArray<{
      id: string;
      name: string;
      experienceType: "CLASS" | "PRIVATE" | "EVENT";
      isActive: boolean;
    }>;
  };
};

export type CommercialFixtures = {
  promoCodes: Array<typeof promoCode.$inferInsert>;
  accountBalances: Array<typeof clientAccountBalance.$inferInsert>;
  accountTransactions: Array<
    typeof clientAccountCreditTransaction.$inferInsert
  >;
  giftCards: Array<typeof giftCard.$inferInsert>;
  pricingRules: Array<typeof dynamicPricingRule.$inferInsert>;
  paymentPlans: Array<typeof studioPaymentPlan.$inferInsert>;
  cancellationPolicies: Array<typeof cancellationPolicy.$inferInsert>;
};

export type ExperienceFixtures = {
  waiverTemplates: Array<typeof waiverTemplate.$inferInsert>;
  waiverSignatures: Array<typeof waiverSignature.$inferInsert>;
  roomLayouts: Array<typeof roomLayout.$inferInsert>;
  spots: Array<typeof spot.$inferInsert>;
  widgets: Array<typeof widgetConfig.$inferInsert>;
  widgetPublicationTargets: Array<typeof publicationTarget.$inferInsert>;
  pricingPublicationTargets: Array<typeof publicationTarget.$inferInsert>;
  pricingPublicationVersions: Array<typeof publicationVersion.$inferInsert>;
};

export type AddOnFixtures = {
  channels: Array<typeof externalChannelIntegration.$inferInsert>;
  accessIntegrations: Array<typeof accessControlIntegration.$inferInsert>;
  marketplaceListings: Array<typeof marketplaceListing.$inferInsert>;
  performanceMetrics: Array<typeof performanceMetric.$inferInsert>;
  workoutPrograms: Array<typeof workoutProgram.$inferInsert>;
  soapNotes: Array<typeof soapNote.$inferInsert>;
  instructorPayouts: Array<typeof instructorPayout.$inferInsert>;
  videoOnDemandAssets: Array<typeof videoOnDemandAsset.$inferInsert>;
};

export type StudioExtrasFixturePlan = CommercialFixtures &
  ExperienceFixtures &
  AddOnFixtures;

export type OperationalClass = {
  id: string;
  instructorId: string | null;
  roomId: string | null;
  startTime: Date;
};

export type OperationalBooking = {
  id: string;
  classId: string;
  clientId: string;
  roomId: string | null;
  status: "BOOKED" | "ATTENDED" | "CANCELLED" | "NO_SHOW" | "LATE_CANCEL";
};

export type OperationalFixtures = {
  cancellationCharges: Array<typeof cancellationCharge.$inferInsert>;
  spotBookings: Array<typeof spotBooking.$inferInsert>;
  substitutions: Array<typeof instructorSubstitutionRequest.$inferInsert>;
};

export type StudioExtrasPackOutput = DemoPackResult & {
  promoCodes: Array<{ id: string; code: string }>;
  widgets: Array<{ id: string; name: string }>;
};
