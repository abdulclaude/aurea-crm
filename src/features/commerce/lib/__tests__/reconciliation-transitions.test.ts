import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAcknowledgeIssue,
  canResolveIssue,
} from "../reconciliation-transitions";

describe("reconciliation issue transitions", () => {
  it("allows idempotent acknowledge and resolve transitions", () => {
    assert.equal(canAcknowledgeIssue("OPEN"), true);
    assert.equal(canAcknowledgeIssue("ACKNOWLEDGED"), true);
    assert.equal(canResolveIssue("RESOLVED"), true);
  });

  it("does not reopen ignored or resolved issues through acknowledge", () => {
    assert.equal(canAcknowledgeIssue("RESOLVED"), false);
    assert.equal(canAcknowledgeIssue("IGNORED"), false);
    assert.equal(canResolveIssue("IGNORED"), false);
  });
});
