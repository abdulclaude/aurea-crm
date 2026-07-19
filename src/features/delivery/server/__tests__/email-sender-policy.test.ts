import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { selectApprovedEmailSender } from "@/features/delivery/server/email-sender-policy";

const senders = [
  {
    email: "hello@first.example",
    displayName: "First workspace",
    replyTo: null,
    isDefault: true,
    isDisabled: false,
    removedAt: null,
  },
  {
    email: "team@first.example",
    displayName: "First workspace team",
    replyTo: "replies@first.example",
    isDefault: false,
    isDisabled: false,
    removedAt: null,
  },
  {
    email: "disabled@first.example",
    displayName: "Disabled",
    replyTo: null,
    isDefault: false,
    isDisabled: true,
    removedAt: null,
  },
] as const;

test("sender policy resolves the approved default and explicit address", () => {
  assert.equal(
    selectApprovedEmailSender(senders, null)?.email,
    "hello@first.example",
  );
  assert.equal(
    selectApprovedEmailSender(senders, " TEAM@FIRST.EXAMPLE ")?.email,
    "team@first.example",
  );
});

test("sender policy rejects unapproved and disabled addresses", () => {
  assert.equal(
    selectApprovedEmailSender(senders, "billing@first.example"),
    null,
  );
  assert.equal(
    selectApprovedEmailSender(senders, "disabled@first.example"),
    null,
  );
});

test("materially different sender configurations remain independent", () => {
  const secondWorkspace = [
    {
      email: "members@second.example",
      displayName: "Second workspace",
      replyTo: "support@second.example",
      isDefault: true,
      isDisabled: false,
      removedAt: null,
    },
  ];

  assert.equal(
    selectApprovedEmailSender(secondWorkspace, null)?.email,
    "members@second.example",
  );
  assert.equal(
    selectApprovedEmailSender(secondWorkspace, "hello@first.example"),
    null,
  );
});

test("custom-domain delivery cannot fall back around approved senders", () => {
  const resolver = readFileSync(
    path.join(
      process.cwd(),
      "src/features/delivery/server/email-sender.ts",
    ),
    "utf8",
  );

  assert.match(resolver, /selectApprovedEmailSender/);
  assert.doesNotMatch(resolver, /noreply@/);
  assert.doesNotMatch(
    resolver,
    /fromEmail:\s*input\.fromEmail\s*\?\?\s*domain\.defaultFromEmail/,
  );

  const campaignPreparation = readFileSync(
    path.join(
      process.cwd(),
      "src/features/campaigns/server/services/prepare-campaign-run.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(campaignPreparation, /selectedCampaign\.replyTo/);
});
