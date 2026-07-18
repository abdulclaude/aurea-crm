import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildConversationReplyAddress,
  createConversationReplyToken,
  hashConversationReplyToken,
  parseConversationReplyAddress,
} from "../reply-routing";

const secret = "test-inbox-routing-secret-with-32-chars";

describe("inbox reply routing", () => {
  it("round-trips an opaque conversation route", () => {
    const address = buildConversationReplyAddress({
      inboundAddress: "reply@example.com",
      conversationId: "conversation-123",
      secret,
    });
    assert.doesNotMatch(address, /conversation-123/);
    assert.deepEqual(
      parseConversationReplyAddress({
        recipient: address,
        inboundAddress: "reply@example.com",
      }),
      {
        kind: "CONVERSATION",
        routingToken: createConversationReplyToken({
          conversationId: "conversation-123",
          secret,
        }),
      },
    );
    assert.ok(address.split("@")[0]!.length <= 64);
    const token = createConversationReplyToken({
      conversationId: "conversation-123",
      secret,
    });
    assert.notEqual(hashConversationReplyToken(token), token);
    assert.match(hashConversationReplyToken(token), /^[a-f0-9]{64}$/);
  });

  it("accepts an exact route as a new conversation and rejects tampering", () => {
    assert.deepEqual(
      parseConversationReplyAddress({
        recipient: "reply@example.com",
        inboundAddress: "reply@example.com",
      }),
      { kind: "EXACT" },
    );
    const address = buildConversationReplyAddress({
      inboundAddress: "reply@example.com",
      conversationId: "conversation-123",
      secret,
    });
    assert.deepEqual(
      parseConversationReplyAddress({
        recipient: address.replace("v1.", "v1.x"),
        inboundAddress: "reply@example.com",
      }),
      { kind: "INVALID_TOKEN" },
    );
  });
});
