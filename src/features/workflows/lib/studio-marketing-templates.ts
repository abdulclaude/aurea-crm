import { studioMarketingJourneyTemplates } from "./studio-marketing-journey-templates";
import { studioMarketingSimpleTemplates } from "./studio-marketing-simple-templates";
import type { StarterWorkflowTemplate } from "./studio-template-types";

export const studioMarketingTemplates: StarterWorkflowTemplate[] = [
  ...studioMarketingSimpleTemplates,
  ...studioMarketingJourneyTemplates,
];
