import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { buildEngagementFixtures } from "@/features/demo-data/server/packs/core-operations/engagement-fixtures";
import { buildHouseholdFixtures } from "@/features/demo-data/server/packs/core-operations/household-fixtures";
import { buildPipelineFixtures } from "@/features/demo-data/server/packs/core-operations/pipeline-fixtures";
import type {
  ClientDependency,
  CrmFixturePlan,
} from "@/features/demo-data/server/packs/core-operations/types";

export function buildCrmFixtures(
  context: DemoSeedContext,
  clients: ClientDependency[],
): CrmFixturePlan {
  const pipelinePlan = buildPipelineFixtures(context, clients);
  return {
    ...pipelinePlan,
    ...buildEngagementFixtures(context, clients, pipelinePlan.deals),
    ...buildHouseholdFixtures(context, clients),
  };
}
