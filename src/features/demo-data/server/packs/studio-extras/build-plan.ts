import type { DemoSeedContext } from "@/features/demo-data/server/types";
import { buildAddOnFixtures } from "@/features/demo-data/server/packs/studio-extras/add-on-fixtures";
import { buildCommercialFixtures } from "@/features/demo-data/server/packs/studio-extras/commercial-fixtures";
import { buildExperienceFixtures } from "@/features/demo-data/server/packs/studio-extras/experience-fixtures";
import type {
  StudioExtrasDependencies,
  StudioExtrasFixturePlan,
} from "@/features/demo-data/server/packs/studio-extras/types";

export function buildStudioExtrasFixturePlan(
  context: DemoSeedContext,
  dependencies: StudioExtrasDependencies,
): StudioExtrasFixturePlan {
  return {
    ...buildCommercialFixtures(context, dependencies),
    ...buildExperienceFixtures(context, dependencies),
    ...buildAddOnFixtures(context, dependencies),
  };
}
