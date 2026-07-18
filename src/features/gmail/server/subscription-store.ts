import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import type { InferSelectModel, SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  gmailSubscription,
  gmailTriggerState,
  node as workflowNode,
  providerAccount,
  workflows,
} from "@/db/schema";
import { NodeType } from "@/db/enums";

export type GmailSubscriptionRow = InferSelectModel<
  typeof gmailSubscription
>;
export type GmailTriggerNode = Pick<
  InferSelectModel<typeof workflowNode>,
  "id" | "workflowId" | "data" | "providerAccountId"
> & {
  organizationId: string;
  locationId: string | null;
  providerAccountLocationId: string | null;
};

export function exactLocationWhere(
  column: typeof workflows.locationId | typeof gmailSubscription.locationId,
  locationId: string | null,
): SQL {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export async function getGmailTriggerNodesForOrganization(
  organizationId: string,
  providerAccountId?: string,
): Promise<GmailTriggerNode[]> {
  return db
    .select({
      id: workflowNode.id,
      workflowId: workflowNode.workflowId,
      data: workflowNode.data,
      providerAccountId: workflowNode.providerAccountId,
      organizationId: workflows.organizationId,
      locationId: workflows.locationId,
      providerAccountLocationId: providerAccount.locationId,
    })
    .from(workflowNode)
    .innerJoin(workflows, eq(workflowNode.workflowId, workflows.id))
    .innerJoin(
      providerAccount,
      and(
        eq(providerAccount.id, workflowNode.providerAccountId),
        eq(providerAccount.organizationId, workflows.organizationId),
      ),
    )
    .where(
      and(
        eq(workflowNode.type, NodeType.GMAIL_TRIGGER),
        eq(workflows.organizationId, organizationId),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
        providerAccountId
          ? eq(workflowNode.providerAccountId, providerAccountId)
          : undefined,
      ),
    )
    .then((rows) =>
      rows.flatMap((row) =>
        row.organizationId ? [{ ...row, organizationId: row.organizationId }] : [],
      ),
    );
}

export async function deleteGmailTriggerStatesForOrganization(
  organizationId: string,
  exceptNodeIds?: string[],
): Promise<void> {
  const rows = await db
    .select({ id: gmailTriggerState.id, nodeId: gmailTriggerState.nodeId })
    .from(gmailTriggerState)
    .innerJoin(workflows, eq(gmailTriggerState.workflowId, workflows.id))
    .where(eq(workflows.organizationId, organizationId));
  const staleIds = rows
    .filter((row) => !exceptNodeIds?.includes(row.nodeId))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    await db
      .delete(gmailTriggerState)
      .where(inArray(gmailTriggerState.id, staleIds));
  }
}

export async function getGmailSubscriptionsForOrganization(
  organizationId: string,
): Promise<GmailSubscriptionRow[]> {
  return db.query.gmailSubscription.findMany({
    where: eq(gmailSubscription.organizationId, organizationId),
  });
}

export async function findExactGmailSubscription(input: {
  emailAddress: string;
  locationId: string | null;
  organizationId: string;
  providerAccountId: string;
  subscriptionId: string;
}): Promise<GmailSubscriptionRow | null> {
  return (
    (await db.query.gmailSubscription.findFirst({
      where: and(
        eq(gmailSubscription.id, input.subscriptionId),
        eq(gmailSubscription.organizationId, input.organizationId),
        exactLocationWhere(gmailSubscription.locationId, input.locationId),
        eq(gmailSubscription.providerAccountId, input.providerAccountId),
        eq(gmailSubscription.emailAddress, input.emailAddress),
      ),
    })) ?? null
  );
}
