import { studioAttendanceTemplates } from "./studio-attendance-templates";
import { studioIntroTemplates } from "./studio-intro-templates";
import { studioMemberTemplates } from "./studio-member-templates";
import { studioPaymentTemplates } from "./studio-payment-templates";
import type { StarterWorkflowTemplate } from "./studio-template-types";

export type { StarterWorkflowTemplate } from "./studio-template-types";

export const studioStarterWorkflowTemplates: StarterWorkflowTemplate[] = [
  ...studioMemberTemplates,
  ...studioIntroTemplates,
  ...studioAttendanceTemplates,
  ...studioPaymentTemplates,
];
