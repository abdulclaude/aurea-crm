import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  customerFieldDefinition,
  customerTagDefinition,
  householdSharingPolicyVersion,
} from "@/db/schema";
import {
  householdSharingPolicyValuesSchema,
  type HouseholdSharingPolicyValues,
} from "@/features/customer-settings/contracts";

import type { CustomerSettingsScope } from "./access";
import type {
  ActiveCustomerFieldDefinition,
  ActiveCustomerTagDefinition,
} from "./runtime-validation";

export {
  applyCustomerFieldWrite,
  canonicalizeCustomerTags,
  validateHouseholdRelationship,
} from "./runtime-validation";
export type {
  ActiveCustomerFieldDefinition,
  ActiveCustomerTagDefinition,
  CustomerFieldValue,
  CustomerFieldValues,
} from "./runtime-validation";

export type CustomerRuntimeSettings = {
  fields: ActiveCustomerFieldDefinition[];
  tags: ActiveCustomerTagDefinition[];
};

const EMPTY_HOUSEHOLD_POLICY: HouseholdSharingPolicyValues = {
  relationships: [],
  sharedData: [],
  requirePrimaryContactApproval: true,
};

function exactLocationWhere(
  locationId: string | null,
  column: typeof customerFieldDefinition.locationId,
) {
  return locationId ? eq(column, locationId) : isNull(column);
}

export async function resolveCustomerRuntimeSettings(
  scope: CustomerSettingsScope,
): Promise<CustomerRuntimeSettings> {
  const [fields, tags] = await Promise.all([
    db
      .select({
        key: customerFieldDefinition.key,
        label: customerFieldDefinition.label,
        fieldType: customerFieldDefinition.fieldType,
        isRequired: customerFieldDefinition.isRequired,
        options: customerFieldDefinition.options,
      })
      .from(customerFieldDefinition)
      .where(
        and(
          eq(customerFieldDefinition.organizationId, scope.organizationId),
          exactLocationWhere(scope.locationId, customerFieldDefinition.locationId),
          isNull(customerFieldDefinition.archivedAt),
        ),
      ),
    db
      .select({ name: customerTagDefinition.name })
      .from(customerTagDefinition)
      .where(
        and(
          eq(customerTagDefinition.organizationId, scope.organizationId),
          scope.locationId
            ? eq(customerTagDefinition.locationId, scope.locationId)
            : isNull(customerTagDefinition.locationId),
          isNull(customerTagDefinition.archivedAt),
        ),
      ),
  ]);

  return { fields, tags };
}

export async function resolveHouseholdRuntimePolicy(
  scope: CustomerSettingsScope,
): Promise<HouseholdSharingPolicyValues> {
  const [active] = await db
    .select({ values: householdSharingPolicyVersion.values })
    .from(householdSharingPolicyVersion)
    .where(
      and(
        eq(householdSharingPolicyVersion.organizationId, scope.organizationId),
        scope.locationId
          ? eq(householdSharingPolicyVersion.locationId, scope.locationId)
          : isNull(householdSharingPolicyVersion.locationId),
        eq(householdSharingPolicyVersion.isActive, true),
      ),
    )
    .limit(1);

  return active
    ? householdSharingPolicyValuesSchema.parse(active.values)
    : EMPTY_HOUSEHOLD_POLICY;
}
