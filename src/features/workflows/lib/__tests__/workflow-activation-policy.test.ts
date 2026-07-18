import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";
import { getWorkflowActivationIssues } from "../workflow-activation-policy";

const UNIMPLEMENTED_GRANULAR_PROVIDER_TRIGGERS = [
  NodeType.GOOGLE_CALENDAR_EVENT_CREATED,
  NodeType.GOOGLE_CALENDAR_EVENT_UPDATED,
  NodeType.GOOGLE_CALENDAR_EVENT_DELETED,
  NodeType.GOOGLE_DRIVE_FILE_CREATED,
  NodeType.GOOGLE_DRIVE_FILE_UPDATED,
  NodeType.GOOGLE_DRIVE_FILE_DELETED,
  NodeType.GOOGLE_DRIVE_FOLDER_CREATED,
  NodeType.OUTLOOK_NEW_EMAIL,
  NodeType.OUTLOOK_EMAIL_MOVED,
  NodeType.OUTLOOK_EMAIL_DELETED,
  NodeType.ONEDRIVE_FILE_CREATED,
  NodeType.ONEDRIVE_FILE_UPDATED,
  NodeType.ONEDRIVE_FILE_DELETED,
  NodeType.OUTLOOK_CALENDAR_EVENT_CREATED,
  NodeType.OUTLOOK_CALENDAR_EVENT_UPDATED,
  NodeType.OUTLOOK_CALENDAR_EVENT_DELETED,
  NodeType.SLACK_NEW_MESSAGE,
  NodeType.SLACK_MESSAGE_REACTION,
  NodeType.SLACK_CHANNEL_JOINED,
] as const;

describe("workflow activation policy", () => {
  it("accepts a connected workflow with one trigger", () => {
    assert.deepEqual(
      getWorkflowActivationIssues({
        isBundle: false,
        nodes: [
          { id: "trigger", type: NodeType.MANUAL_TRIGGER },
          { id: "action", type: NodeType.CREATE_CLIENT },
        ],
        connections: [{ fromNodeId: "trigger", toNodeId: "action" }],
      }),
      [],
    );
  });

  it("accepts a connected reusable bundle without a trigger", () => {
    assert.deepEqual(
      getWorkflowActivationIssues({
        isBundle: true,
        nodes: [
          { id: "set", type: NodeType.SET_VARIABLE },
          { id: "stop", type: NodeType.STOP_WORKFLOW },
        ],
        connections: [{ fromNodeId: "set", toNodeId: "stop" }],
      }),
      [],
    );
  });

  it("rejects an unconfigured condition", () => {
    const issues = getWorkflowActivationIssues({
      isBundle: false,
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "condition", type: NodeType.IF_ELSE, data: {} },
      ],
      connections: [{ fromNodeId: "trigger", toNodeId: "condition" }],
    });

    assert.ok(issues.includes("Configure every condition before activation."));
  });

  it("rejects incomplete class actions and accepts configured ones", () => {
    const invalid = getWorkflowActivationIssues({
      isBundle: false,
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "action", type: NodeType.STUDIO_CLASS_ACTION, data: {} },
      ],
      connections: [{ fromNodeId: "trigger", toNodeId: "action" }],
    });
    assert.ok(
      invalid.includes(
        "Configure every class and waitlist action before activation.",
      ),
    );

    const valid = getWorkflowActivationIssues({
      isBundle: false,
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        {
          id: "action",
          type: NodeType.STUDIO_CLASS_ACTION,
          data: {
            operation: "LEAVE_WAITLIST",
            classSource: "SELECTED",
            classId: "class-1",
            clientSource: "VARIABLE",
            clientId: "{{triggerData.clientId}}",
            variableName: "waitlistAction",
          },
        },
      ],
      connections: [{ fromNodeId: "trigger", toNodeId: "action" }],
    });
    assert.deepEqual(valid, []);
  });

  it("rejects placeholders, legacy nodes, and disconnected paths", () => {
    const issues = getWorkflowActivationIssues({
      isBundle: false,
      nodes: [
        { id: "initial", type: NodeType.INITIAL },
        { id: "legacy", type: NodeType.STRIPE_TRIGGER },
      ],
      connections: [],
    });

    assert.ok(issues.some((issue) => issue.includes("initial placeholder")));
    assert.ok(issues.some((issue) => issue.includes("unavailable or legacy")));
    assert.ok(issues.some((issue) => issue.includes("one workflow path")));
  });

  it("rejects cycles even when one trigger is present", () => {
    const issues = getWorkflowActivationIssues({
      isBundle: false,
      nodes: [
        { id: "trigger", type: NodeType.MANUAL_TRIGGER },
        { id: "a", type: NodeType.CREATE_CLIENT },
        { id: "b", type: NodeType.UPDATE_CLIENT },
      ],
      connections: [
        { fromNodeId: "trigger", toNodeId: "a" },
        { fromNodeId: "a", toNodeId: "b" },
        { fromNodeId: "b", toNodeId: "a" },
      ],
    });

    assert.ok(issues.some((issue) => issue.includes("cycles")));
  });

  it("rejects every provider event trigger without a dispatcher", () => {
    for (const type of UNIMPLEMENTED_GRANULAR_PROVIDER_TRIGGERS) {
      const issues = getWorkflowActivationIssues({
        isBundle: false,
        nodes: [
          { id: "trigger", type },
          { id: "action", type: NodeType.CREATE_CLIENT },
        ],
        connections: [{ fromNodeId: "trigger", toNodeId: "action" }],
      });

      assert.ok(
        issues.some((issue) => issue.includes("unavailable or legacy")),
        `${type} must block workflow activation`,
      );
    }
  });

  it("allows implemented generic provider triggers through activation policy", () => {
    for (const type of [
      NodeType.GOOGLE_CALENDAR_TRIGGER,
      NodeType.GMAIL_TRIGGER,
      NodeType.OUTLOOK_TRIGGER,
      NodeType.ONEDRIVE_TRIGGER,
    ]) {
      assert.deepEqual(
        getWorkflowActivationIssues({
          isBundle: false,
          nodes: [
            { id: "trigger", type },
            { id: "action", type: NodeType.CREATE_CLIENT },
          ],
          connections: [{ fromNodeId: "trigger", toNodeId: "action" }],
        }),
        [],
        type,
      );
    }
  });
});
