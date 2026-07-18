import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const dialogSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/nodes/triggers/components/outlook-trigger/dialog.tsx",
  ),
  "utf8",
);
const subscriptionSource = readFileSync(
  path.join(process.cwd(), "src/features/outlook/server/subscriptions.ts"),
  "utf8",
);

describe("Outlook trigger contract", () => {
  it("advertises only the Inbox subscription behavior it implements", () => {
    assert.match(dialogSource, /folderName: z\.literal\("Inbox"\)/);
    assert.doesNotMatch(dialogSource, /name="maxResults"/);
    assert.doesNotMatch(dialogSource, /name="pollIntervalMinutes"/);
    assert.match(subscriptionSource, /resource: "me\/mailFolders\('Inbox'\)\/messages"/);
    assert.match(subscriptionSource, /resourceData: notification\.resourceData/);
    assert.match(subscriptionSource, /fetchOutlookMessage\(input\.grant, input\.messageId\)/);
    assert.doesNotMatch(subscriptionSource, /\$top=1/);
  });
});
