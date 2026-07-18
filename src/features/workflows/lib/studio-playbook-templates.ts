import { studioPlaybookConversionTemplates } from "./studio-playbook-conversion-templates";
import { studioPlaybookFirstVisitTemplates } from "./studio-playbook-first-visit-templates";
import { studioPlaybookMilestoneTemplates } from "./studio-playbook-milestone-templates";
import { studioPlaybookRetentionTemplates } from "./studio-playbook-retention-templates";
import { studioPlaybookWelcomeTemplates } from "./studio-playbook-welcome-templates";
import type { StarterWorkflowTemplate } from "./studio-template-types";

export const studioPlaybookTemplates: StarterWorkflowTemplate[] = [
  ...studioPlaybookWelcomeTemplates,
  ...studioPlaybookConversionTemplates,
  ...studioPlaybookFirstVisitTemplates,
  ...studioPlaybookMilestoneTemplates,
  ...studioPlaybookRetentionTemplates,
];
