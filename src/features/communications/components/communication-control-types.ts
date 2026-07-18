import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type Outputs = inferRouterOutputs<AppRouter>;

export type CommunicationRuleListItem =
  Outputs["communications"]["listRules"][number];
export type CommunicationSuppressionListItem =
  Outputs["communications"]["listSuppressions"][number];
export type MailboxBlocklistItem =
  Outputs["communications"]["listMailboxBlocklist"][number];
