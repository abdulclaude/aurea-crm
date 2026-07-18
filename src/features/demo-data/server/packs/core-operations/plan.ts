import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { buildCrmFixtures } from "@/features/demo-data/server/packs/core-operations/crm-fixtures";
import { assertCoreOperationsFixtureInvariants } from "@/features/demo-data/server/packs/core-operations/invariants";
import { buildOperationsFixtures } from "@/features/demo-data/server/packs/core-operations/operations-fixtures";
import { buildStaffFixtures } from "@/features/demo-data/server/packs/core-operations/staff-fixtures";
import type {
  CoreOperationsDependencies,
  CoreOperationsFixturePlan,
} from "@/features/demo-data/server/packs/core-operations/types";

export function buildCoreOperationsFixturePlan(
  context: DemoSeedContext,
  dependencies: CoreOperationsDependencies,
): CoreOperationsFixturePlan {
  if (dependencies.clients.length < 3) {
    throw new Error(
      "Core operations demo data requires at least three clients.",
    );
  }
  if (dependencies.instructors.length < 1) {
    throw new Error(
      "Core operations demo data requires at least one instructor.",
    );
  }
  new Intl.DateTimeFormat("en-GB", { timeZone: context.timezone }).format(
    context.referenceDate,
  );
  const staff = buildStaffFixtures(context, dependencies.instructors);
  const crm = buildCrmFixtures(context, dependencies.clients);
  const operations = buildOperationsFixtures(
    context,
    dependencies.clients,
    dependencies.instructors,
    crm.deals,
  );
  const plan = { ...staff, ...crm, ...operations };
  assertCoreOperationsFixtureInvariants(plan, context, dependencies);
  return plan;
}
