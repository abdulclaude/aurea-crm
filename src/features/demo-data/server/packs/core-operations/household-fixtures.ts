import type {
  clientHousehold,
  clientHouseholdMember,
} from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { PROFILE_COUNTS } from "@/features/demo-data/server/packs/core-operations/constants";
import type { ClientDependency } from "@/features/demo-data/server/packs/core-operations/types";
import {
  deterministicDemoId,
  utcDay,
} from "@/features/demo-data/server/packs/core-operations/utils";

export type HouseholdFixturePlan = {
  households: Array<typeof clientHousehold.$inferInsert>;
  householdMembers: Array<typeof clientHouseholdMember.$inferInsert>;
};

export function buildHouseholdFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
): HouseholdFixturePlan {
  const count = Math.min(
    PROFILE_COUNTS[context.profile].householdCount,
    Math.floor(clients.length / 3),
  );
  const now = context.referenceDate;
  const households = Array.from({ length: count }, (_, index) => {
    const primary = clients[index * 3]!;
    const familyName = primary.name.split(" ").at(-1) ?? primary.name;
    return {
      id: deterministicDemoId(context.runId, "household", index),
      organizationId: context.organizationId,
      locationId: context.locationId,
      name: `${familyName} Household`,
      primaryContactId: primary.id,
      notes:
        index % 4 === 0
          ? "Share booking and account communications with the primary contact."
          : null,
      createdAt: utcDay(now, -(index % 365), 10),
      updatedAt: now,
    };
  });
  const roles = ["PRIMARY", "PARTNER", "CHILD"] as const;
  const householdMembers = households.flatMap((item, householdIndex) =>
    roles.map((role, memberIndex) => ({
      id: deterministicDemoId(
        context.runId,
        "household-member",
        `${householdIndex}-${memberIndex}`,
      ),
      householdId: item.id,
      clientId: clients[householdIndex * 3 + memberIndex]!.id,
      role,
      relationship:
        role === "PRIMARY"
          ? "Primary account holder"
          : role === "PARTNER"
            ? "Partner"
            : "Child",
      createdAt: item.createdAt,
      updatedAt: now,
    })),
  );
  return { households, householdMembers };
}
