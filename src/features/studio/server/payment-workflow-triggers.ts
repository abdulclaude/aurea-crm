import { NodeType, StudioPaymentStatus } from "@/db/enums";

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
};

export async function triggerStudioPaymentWorkflows({
  payment,
}: StudioPaymentWorkflowInput): Promise<number> {
  const nodeType = getPaymentNodeType(payment.status);

  if (!nodeType) {
    return 0;
  }

  return triggerWorkflowsForNodeType({
    nodeType,
    organizationId: payment.organizationId,
    locationId: payment.locationId,
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
      return !paymentType || paymentType === payment.type;
    },
  });
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

function getStringFromJson(
  value: unknown,
  key: string,
): string | undefined {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const nested = value[key];
  return typeof nested === "string" ? nested : undefined;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
