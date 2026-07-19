import type {
  adSpend,
  campaign,
  campaignRecipient,
  campaignRun,
  connection,
  emailDomain,
  emailTemplate,
  execution,
  form,
  formField,
  formStep,
  formSubmission,
  inboxConversation,
  inboxMessage,
  inboxRoute,
  inboundMessageReceipt,
  node,
  outboundDelivery,
  providerAccount,
  publicationTarget,
  publicationVersion,
  savedAudience,
  smsConfig,
  smsMessage,
  workflows,
} from "@/db/schema";
import type { DemoSeedContext } from "@/features/demo-data/server/types";

export type GrowthPackClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type GrowthBuildScope = {
  context: DemoSeedContext;
  clients: GrowthPackClient[];
  id: (kind: string, index: string | number) => string;
  metadata: (extra?: Record<string, unknown>) => Record<string, unknown>;
};

export type GrowthPackFixtures = {
  providers: (typeof providerAccount.$inferInsert)[];
  domains: (typeof emailDomain.$inferInsert)[];
  templates: (typeof emailTemplate.$inferInsert)[];
  audiences: (typeof savedAudience.$inferInsert)[];
  campaigns: (typeof campaign.$inferInsert)[];
  campaignRuns: (typeof campaignRun.$inferInsert)[];
  deliveries: (typeof outboundDelivery.$inferInsert)[];
  recipients: (typeof campaignRecipient.$inferInsert)[];
  routes: (typeof inboxRoute.$inferInsert)[];
  conversations: (typeof inboxConversation.$inferInsert)[];
  receipts: (typeof inboundMessageReceipt.$inferInsert)[];
  messages: (typeof inboxMessage.$inferInsert)[];
  smsConfigs: (typeof smsConfig.$inferInsert)[];
  smsMessages: (typeof smsMessage.$inferInsert)[];
  workflowRows: (typeof workflows.$inferInsert)[];
  nodes: (typeof node.$inferInsert)[];
  connections: (typeof connection.$inferInsert)[];
  executions: (typeof execution.$inferInsert)[];
  forms: (typeof form.$inferInsert)[];
  formSteps: (typeof formStep.$inferInsert)[];
  formFields: (typeof formField.$inferInsert)[];
  formSubmissions: (typeof formSubmission.$inferInsert)[];
  publicationTargets: (typeof publicationTarget.$inferInsert)[];
  publicationVersions: (typeof publicationVersion.$inferInsert)[];
  adSpendRows: (typeof adSpend.$inferInsert)[];
};

export type CommunicationFixtures = Pick<
  GrowthPackFixtures,
  | "providers"
  | "domains"
  | "templates"
  | "audiences"
  | "campaigns"
  | "campaignRuns"
  | "deliveries"
  | "recipients"
  | "routes"
  | "conversations"
  | "receipts"
  | "messages"
  | "smsConfigs"
  | "smsMessages"
>;

export type AutomationFixtures = Pick<
  GrowthPackFixtures,
  "workflowRows" | "nodes" | "connections" | "executions"
>;

export type FormFixtures = Pick<
  GrowthPackFixtures,
  "forms" | "formSteps" | "formFields" | "formSubmissions"
> & { publishedFormId: string };

export type PublicationFixtures = Pick<
  GrowthPackFixtures,
  "publicationTargets" | "publicationVersions"
>;

export type AdSpendFixtures = Pick<GrowthPackFixtures, "adSpendRows">;
