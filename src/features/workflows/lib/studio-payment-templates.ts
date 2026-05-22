import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioPaymentTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "payment-failed-recovery",
    name: "Payment failed recovery",
    description:
      "When a studio payment fails, tag the member and ask them to update their payment method.",
    nodes: [
      node("trigger", NodeType.STUDIO_PAYMENT_FAILED_TRIGGER, 0, 0, {
        variableName: "payment",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "paymentIssueMember",
        clientId: "{{payment.payment.clientId}}",
        tag: "payment-issue",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{payment.payment.clientId}}",
        message:
          "Your latest studio payment did not go through. Reply here if you need help updating your payment method.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
  {
    slug: "membership-payment-thank-you",
    name: "Membership payment thank-you",
    description:
      "When a membership payment succeeds, tag the member and send a short receipt follow-up.",
    nodes: [
      node("trigger", NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER, 0, 0, {
        variableName: "payment",
        paymentType: "MEMBERSHIP",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "paidMember",
        clientId: "{{payment.payment.clientId}}",
        tag: "paid-member",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{payment.payment.clientId}}",
        message:
          "Thanks for your membership payment. Your studio access is active.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
];
