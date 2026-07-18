import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { NodeType, StudioPaymentStatus } from "@/db/enums";
import { studioPayment } from "@/db/schema";

import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

type StudioPaymentWorkflowPayment = {
  id: string;
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  membershipId: string | null;
  amount: { toString(): string };
  currency: string;
  status: StudioPaymentStatus;
  type: string;
  description: string | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
};

type StudioPaymentWorkflowInput = {
  payment: StudioPaymentWorkflowPayment;
  idempotencyKey?: string;
};

export async function triggerStudioPaymentWorkflows({
  payment,
  idempotencyKey,
}: StudioPaymentWorkflowInput): Promise<number> {
  const nodeType = getPaymentNodeType(payment.status);

  if (!nodeType) {
    return 0;
  }

  const firstMembershipPayment =
    payment.status === StudioPaymentStatus.SUCCEEDED && payment.membershipId
      ? await isFirstSuccessfulMembershipPayment(payment.membershipId)
      : false;

  return triggerWorkflowsForNodeType({
    nodeType,
    organizationId: payment.organizationId,
    locationId: payment.locationId,
    idempotencyKey,
    triggerData: {
      payment: {
        id: payment.id,
        clientId: payment.clientId,
        membershipId: payment.membershipId,
        amount: payment.amount.toString(),
        currency: payment.currency,
        status: payment.status,
        type: payment.type,
        description: payment.description,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        createdAt: payment.createdAt.toISOString(),
      },
    },
    shouldTriggerNode: (node) => {
      const paymentType = getStringFromJson(node.data, "paymentType");
      const firstPaymentOnly = getBooleanFromJson(
        node.data,
        "firstPaymentOnly",
      );
      return (
        (!paymentType || paymentType === payment.type) &&
        (!firstPaymentOnly || firstMembershipPayment)
      );
    },
  });
}

async function isFirstSuccessfulMembershipPayment(
  membershipId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ value: count() })
    .from(studioPayment)
    .where(
      and(
        eq(studioPayment.membershipId, membershipId),
        eq(studioPayment.status, StudioPaymentStatus.SUCCEEDED),
      ),
    );
  return (row?.value ?? 0) === 1;
}

function getPaymentNodeType(status: StudioPaymentStatus): NodeType | null {
  if (status === StudioPaymentStatus.SUCCEEDED) {
    return NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER;
  }

  if (status === StudioPaymentStatus.FAILED) {
    return NodeType.STUDIO_PAYMENT_FAILED_TRIGGER;
  }

  return null;
}

function getStringFromJson(value: unknown, key: string): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
}

function getBooleanFromJson(value: unknown, key: string): boolean {
  if (!isJsonObject(value)) return false;
  return value[key] === true;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
