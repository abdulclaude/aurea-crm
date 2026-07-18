import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import { providerAccountProviderSchema } from "@/features/provider-accounts/contracts";
import {
  GOOGLE_FULL_REQUIRED_SCOPES,
  MICROSOFT_REQUIRED_SCOPES,
  SLACK_REQUIRED_SCOPES,
} from "@/features/apps/constants";
import {
  getWorkflowProviderBindingSpec,
  isWorkflowProviderBindingNodeType,
  readWorkflowProviderAccountId,
  requiredWorkflowProviderBindingSchema,
  WORKFLOW_PROVIDER_BINDING_REGISTRY,
  workflowProviderBindingNodeTypeSchema,
} from "../workflow-provider-binding";

const EXPECTED_NODE_TYPES = [
  NodeType.GMAIL_EXECUTION,
  NodeType.GMAIL_SEND_EMAIL,
  NodeType.GMAIL_REPLY_TO_EMAIL,
  NodeType.GMAIL_SEARCH_EMAILS,
  NodeType.GMAIL_ADD_LABEL,
  NodeType.GMAIL_TRIGGER,
  NodeType.GOOGLE_CALENDAR_TRIGGER,
  NodeType.GOOGLE_CALENDAR_EXECUTION,
  NodeType.GOOGLE_CALENDAR_CREATE_EVENT,
  NodeType.GOOGLE_CALENDAR_UPDATE_EVENT,
  NodeType.GOOGLE_CALENDAR_DELETE_EVENT,
  NodeType.GOOGLE_DRIVE_CREATE_FOLDER,
  NodeType.GOOGLE_DRIVE_DELETE_FILE,
  NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE,
  NodeType.GOOGLE_DRIVE_MOVE_FILE,
  NodeType.GOOGLE_DRIVE_UPLOAD_FILE,
  NodeType.GOOGLE_FORM_READ_RESPONSES,
  NodeType.ONEDRIVE_EXECUTION,
  NodeType.ONEDRIVE_TRIGGER,
  NodeType.OUTLOOK_EXECUTION,
  NodeType.OUTLOOK_TRIGGER,
  NodeType.SLACK_SEND_MESSAGE,
] as const;

describe("workflow provider binding registry", () => {
  it("is authoritative for exactly the planned 22 node types", () => {
    assert.deepEqual(
      Object.keys(WORKFLOW_PROVIDER_BINDING_REGISTRY).sort(),
      [...EXPECTED_NODE_TYPES].sort(),
    );
    assert.equal(Object.keys(WORKFLOW_PROVIDER_BINDING_REGISTRY).length, 22);
  });

  it("uses supported account providers and non-duplicated scopes", () => {
    for (const nodeType of EXPECTED_NODE_TYPES) {
      const spec = getWorkflowProviderBindingSpec(nodeType);
      assert.equal(providerAccountProviderSchema.safeParse(spec.provider).success, true);
      assert.ok(spec.displayName.length > 0);
      assert.ok(spec.requiredScopes.length > 0);
      assert.equal(new Set(spec.requiredScopes).size, spec.requiredScopes.length);
    }
  });

  it("keeps per-action scopes least privilege", () => {
    assert.deepEqual(
      getWorkflowProviderBindingSpec(NodeType.GMAIL_SEND_EMAIL).requiredScopes,
      ["https://www.googleapis.com/auth/gmail.send"],
    );
    assert.deepEqual(
      getWorkflowProviderBindingSpec(NodeType.GMAIL_ADD_LABEL).requiredScopes,
      ["https://www.googleapis.com/auth/gmail.modify"],
    );
    assert.deepEqual(
      getWorkflowProviderBindingSpec(NodeType.OUTLOOK_EXECUTION).requiredScopes,
      ["Mail.Send"],
    );
    assert.deepEqual(
      getWorkflowProviderBindingSpec(NodeType.SLACK_SEND_MESSAGE).requiredScopes,
      ["chat:write"],
    );
  });

  it("requests every scope that an available OAuth workflow node can require", () => {
    const authorizationScopes = {
      GOOGLE_WORKSPACE: new Set(GOOGLE_FULL_REQUIRED_SCOPES),
      MICROSOFT_365: new Set(MICROSOFT_REQUIRED_SCOPES),
      SLACK_OAUTH: new Set(SLACK_REQUIRED_SCOPES),
    } as const;
    for (const nodeType of EXPECTED_NODE_TYPES) {
      const spec = getWorkflowProviderBindingSpec(nodeType);
      for (const requiredScope of spec.requiredScopes) {
        assert.equal(
          authorizationScopes[spec.provider].has(requiredScope),
          true,
          `${nodeType} requires an OAuth scope that the connect flow never requests`,
        );
      }
    }
  });

  it("validates supported node types and requires a non-empty binding", () => {
    assert.equal(isWorkflowProviderBindingNodeType(NodeType.GMAIL_TRIGGER), true);
    assert.equal(isWorkflowProviderBindingNodeType(NodeType.SEND_SMS), false);
    assert.equal(
      workflowProviderBindingNodeTypeSchema.safeParse(NodeType.SEND_SMS).success,
      false,
    );
    assert.deepEqual(requiredWorkflowProviderBindingSchema.parse({
      providerAccountId: "  account-1  ",
    }), { providerAccountId: "account-1" });
    assert.equal(
      requiredWorkflowProviderBindingSchema.safeParse({ providerAccountId: "  " })
        .success,
      false,
    );
    assert.equal(
      requiredWorkflowProviderBindingSchema.safeParse({
        providerAccountId: "account-1",
        unexpected: true,
      }).success,
      false,
    );
    assert.equal(
      readWorkflowProviderAccountId({ providerAccountId: "  account-1  " }),
      "account-1",
    );
    assert.equal(readWorkflowProviderAccountId({}), null);
  });
});
