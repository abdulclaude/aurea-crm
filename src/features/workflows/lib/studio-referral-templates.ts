import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioReferralTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "referral-converted-tag",
    name: "Referral converted member tag",
    description:
      "When a referral converts, mark the referred member for internal follow-up without sending messages or issuing rewards.",
    nodes: [
      node("trigger", NodeType.REFERRAL_CONVERTED_TRIGGER, 0, 0, {
        variableName: "referral",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "referredMember",
        clientId: "{{referral.refereeClientId}}",
        tag: "referral-converted",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
];
