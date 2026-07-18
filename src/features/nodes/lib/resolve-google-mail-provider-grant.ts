import "server-only";

import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { WorkflowExecutionScope } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import {
  getWorkflowProviderBindingSpec,
  requiredWorkflowProviderBindingSchema,
} from "@/features/workflows/lib/workflow-provider-binding";

const GOOGLE_MAIL_NODE_TYPES = [
  NodeType.GMAIL_EXECUTION,
  NodeType.GMAIL_SEND_EMAIL,
  NodeType.GMAIL_REPLY_TO_EMAIL,
  NodeType.GMAIL_SEARCH_EMAILS,
  NodeType.GMAIL_ADD_LABEL,
  NodeType.GMAIL_TRIGGER,
] as const;

export type GoogleMailNodeType = (typeof GOOGLE_MAIL_NODE_TYPES)[number];
export type GoogleMailProviderGrant = Awaited<
  ReturnType<typeof resolveOAuthProviderGrant>
>;

export async function resolveGoogleMailProviderGrant(input: {
  nodeType: GoogleMailNodeType;
  providerAccountId?: string | null;
  scope: WorkflowExecutionScope;
}): Promise<GoogleMailProviderGrant> {
  const binding = requiredWorkflowProviderBindingSchema.safeParse({
    providerAccountId: input.providerAccountId,
  });
  if (!binding.success) {
    throw new NonRetriableError(
      "Select a connected Google Workspace account for this Gmail node.",
    );
  }
  const spec = getWorkflowProviderBindingSpec(input.nodeType);

  return resolveOAuthProviderGrant({
    provider: spec.provider,
    providerAccountId: binding.data.providerAccountId,
    scope: input.scope,
    requiredScopes: spec.requiredScopes,
  });
}
