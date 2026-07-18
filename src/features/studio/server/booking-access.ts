import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  pricingOption,
  pricingOptionAccessGrant,
  studioMembership,
} from "@/db/schema";

type BookableClass = {
  id: string;
  allowUnpaidBookings: boolean;
  classTypeId: string | null;
  locationId: string | null;
  pricingModel: "FREE" | "DROP_IN" | "PACKAGE_ONLY" | "SLIDING_SCALE";
  serviceCategoryId: string | null;
  serviceTypeId: string | null;
};

type AccessGrant = typeof pricingOptionAccessGrant.$inferSelect;

function locationScope(locationId: string | null) {
  return locationId
    ? eq(studioMembership.locationId, locationId)
    : isNull(studioMembership.locationId);
}

function grantMatchesClass(grant: AccessGrant, targetClass: BookableClass): boolean {
  if (grant.targetType === "ALL_SERVICES") return true;
  if (grant.targetType === "SERVICE_TYPE") {
    return Boolean(targetClass.serviceTypeId && grant.serviceTypeId === targetClass.serviceTypeId);
  }
  if (grant.targetType === "SERVICE_CATEGORY") {
    return Boolean(targetClass.serviceCategoryId && grant.serviceCategoryId === targetClass.serviceCategoryId);
  }
  if (grant.targetType === "CLASS_TYPE") {
    return Boolean(targetClass.classTypeId && grant.classTypeId === targetClass.classTypeId);
  }
  return false;
}

export async function assertClientCanBookClass({
  clientId,
  organizationId,
  targetClass,
}: {
  clientId: string;
  organizationId: string;
  targetClass: BookableClass;
}): Promise<void> {
  if (targetClass.allowUnpaidBookings || targetClass.pricingModel !== "PACKAGE_ONLY") {
    return;
  }

  const memberships = await db.query.studioMembership.findMany({
    where: and(
      eq(studioMembership.clientId, clientId),
      eq(studioMembership.organizationId, organizationId),
      or(
        eq(studioMembership.status, "ACTIVE"),
        and(
          eq(studioMembership.status, "PAST_DUE"),
          gt(studioMembership.paymentGraceEndsAt, new Date()),
        ),
      ),
      locationScope(targetClass.locationId),
    ),
    columns: {
      id: true,
      planId: true,
      totalClasses: true,
      usedClasses: true,
    },
    with: {
      classCredits: {
        columns: { totalCredits: true, usedCredits: true, expiresAt: true },
      },
      membershipPlan: {
        columns: {
          id: true,
          allowedClassTypeIds: true,
          classCredits: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Client does not have an active membership for this class.",
    });
  }

  const usableMemberships = memberships.filter((membership) => {
    const planRequiresCredits = Boolean(membership.membershipPlan?.classCredits);
    if (!planRequiresCredits && !membership.totalClasses) return true;

    const classCredit = membership.classCredits.find(
      (credit) =>
        credit.usedCredits < credit.totalCredits &&
        (!credit.expiresAt || credit.expiresAt > new Date()),
    );
    if (classCredit) return true;

    if (membership.totalClasses) {
      return (membership.usedClasses ?? 0) < membership.totalClasses;
    }

    return false;
  });

  if (usableMemberships.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Client has no remaining credits for this class.",
    });
  }

  const planIds = usableMemberships
    .map((membership) => membership.planId)
    .filter((planId): planId is string => Boolean(planId));

  if (planIds.length === 0) return;

  const linkedOptions = await db
    .select({ id: pricingOption.id, membershipPlanId: pricingOption.membershipPlanId })
    .from(pricingOption)
    .where(
      and(
        eq(pricingOption.organizationId, organizationId),
        inArray(pricingOption.membershipPlanId, planIds),
        eq(pricingOption.isActive, true),
      ),
    );

  if (linkedOptions.length > 0) {
    const optionIds = linkedOptions.map((option) => option.id);
    const grants = await db
      .select()
      .from(pricingOptionAccessGrant)
      .where(inArray(pricingOptionAccessGrant.pricingOptionId, optionIds));

    if (grants.some((grant) => grantMatchesClass(grant, targetClass))) return;
  }

  const legacyAllowsAccess = usableMemberships.some((membership) => {
    const allowedClassTypeIds = membership.membershipPlan?.allowedClassTypeIds ?? [];
    return (
      allowedClassTypeIds.length === 0 ||
      Boolean(targetClass.classTypeId && allowedClassTypeIds.includes(targetClass.classTypeId))
    );
  });

  if (legacyAllowsAccess) return;

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Client membership does not include access to this class.",
  });
}
