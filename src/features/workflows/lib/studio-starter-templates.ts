import { studioAttendanceTemplates } from "./studio-attendance-templates";
import { studioIntroTemplates } from "./studio-intro-templates";
import { studioMemberTemplates } from "./studio-member-templates";
import { studioMarketingTemplates } from "./studio-marketing-templates";
import { studioPaymentTemplates } from "./studio-payment-templates";
import { studioPlaybookTemplates } from "./studio-playbook-templates";
import { studioReferralTemplates } from "./studio-referral-templates";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { nodeTypeIsAvailable } from "@/features/nodes/lib/node-availability";

export type { StarterWorkflowTemplate } from "./studio-template-types";

const registeredStudioStarterWorkflowTemplates: StarterWorkflowTemplate[] = [
  ...studioMemberTemplates,
  ...studioIntroTemplates,
  ...studioAttendanceTemplates,
  ...studioPaymentTemplates,
  ...studioReferralTemplates,
  ...studioMarketingTemplates,
  ...studioPlaybookTemplates,
];

export const studioStarterWorkflowTemplates =
  registeredStudioStarterWorkflowTemplates.filter((template) =>
    template.nodes.every((templateNode) =>
      nodeTypeIsAvailable(templateNode.type),
    ),
  );
