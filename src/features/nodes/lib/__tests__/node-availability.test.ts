import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NodeType } from "@/db/enums";

import { nodeTypeIsAvailable } from "../node-availability";

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

describe("node availability", () => {
  it("keeps implemented scoped actions available", () => {
    assert.equal(nodeTypeIsAvailable(NodeType.GMAIL_SEND_EMAIL), true);
    assert.equal(nodeTypeIsAvailable(NodeType.SLACK_SEND_MESSAGE), true);
    assert.equal(nodeTypeIsAvailable(NodeType.SEND_SMS), true);
    assert.equal(nodeTypeIsAvailable(NodeType.CREATE_TASK), true);
  });

  it("does not offer placeholder provider actions", () => {
    assert.equal(
      nodeTypeIsAvailable(NodeType.STRIPE_CREATE_CHECKOUT_SESSION),
      false,
    );
    assert.equal(nodeTypeIsAvailable(NodeType.OUTLOOK_SEND_EMAIL), false);
    assert.equal(nodeTypeIsAvailable(NodeType.TELEGRAM_SEND_MESSAGE), false);
    assert.equal(nodeTypeIsAvailable(NodeType.STRIPE_TRIGGER), false);
    assert.equal(nodeTypeIsAvailable(NodeType.ANTHROPIC), false);
    assert.equal(nodeTypeIsAvailable(NodeType.OPENAI), false);
  });

  it("does not allow selecting provider event triggers without dispatchers", () => {
    for (const nodeType of UNIMPLEMENTED_GRANULAR_PROVIDER_TRIGGERS) {
      assert.equal(
        nodeTypeIsAvailable(nodeType),
        false,
        `${nodeType} must remain unavailable until its subscription dispatcher exists`,
      );
    }
  });

  it("keeps implemented generic provider triggers selectable", () => {
    for (const nodeType of [
      NodeType.GOOGLE_CALENDAR_TRIGGER,
      NodeType.GMAIL_TRIGGER,
      NodeType.OUTLOOK_TRIGGER,
      NodeType.ONEDRIVE_TRIGGER,
    ]) {
      assert.equal(nodeTypeIsAvailable(nodeType), true, nodeType);
    }
  });

  it("keeps first-party studio automation triggers selectable", () => {
    for (const nodeType of [
      NodeType.FORM_SUBMITTED_TRIGGER,
      NodeType.PRICING_OPTION_PURCHASED_TRIGGER,
      NodeType.CLIENT_INACTIVITY_TRIGGER,
    ]) {
      assert.equal(nodeTypeIsAvailable(nodeType), true, nodeType);
    }
  });
});
