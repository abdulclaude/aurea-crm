import type { DemoSeedContext } from "@/features/demo-data/server/types";

import { buildAdSpendFixtures } from "./ad-spend";
import { buildAutomationFixtures } from "./automation";
import { buildCampaignFixtures } from "./campaigns";
import { buildFormFixtures } from "./forms";
import { buildInboxFixtures } from "./inbox";
import { buildPublicationFixtures } from "./publications";
import { createGrowthBuildScope } from "./shared";
import type { GrowthPackClient, GrowthPackFixtures } from "./types";

export function buildGrowthPackFixtures(
  context: DemoSeedContext,
  dependencies: { clients: GrowthPackClient[] },
): GrowthPackFixtures {
  const scope = createGrowthBuildScope(context, dependencies.clients);
  const campaigns = buildCampaignFixtures(scope);
  const inbox = buildInboxFixtures(scope, {
    resendProviderId: scope.id("provider", "resend"),
    smsProviderId: scope.id("provider", "twilio"),
  });
  const automation = buildAutomationFixtures(scope);
  const forms = buildFormFixtures(scope);
  const publications = buildPublicationFixtures(scope, forms);
  const adSpend = buildAdSpendFixtures(scope);

  return {
    ...campaigns,
    ...inbox,
    ...automation,
    forms: forms.forms,
    formSteps: forms.formSteps,
    formFields: forms.formFields,
    formSubmissions: forms.formSubmissions,
    publicationTargets: publications.publicationTargets,
    publicationVersions: publications.publicationVersions,
    ...adSpend,
  };
}
