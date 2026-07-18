import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const processor = readFileSync(
  path.join(process.cwd(), "src/features/gmail/server/notification-processor.ts"),
  "utf8",
);
const history = readFileSync(
  path.join(process.cwd(), "src/features/gmail/server/history.ts"),
  "utf8",
);
const contract = readFileSync(
  path.join(process.cwd(), "src/features/gmail/server/pubsub-contract.ts"),
  "utf8",
);

describe("Gmail history processing", () => {
  it("processes every messageAdded record from the persisted cursor", () => {
    assert.match(history, /historyTypes", "messageAdded"/);
    assert.match(history, /nextPageToken/);
    assert.match(processor, /startHistoryId: subscription\.historyId/);
    assert.match(processor, /for \(const message of nodeHistory\.messages\)/);
  });

  it("deduplicates a Gmail message independently of PubSub envelope IDs", () => {
    const eventIdBody = contract.slice(contract.indexOf("export function gmailWorkflowEventId"));
    assert.doesNotMatch(eventIdBody, /pubSubMessageId/);
    assert.match(eventIdBody, /latestMessageId/);
  });
});
