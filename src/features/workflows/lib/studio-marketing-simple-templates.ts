import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioMarketingSimpleTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "form-submission-add-lead-tag",
    name: "Form submission: add lead tag",
    description:
      "Add an editable lead tag after a selected CRM or public form is submitted.",
    nodes: [
      node("trigger", NodeType.FORM_SUBMITTED_TRIGGER, 0, 0, {
        formId: null,
        variableName: "formSubmission",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "taggedLead",
        clientId: "{{formSubmission.submission.clientId}}",
        tag: "new-lead",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
  {
    slug: "tag-added-email-follow-up",
    name: "Tag added: email follow-up",
    description:
      "Send an editable first-party email when a selected client tag is added.",
    nodes: [
      node("trigger", NodeType.CLIENT_TAG_ADDED_TRIGGER, 0, 0, {
        variableName: "tagChange",
        tag: "email-follow-up",
      }),
      node("email", NodeType.SEND_EMAIL, 300, 0, {
        variableName: "followUpEmail",
        purpose: "MARKETING",
        clientId: "{{tagChange.client.id}}",
        subject: "A quick follow-up",
        html: "<p>Thanks for your interest. Reply if you would like help choosing a next step.</p>",
        text: "Thanks for your interest. Reply if you would like help choosing a next step.",
      }),
    ],
    connections: [connection("trigger", "email")],
  },
  {
    slug: "first-check-in-remove-first-timer-tag",
    name: "First check-in: remove first-timer tag",
    description:
      "Confirm the member is on their first visit before removing an editable first-timer tag.",
    nodes: [
      node("trigger", NodeType.MEMBER_CHECKED_IN_TRIGGER, 0, 0, {
        variableName: "checkIn",
      }),
      node("condition", NodeType.IF_ELSE, 300, 0, {
        variableName: "isFirstVisit",
        leftOperand: "{{checkIn.attendanceCount}}",
        operator: "equals",
        rightOperand: "1",
      }),
      node("remove", NodeType.REMOVE_TAG_FROM_CLIENT, 600, -100, {
        variableName: "updatedMember",
        clientId: "{{checkIn.clientId}}",
        tag: "first-timer",
      }),
    ],
    connections: [
      connection("trigger", "condition"),
      connection("condition", "remove", "true"),
    ],
  },
  {
    slug: "class-booked-remove-former-client-tag",
    name: "Class booked: remove former-client tag",
    description:
      "Refresh the booking client and remove an editable former-client tag only when it is still present.",
    nodes: [
      node("trigger", NodeType.CLASS_BOOKED_TRIGGER, 0, 0, {
        variableName: "booking",
      }),
      node("find", NodeType.FIND_CLIENTS, 300, 0, {
        variableName: "formerClients",
        clientId: "{{booking.clientId}}",
        tags: "former-client",
        limit: 1,
      }),
      node("condition", NodeType.IF_ELSE, 600, 0, {
        variableName: "isFormerClient",
        leftOperand: "{{formerClients.0.id}}",
        operator: "isNotEmpty",
        rightOperand: "",
      }),
      node("remove", NodeType.REMOVE_TAG_FROM_CLIENT, 900, -100, {
        variableName: "updatedClient",
        clientId: "{{booking.clientId}}",
        tag: "former-client",
      }),
    ],
    connections: [
      connection("trigger", "find"),
      connection("find", "condition"),
      connection("condition", "remove", "true"),
    ],
  },
  {
    slug: "class-count-level-milestone",
    name: "Class count: level milestone",
    description:
      "Add an editable progression tag when a member reaches two attended classes.",
    nodes: [
      node("trigger", NodeType.MEMBER_CLASS_COUNT_TRIGGER, 0, 0, {
        variableName: "milestone",
        targetCount: 2,
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "levelledMember",
        clientId: "{{milestone.clientId}}",
        tag: "class-level-1",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
  {
    slug: "pricing-option-purchased-segment-tag",
    name: "Pricing option purchased: add segment tag",
    description:
      "After an operator selects a pricing option, add an editable client segment tag.",
    nodes: [
      node("trigger", NodeType.PRICING_OPTION_PURCHASED_TRIGGER, 0, 0, {
        pricingOptionIds: [],
        variableName: "pricingPurchase",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "segmentedClient",
        clientId: "{{pricingPurchase.purchase.clientId}}",
        tag: "pricing-segment",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
  {
    slug: "client-inactivity-add-tag",
    name: "Client inactivity: add re-engagement tag",
    description:
      "After 90 days without attendance, add an editable re-engagement tag for internal follow-up.",
    nodes: [
      node("trigger", NodeType.CLIENT_INACTIVITY_TRIGGER, 0, 0, {
        variableName: "inactivity",
        days: 90,
        activityDimensions: [
          "CRM_INTERACTION",
          "CLASS_ATTENDANCE",
          "SUCCESSFUL_PAYMENT",
        ],
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "inactiveClient",
        clientId: "{{inactivity.client.id}}",
        tag: "re-engagement-needed",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
  {
    slug: "draft-pricing-purchase-automation",
    name: "Draft: pricing purchase automation",
    description:
      "Incomplete draft with no actions. Select a pricing option and add reviewed actions before activation.",
    nodes: [
      node("trigger", NodeType.PRICING_OPTION_PURCHASED_TRIGGER, 0, 0, {
        pricingOptionIds: [],
        variableName: "pricingPurchase",
      }),
    ],
    connections: [],
  },
  {
    slug: "draft-form-review-tag",
    name: "Draft: form review tag",
    description:
      "Incomplete internal-only draft. Select a form and replace the placeholder review tag before activation.",
    nodes: [
      node("trigger", NodeType.FORM_SUBMITTED_TRIGGER, 0, 0, {
        formId: null,
        variableName: "formSubmission",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "reviewedSubmission",
        clientId: "{{formSubmission.submission.clientId}}",
        tag: "configuration-incomplete",
      }),
    ],
    connections: [connection("trigger", "tag")],
  },
];
