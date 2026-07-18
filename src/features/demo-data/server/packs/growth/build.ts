import type { DemoSeedContext } from "@/features/demo-data/server/types";

import { buildAnalyticsFixtures } from "./analytics";
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
  const analytics = buildAnalyticsFixtures(scope, publications.internalFunnelId);

  return {
    ...campaigns,
    ...inbox,
    ...automation,
    forms: forms.forms,
    formSteps: forms.formSteps,
    formFields: forms.formFields,
    formSubmissions: forms.formSubmissions,
    funnels: publications.funnels,
    funnelPages: publications.funnelPages,
    funnelBlocks: publications.funnelBlocks,
    publicationTargets: publications.publicationTargets,
    publicationVersions: publications.publicationVersions,
    ...analytics,
  };
}
