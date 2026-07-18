import "server-only";

import {
  and,
  arrayContains,
  arrayOverlaps,
  count,
  eq,
  exists,
  ilike,
  inArray,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  clientAssignee,
  clientInstructor,
  instructor,
  location,
  locationMember,
  membershipPlan,
} from "@/db/schema";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";
import {
  activeEmailSuppression,
  buildAttendanceConditions,
  buildCommerceConditions,
  buildEmailEligibilityCondition,
  buildMembershipConditions,
  validEmailCondition,
} from "@/features/audiences/server/audience-domain-conditions";

export type AudienceScope = {
  organizationId: string;
  locationId: string | null;
};

export type AudiencePreview = {
  count: number;
  email: {
    eligible: number;
    suppressed: number;
    invalid: number;
  };
};

function dateInClientTimezone(
  column: typeof client.createdAt | typeof client.lastInteractionAt,
  scope: AudienceScope,
): SQL {
  const timezone = sql<string>`coalesce((
    select ${location.timezone}
    from ${location}
    where ${location.id} = ${client.locationId}
      and ${location.organizationId} = ${scope.organizationId}
    limit 1
  ), 'UTC')`;
  return sql`(${column} at time zone ${timezone})::date`;
}

function addDateRange(
  conditions: SQL[],
  column: typeof client.createdAt | typeof client.lastInteractionAt,
  range: SavedAudienceDefinition["createdAt"],
  scope: AudienceScope,
): void {
  const localDate = dateInClientTimezone(column, scope);
  if (range?.from) {
    conditions.push(sql`${localDate} >= ${range.from}::date`);
  }
  if (range?.to) {
    conditions.push(sql`${localDate} <= ${range.to}::date`);
  }
}

function clientScopeCondition(scope: AudienceScope): SQL | undefined {
  return scope.locationId
    ? eq(client.locationId, scope.locationId)
    : undefined;
}

