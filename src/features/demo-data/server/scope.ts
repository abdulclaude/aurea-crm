import "server-only";

import { TRPCError } from "@trpc/server";
import { and, count, eq, isNull, ne, or } from "drizzle-orm";

import { db } from "@/db";
import {
  campaign,
  cancellationCharge,
  cancellationCreditAllocation,
  cancellationPolicy,
  classType,
  client,
  clientAccountBalance,
  commerceLedgerEntry,
  commerceOperation,
  commerceReconciliationIssue,
  commerceReconciliationRun,
  deal,
  demoDataRun,
  dynamicPricingRule,
  emailDomain,
  externalChannelIntegration,
  form,
  funnel,
  giftCard,
  inboxConversation,
  instructor,
  instructorPayout,
  invoice,
  location,
  loyaltyProgram,
  membershipPlan,
  organization,
  accessControlIntegration,
  marketplaceListing,
  payrollRun,
  performanceMetric,
  pipeline,
  pricingOption,
  promoCode,
  providerAccount,
  publicationTarget,
  referralProgram,
  room,
  rota,
  savedAudience,
  serviceType,
  smsConfig,
  soapNote,
  staffIdentity,
  studioClass,
  studioPayment,
  studioProduct,
  studioPaymentPlan,
  studioStaffMember,
  task,
  timeLog,
  waiverTemplate,
  widgetConfig,
  workflows,
  workoutProgram,
} from "@/db/schema";
import {
  DEMO_DATA_PROFILE_CONFIG,
  demoConfirmationText,
  demoRecoveryConfirmationText,
  existingDemoProductDataTotal,
  isDemoDataEnabled,
  type DemoDataProfile,
} from "@/features/demo-data/contracts";
import { DEMO_RUN_STALE_AFTER_MS } from "@/features/demo-data/server/recovery-policy";
import { normalizeCurrency } from "@/features/commerce/lib/money";
import { getActorCapabilitySnapshot, requireCapability } from "@/features/permissions/server/authorization";

export type DemoDataScope = {
  organizationId: string;
  locationId: string;
  locationName: string;
  timezone: string;
  currency: string;
  userId: string;
};

export type DemoDataActor = {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
};

export type ExistingDemoDataCounts = Awaited<ReturnType<typeof getExistingDataCounts>>;

export async function getDemoDataAvailability(actor: DemoDataActor): Promise<{
  enabled: boolean;
  canManage: boolean;
  hasActiveLocation: boolean;
}> {
  if (!actor.organizationId) return { enabled: isDemoDataEnabled(), canManage: false, hasActiveLocation: false };
  const snapshot = await getActorCapabilitySnapshot(actor);
  return {
    enabled: isDemoDataEnabled(),
    canManage: snapshot.capabilities.includes("demo.manage"),
    hasActiveLocation: Boolean(actor.locationId),
  };
}

export async function requireDemoDataScope(actor: DemoDataActor): Promise<DemoDataScope> {
  if (!isDemoDataEnabled()) throw new TRPCError({ code: "FORBIDDEN", message: "Demo data is disabled in this environment." });
  if (!actor.organizationId || !actor.locationId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Select a specific location before managing demo data." });
  }
  await requireCapability({ actor, capability: "demo.manage" });
  const [selectedLocation] = await db.select({
    locationId: location.id,
    locationName: location.companyName,
    timezone: location.timezone,
    currency: organization.currency,
  }).from(location)
    .innerJoin(organization, eq(organization.id, location.organizationId))
    .where(and(eq(location.id, actor.locationId), eq(location.organizationId, actor.organizationId)))
    .limit(1);
  if (!selectedLocation) throw new TRPCError({ code: "FORBIDDEN", message: "The active location is not available in this organization." });
  return {
    organizationId: actor.organizationId,
    locationId: selectedLocation.locationId,
    locationName: selectedLocation.locationName,
    timezone: selectedLocation.timezone ?? "UTC",
    currency: normalizeCurrency(selectedLocation.currency ?? "GBP"),
    userId: actor.userId,
  };
}

