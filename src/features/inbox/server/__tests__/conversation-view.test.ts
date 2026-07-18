import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  inboxConversationViewColumns,
  inboxMessageViewColumns,
} from "../conversation-view";

describe("inbox viewer projections", () => {
  it("never selects reply-routing bearer tokens", () => {
    assert.equal("replyRoutingTokenHash" in inboxConversationViewColumns, false);
  });

  it("does not expose provider receipt or account identifiers", () => {
    assert.equal("providerAccountId" in inboxMessageViewColumns, false);
    assert.equal("inboundReceiptId" in inboxMessageViewColumns, false);
    assert.equal("externalMessageId" in inboxMessageViewColumns, false);
  });
});
