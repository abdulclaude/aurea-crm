import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMicrosoftNotificationId,
  generateMicrosoftClientState,
  hashMicrosoftClientState,
  microsoftChangeNotificationCollectionSchema,
  microsoftClientStateMatches,
  type MicrosoftChangeNotification,
  type MicrosoftVerifiedChangeNotification,
} from "../subscription-contracts";

const notification: MicrosoftChangeNotification = {
  id: "notification-a",
  subscriptionId: "subscription-a",
  clientState: "secret-state",
  changeType: "created",
  resource: "me/messages/message-a",
  resourceData: {
    id: "message-a",
    "@odata.etag": "etag-a",
  },
};

const verifiedNotification: MicrosoftVerifiedChangeNotification = {
  id: notification.id,
  subscriptionId: notification.subscriptionId,
  changeType: notification.changeType,
  resource: notification.resource,
  resourceData: notification.resourceData,
};

describe("Microsoft subscription contracts", () => {
  it("generates unpredictable client states and stores only a matching hash", () => {
    const first = generateMicrosoftClientState();
    const second = generateMicrosoftClientState();
    const hash = hashMicrosoftClientState(first);

    assert.notEqual(first, second);
    assert.equal(first.length >= 32, true);
    assert.equal(microsoftClientStateMatches(first, hash), true);
    assert.equal(microsoftClientStateMatches(second, hash), false);
    assert.equal(microsoftClientStateMatches(first, "invalid"), false);
  });

  it("validates bounded change-notification collections", () => {
    assert.equal(
      microsoftChangeNotificationCollectionSchema.safeParse({
        value: [notification],
      }).success,
      true,
    );
    assert.equal(
      microsoftChangeNotificationCollectionSchema.safeParse({
        value: [{ ...notification, clientState: "" }],
      }).success,
      false,
    );
    assert.equal(
      microsoftChangeNotificationCollectionSchema.safeParse({
        value: Array.from({ length: 1_001 }, () => notification),
      }).success,
      false,
    );
  });

  it("builds stable channel-specific notification identifiers", () => {
    const first = buildMicrosoftNotificationId(
      "outlook",
      verifiedNotification,
    );
    const retry = buildMicrosoftNotificationId("outlook", {
      ...verifiedNotification,
    });
    const changed = buildMicrosoftNotificationId("outlook", {
      ...verifiedNotification,
      id: "notification-b",
    });
    const otherChannel = buildMicrosoftNotificationId(
      "onedrive",
      verifiedNotification,
    );

    assert.equal(first, retry);
    assert.notEqual(first, changed);
    assert.notEqual(first, otherChannel);
    assert.equal(first.includes(notification.clientState), false);
  });
});
