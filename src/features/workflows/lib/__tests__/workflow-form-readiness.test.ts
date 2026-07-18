import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import {
  getWorkflowFormReadinessIssues,
  type WorkflowReadinessForm,
} from "@/features/workflows/lib/workflow-form-readiness";

const leadForm: WorkflowReadinessForm = {
  id: "lead-form",
  name: "Lead consultation",
  status: "PUBLISHED",
  crmResolutionConfig: {
    enabled: true,
    matchBy: "EMAIL_OR_PHONE",
    createIfMissing: true,
    updateExisting: "FILL_EMPTY",
    emailFieldId: "email",
    phoneFieldId: "phone",
    fullNameFieldId: "name",
    firstNameFieldId: null,
    lastNameFieldId: null,
  },
  automationConfig: {
    version: 1,
    emailMarketingConsentFieldId: "email-consent",
    smsMarketingConsentFieldId: "sms-consent",
    followUpConsentFieldId: null,
  },
  fields: [
    { id: "name", label: "Name", type: "SHORT_TEXT", required: true },
    { id: "email", label: "Email", type: "EMAIL", required: true },
    { id: "phone", label: "Phone", type: "PHONE", required: true },
    {
      id: "email-consent",
      label: "Email permission",
      type: "CHECKBOX",
      required: false,
    },
    {
      id: "sms-consent",
      label: "SMS permission",
      type: "CHECKBOX",
      required: false,
    },
  ],
};

const nurtureNodes = [
  {
    id: "trigger",
    type: NodeType.FORM_SUBMITTED_TRIGGER,
    data: {
      formId: "lead-form",
      requireEmailMarketingConsent: true,
      requireSmsMarketingConsent: true,
      variableName: "lead",
    },
  },
  {
    id: "email",
    type: NodeType.SEND_EMAIL,
    data: { clientId: "{{lead.submission.clientId}}", purpose: "MARKETING" },
  },
  {
    id: "sms",
    type: NodeType.SEND_SMS,
    data: { clientId: "{{lead.submission.clientId}}", purpose: "MARKETING" },
  },
];
const nurtureConnections = [
  { fromNodeId: "trigger", toNodeId: "email" },
  { fromNodeId: "email", toNodeId: "sms" },
];

describe("workflow form readiness", () => {
  it("accepts a published lead form with identity and distinct consent", () => {
    assert.deepEqual(
      getWorkflowFormReadinessIssues({
        nodes: nurtureNodes,
        connections: nurtureConnections,
        forms: [leadForm],
      }),
      [],
    );
  });

  it("blocks any-form triggers before client-dependent actions", () => {
    const issues = getWorkflowFormReadinessIssues({
      nodes: [
        {
          id: "trigger",
          type: NodeType.FORM_SUBMITTED_TRIGGER,
          data: { formId: null, variableName: "lead" },
        },
        {
          id: "tag",
          type: NodeType.ADD_TAG_TO_CLIENT,
          data: { clientId: "{{lead.submission.clientId}}" },
        },
      ],
      connections: [{ fromNodeId: "trigger", toNodeId: "tag" }],
      forms: [],
    });

    assert.equal(issues.some((issue) => /specific form/i.test(issue)), true);
  });

  it("blocks nurture when permission gates or mapped fields are missing", () => {
    const incompatible: WorkflowReadinessForm = {
      ...leadForm,
      status: "DRAFT",
      crmResolutionConfig: { enabled: false },
      automationConfig: { version: 1 },
      fields: leadForm.fields.map((field) =>
        field.id === "phone" ? { ...field, required: false } : field,
      ),
    };
    const nodes = nurtureNodes.map((node) =>
      node.id === "trigger"
        ? {
            ...node,
            data: {
              formId: "lead-form",
              requireEmailMarketingConsent: false,
              requireSmsMarketingConsent: false,
            },
          }
        : node,
    );
    const issues = getWorkflowFormReadinessIssues({
      nodes,
      connections: nurtureConnections,
      forms: [incompatible],
    });

    assert.equal(issues.some((issue) => /publish/i.test(issue)), true);
    assert.equal(issues.some((issue) => /member profile mapping/i.test(issue)), true);
    assert.equal(issues.some((issue) => /email marketing permission/i.test(issue)), true);
    assert.equal(issues.some((issue) => /sms marketing permission/i.test(issue)), true);
  });
});