export function buildAudienceConditions(input: {
  scope: AudienceScope;
  definition: SavedAudienceDefinition;
}): SQL[] {
  const { definition, scope } = input;
  const filters: SQL[] = [];

  if (definition.search) {
    const escaped = definition.search.replace(/[\\%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    filters.push(
      or(
        ilike(client.name, pattern),
        ilike(client.email, pattern),
        ilike(client.phone, pattern),
        ilike(client.companyName, pattern),
      )!,
    );
  }
  if (definition.types.length > 0) {
    filters.push(inArray(client.type, definition.types));
  }
  if (definition.lifecycleStages.length > 0) {
    filters.push(inArray(client.lifecycleStage, definition.lifecycleStages));
  }
  if (definition.acquisitionStages.length > 0) {
    filters.push(inArray(client.acquisitionStage, definition.acquisitionStages));
  }
  if (definition.tags.values.length > 0) {
    const tagCondition =
      definition.tags.mode === "ALL"
        ? arrayContains(client.tags, definition.tags.values)
        : arrayOverlaps(client.tags, definition.tags.values);
    filters.push(
      definition.tags.mode === "NONE" ? not(tagCondition) : tagCondition,
    );
  }
  if (definition.countries.length > 0) {
    filters.push(inArray(client.country, definition.countries));
  }
  if (definition.sources.length > 0) {
    filters.push(inArray(client.source, definition.sources));
  }
  if (definition.assigneeIds.length > 0) {
    filters.push(
      exists(
        db
          .select({ id: clientAssignee.id })
          .from(clientAssignee)
          .where(
            and(
              eq(clientAssignee.clientId, client.id),
              inArray(clientAssignee.locationMemberId, definition.assigneeIds),
            ),
          ),
      ),
    );
  }
  if (definition.instructorIds.length > 0) {
    filters.push(
      exists(
        db
          .select({ id: clientInstructor.id })
          .from(clientInstructor)
          .where(
            and(
              eq(clientInstructor.clientId, client.id),
              inArray(clientInstructor.instructorId, definition.instructorIds),
            ),
          ),
      ),
    );
  }

  addDateRange(filters, client.createdAt, definition.createdAt, scope);
  addDateRange(
    filters,
    client.lastInteractionAt,
    definition.lastInteractionAt,
    scope,
  );
  filters.push(...buildMembershipConditions(scope, definition));
  filters.push(...buildCommerceConditions(scope, definition));
  filters.push(...buildAttendanceConditions(scope, definition));
  const emailEligibility = buildEmailEligibilityCondition(
    scope,
    definition.emailEligibility,
  );
  if (emailEligibility) filters.push(emailEligibility);

  const combinedFilters =
    filters.length === 0
      ? undefined
      : definition.operator === "OR"
        ? or(...filters)
        : and(...filters);
  return [
    eq(client.organizationId, scope.organizationId),
    clientScopeCondition(scope),
    combinedFilters,
  ].filter((condition): condition is SQL => Boolean(condition));
}

export async function getAudiencePreview(input: {
  scope: AudienceScope;
  definition: SavedAudienceDefinition;
}): Promise<AudiencePreview> {
  const validEmail = validEmailCondition();
  const suppression = activeEmailSuppression(input.scope);
  const [result] = await db
    .select({
      total: count(),
      eligible: sql<number>`count(*) filter (where ${validEmail} and ${client.emailUnsubscribed} = false and not (${suppression}))::int`,
      suppressed: sql<number>`count(*) filter (where ${validEmail} and (${client.emailUnsubscribed} = true or ${suppression}))::int`,
      invalid: sql<number>`count(*) filter (where not (${validEmail}))::int`,
    })
    .from(client)
    .where(and(...buildAudienceConditions(input)));
  return {
    count: result?.total ?? 0,
    email: {
      eligible: result?.eligible ?? 0,
      suppressed: result?.suppressed ?? 0,
      invalid: result?.invalid ?? 0,
    },
  };
}

export async function countAudienceMembers(input: {
  scope: AudienceScope;
  definition: SavedAudienceDefinition;
}): Promise<number> {
  return (await getAudiencePreview(input)).count;
}

export async function findAudienceReferenceWarnings(input: {
  scope: AudienceScope;
  definition: SavedAudienceDefinition;
}): Promise<string[]> {
  const { definition, scope } = input;
  const assigneesPromise =
    scope.locationId && definition.assigneeIds.length > 0
      ? db
          .select({ id: locationMember.id })
          .from(locationMember)
          .where(
            and(
              eq(locationMember.locationId, scope.locationId),
              inArray(locationMember.id, definition.assigneeIds),
            ),
          )
      : Promise.resolve([]);
  const instructorsPromise =
    definition.instructorIds.length > 0
      ? db
          .select({ id: instructor.id })
          .from(instructor)
          .where(
            and(
              eq(instructor.organizationId, scope.organizationId),
              scope.locationId
                ? eq(instructor.locationId, scope.locationId)
                : undefined,
              inArray(instructor.id, definition.instructorIds),
            ),
          )
      : Promise.resolve([]);
  const plansPromise =
    definition.membership.planIds.length > 0
      ? db
          .select({ id: membershipPlan.id })
          .from(membershipPlan)
          .where(
            and(
              eq(membershipPlan.organizationId, scope.organizationId),
              scope.locationId
                ? eq(membershipPlan.locationId, scope.locationId)
                : undefined,
              inArray(membershipPlan.id, definition.membership.planIds),
            ),
          )
      : Promise.resolve([]);

  const [assignees, instructors, plans] = await Promise.all([
    assigneesPromise,
    instructorsPromise,
    plansPromise,
  ]);
  const warnings: string[] = [];

  if (!scope.locationId && definition.assigneeIds.length > 0) {
    warnings.push("Assignee filters require a location-scoped audience.");
  } else if (assignees.length !== definition.assigneeIds.length) {
    warnings.push("One or more assignees are no longer available in this location.");
  }
  if (instructors.length !== definition.instructorIds.length) {
    warnings.push("One or more instructors are no longer available in this scope.");
  }
  if (plans.length !== definition.membership.planIds.length) {
    warnings.push("One or more membership plans are no longer available in this scope.");
  }
  return warnings;
}
