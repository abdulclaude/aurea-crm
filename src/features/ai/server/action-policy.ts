import type { Capability } from "@/features/permissions/capabilities";

export type AssistantIntentPolicy = {
  capability: Capability;
  effect: "read" | "draft" | "write" | "external";
  confirmation: "none" | "explicit-command";
};

export const ASSISTANT_INTENT_POLICIES = {
  createClient: {
    capability: "customer.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  createDeal: {
    capability: "customer.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  createPipeline: {
    capability: "customer.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  createTask: {
    capability: "customer.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  logNote: {
    capability: "customer.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  sendEmail: {
    capability: "messaging.send",
    effect: "external",
    confirmation: "explicit-command",
  },
  scheduleMeeting: {
    capability: "schedule.manage",
    effect: "external",
    confirmation: "explicit-command",
  },
  runWorkflow: {
    capability: "workflow.manage",
    effect: "external",
    confirmation: "explicit-command",
  },
  generateWorkflow: {
    capability: "workflow.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  generateBundle: {
    capability: "workflow.manage",
    effect: "write",
    confirmation: "explicit-command",
  },
  listWorkflows: {
    capability: "workflow.view",
    effect: "read",
    confirmation: "none",
  },
  showWorkflows: {
    capability: "workflow.view",
    effect: "read",
    confirmation: "none",
  },
  showClients: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  showDeals: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  showPipelines: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  queryClients: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  queryDeals: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  search: {
    capability: "customer.view",
    effect: "read",
    confirmation: "none",
  },
  summarise: {
    capability: "customer.view",
    effect: "draft",
    confirmation: "none",
  },
  explain: {
    capability: "customer.view",
    effect: "draft",
    confirmation: "none",
  },
  draftEmail: {
    capability: "customer.view",
    effect: "draft",
    confirmation: "none",
  },
  analyze: {
    capability: "customer.view",
    effect: "draft",
    confirmation: "none",
  },
  research: {
    capability: "customer.view",
    effect: "draft",
    confirmation: "none",
  },
} as const satisfies Record<string, AssistantIntentPolicy>;

export function getAssistantIntentPolicy(
  handler: string,
): AssistantIntentPolicy | null {
  if (!Object.hasOwn(ASSISTANT_INTENT_POLICIES, handler)) return null;
  return ASSISTANT_INTENT_POLICIES[
    handler as keyof typeof ASSISTANT_INTENT_POLICIES
  ];
}

export function messageConfirmsCommand(
  message: string,
  expectedCommand: string,
): boolean {
  const [commandToken] = message.trimStart().split(/\s+/, 1);
  return commandToken === expectedCommand;
}