export async function getExistingDataCounts(scope: { organizationId: string; locationId: string }): Promise<Record<string, number>> {
  const locationWhere = <TOrganization, TLocation>(organizationColumn: TOrganization, locationColumn: TLocation) => and(
    eq(organizationColumn as typeof client.organizationId, scope.organizationId),
    or(
      eq(locationColumn as typeof client.locationId, scope.locationId),
      isNull(locationColumn as typeof client.locationId),
    ),
  );
  const queries = [
    ["clients", client, locationWhere(client.organizationId, client.locationId)],
    ["classes", studioClass, locationWhere(studioClass.organizationId, studioClass.locationId)],
    ["payments", studioPayment, locationWhere(studioPayment.organizationId, studioPayment.locationId)],
    ["campaigns", campaign, locationWhere(campaign.organizationId, campaign.locationId)],
    ["deals", deal, locationWhere(deal.organizationId, deal.locationId)],
    ["workflows", workflows, locationWhere(workflows.organizationId, workflows.locationId)],
    ["funnels", funnel, locationWhere(funnel.organizationId, funnel.locationId)],
    ["conversations", inboxConversation, locationWhere(inboxConversation.organizationId, inboxConversation.locationId)],
    ["invoices", invoice, locationWhere(invoice.organizationId, invoice.locationId)],
    ["timeLogs", timeLog, locationWhere(timeLog.organizationId, timeLog.locationId)],
    ["rooms", room, locationWhere(room.organizationId, room.locationId)],
    ["classTypes", classType, locationWhere(classType.organizationId, classType.locationId)],
    ["serviceTypes", serviceType, locationWhere(serviceType.organizationId, serviceType.locationId)],
    ["plans", membershipPlan, locationWhere(membershipPlan.organizationId, membershipPlan.locationId)],
    ["pricingOptions", pricingOption, locationWhere(pricingOption.organizationId, pricingOption.locationId)],
    ["products", studioProduct, locationWhere(studioProduct.organizationId, studioProduct.locationId)],
    ["instructors", instructor, locationWhere(instructor.organizationId, instructor.locationId)],
    ["instructorPayouts", instructorPayout, locationWhere(instructorPayout.organizationId, instructorPayout.locationId)],
    ["commerceOperations", commerceOperation, locationWhere(commerceOperation.organizationId, commerceOperation.locationId)],
    ["commerceLedgerEntries", commerceLedgerEntry, locationWhere(commerceLedgerEntry.organizationId, commerceLedgerEntry.locationId)],
    ["reconciliationRuns", commerceReconciliationRun, locationWhere(commerceReconciliationRun.organizationId, commerceReconciliationRun.locationId)],
    ["reconciliationIssues", commerceReconciliationIssue, locationWhere(commerceReconciliationIssue.organizationId, commerceReconciliationIssue.locationId)],
    ["providerAccounts", providerAccount, locationWhere(providerAccount.organizationId, providerAccount.locationId)],
    ["publicationTargets", publicationTarget, locationWhere(publicationTarget.organizationId, publicationTarget.locationId)],
    ["forms", form, locationWhere(form.organizationId, form.locationId)],
    ["studioStaff", studioStaffMember, locationWhere(studioStaffMember.organizationId, studioStaffMember.locationId)],
    ["pipelines", pipeline, locationWhere(pipeline.organizationId, pipeline.locationId)],
    ["tasks", task, locationWhere(task.organizationId, task.locationId)],
    ["rotas", rota, locationWhere(rota.organizationId, rota.locationId)],
    ["payrollRuns", payrollRun, locationWhere(payrollRun.organizationId, payrollRun.locationId)],
    ["emailDomains", emailDomain, locationWhere(emailDomain.organizationId, emailDomain.locationId)],
    ["savedAudiences", savedAudience, locationWhere(savedAudience.organizationId, savedAudience.locationId)],
    ["smsConfigurations", smsConfig, locationWhere(smsConfig.organizationId, smsConfig.locationId)],
    ["promoCodes", promoCode, locationWhere(promoCode.organizationId, promoCode.locationId)],
    ["giftCards", giftCard, locationWhere(giftCard.organizationId, giftCard.locationId)],
    ["accountBalances", clientAccountBalance, locationWhere(clientAccountBalance.organizationId, clientAccountBalance.locationId)],
    ["dynamicPricingRules", dynamicPricingRule, locationWhere(dynamicPricingRule.organizationId, dynamicPricingRule.locationId)],
    ["paymentPlans", studioPaymentPlan, locationWhere(studioPaymentPlan.organizationId, studioPaymentPlan.locationId)],
    ["cancellationPolicies", cancellationPolicy, locationWhere(cancellationPolicy.organizationId, cancellationPolicy.locationId)],
    ["cancellationCharges", cancellationCharge, locationWhere(cancellationCharge.organizationId, cancellationCharge.locationId)],
    ["cancellationCreditAllocations", cancellationCreditAllocation, locationWhere(cancellationCreditAllocation.organizationId, cancellationCreditAllocation.locationId)],
    ["waiverTemplates", waiverTemplate, locationWhere(waiverTemplate.organizationId, waiverTemplate.locationId)],
    ["externalChannels", externalChannelIntegration, locationWhere(externalChannelIntegration.organizationId, externalChannelIntegration.locationId)],
    ["accessIntegrations", accessControlIntegration, locationWhere(accessControlIntegration.organizationId, accessControlIntegration.locationId)],
    ["marketplaceListings", marketplaceListing, locationWhere(marketplaceListing.organizationId, marketplaceListing.locationId)],
    ["performanceMetrics", performanceMetric, locationWhere(performanceMetric.organizationId, performanceMetric.locationId)],
    ["workoutPrograms", workoutProgram, locationWhere(workoutProgram.organizationId, workoutProgram.locationId)],
    ["soapNotes", soapNote, locationWhere(soapNote.organizationId, soapNote.locationId)],
  ] as const;
  const values = await Promise.all(queries.map(async ([name, table, where]) => {
    const [row] = await db.select({ value: count() }).from(table).where(where);
    return [name, row?.value ?? 0] as const;
  }));
  const [loyaltyRows, referralRows, staffIdentityRows, widgetRows, siblingLocationRows] = await Promise.all([
    db.select({ value: count() }).from(loyaltyProgram).where(eq(loyaltyProgram.organizationId, scope.organizationId)),
    db.select({ value: count() }).from(referralProgram).where(and(
      eq(referralProgram.organizationId, scope.organizationId),
      eq(referralProgram.locationId, scope.locationId),
    )),
    db.select({ value: count() }).from(staffIdentity).where(eq(staffIdentity.organizationId, scope.organizationId)),
    db.select({ value: count() }).from(widgetConfig).where(locationWhere(widgetConfig.organizationId, widgetConfig.locationId)),
    db.select({ value: count() }).from(location).where(and(
      eq(location.organizationId, scope.organizationId),
      ne(location.id, scope.locationId),
    )),
  ]);
  return {
    ...Object.fromEntries(values),
    organizationLoyaltyPrograms: loyaltyRows[0]?.value ?? 0,
    organizationReferralPrograms: referralRows[0]?.value ?? 0,
    organizationStaffIdentities: staffIdentityRows[0]?.value ?? 0,
    organizationWidgets: widgetRows[0]?.value ?? 0,
    siblingLocations: siblingLocationRows[0]?.value ?? 0,
  };
}

