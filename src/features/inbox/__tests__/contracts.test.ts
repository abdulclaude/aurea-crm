import assert from "node:assert/strict";
import test from "node:test";

import { ConversationChannel } from "@/db/enums";
import {
  createInboxConversationInputSchema,
  sendInboxMessageInputSchema,
} from "@/features/inbox/contracts";

test("email conversations require an approved sender and subject", () => {
  const base = {
    clientId: "client_1",
    channel: ConversationChannel.EMAIL,
    initialMessage: "Hello",
  } as const;

  assert.equal(createInboxConversationInputSchema.safeParse(base).success, false);
  assert.equal(
    createInboxConversationInputSchema.safeParse({
      ...base,
      subject: "Welcome",
      senderAddressId: "sender_1",
    }).success,
    true,
  );
});

test("non-email conversations do not require email sender fields", () => {
  assert.equal(
    createInboxConversationInputSchema.safeParse({
      clientId: "client_1",
      channel: ConversationChannel.SMS,
      initialMessage: "Hello",
    }).success,
    true,
  );
});

test("email reply inputs carry a stable sender address identifier", () => {
  const result = sendInboxMessageInputSchema.parse({
    conversationId: "conversation_1",
    content: "  Thanks for getting in touch.  ",
    senderAddressId: "sender_1",
  });

  assert.equal(result.content, "Thanks for getting in touch.");
  assert.equal(result.senderAddressId, "sender_1");
});