export async function getDemoDataPreview(input: { scope: DemoDataScope; profile: DemoDataProfile }) {
  const [existingCounts, latestRun] = await Promise.all([
    getExistingDataCounts(input.scope),
    db.query.demoDataRun.findFirst({
      where: and(eq(demoDataRun.organizationId, input.scope.organizationId), eq(demoDataRun.locationId, input.scope.locationId)),
      columns: {
        id: true,
        profile: true,
        status: true,
        completedAt: true,
        updatedAt: true,
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
  ]);
  const existingTotal = existingDemoProductDataTotal(existingCounts);
  const hasActiveRun =
    latestRun?.status === "RUNNING" || latestRun?.status === "CLEARING";
  return {
    canPopulate: !hasActiveRun,
    confirmationText: demoConfirmationText(input.scope.locationName),
    existingCounts,
    existingTotal,
    locationName: input.scope.locationName,
    profile: input.profile,
    profileConfig: DEMO_DATA_PROFILE_CONFIG[input.profile],
    latestRun: latestRun
      ? {
          ...latestRun,
          canRecover:
            (latestRun.status === "RUNNING" ||
              latestRun.status === "CLEARING") &&
            Date.now() - latestRun.updatedAt.getTime() >=
              DEMO_RUN_STALE_AFTER_MS,
          recoveryConfirmationText: demoRecoveryConfirmationText(
            input.scope.locationName,
          ),
        }
      : null,
  };
}
