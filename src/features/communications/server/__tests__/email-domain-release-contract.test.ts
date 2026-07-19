import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const releaseService = readFileSync(
  path.join(
    process.cwd(),
    "src/features/email-domains/server/release-service.ts",
  ),
  "utf8",
);
const provisioning = readFileSync(
  path.join(
    process.cwd(),
    "src/features/communications/server/provisioning.ts",
  ),
  "utf8",
);

test("domain deletion disables sending and cancels conflicting work first", () => {
  assert.match(releaseService, /lifecycleState: "RELEASE_SCHEDULED"/);
  assert.match(releaseService, /isDisabled: true/);
  assert.match(releaseService, /status: "CANCELLED"/);
  assert.match(releaseService, /operationType,\s*"RELEASE"/);
});

test("provider success hard-deletes domain configuration from Aurea", () => {
  assert.match(provisioning, /resend\.domains\.remove\(existing\.id\)/);
  assert.match(provisioning, /deleteDomainAfterSuccess: true/);
  assert.match(provisioning, /\.delete\(emailSenderAddress\)/);
  assert.match(provisioning, /\.set\(\{ emailDomainId: null/);
  assert.match(provisioning, /\.delete\(emailDomain\)/);
  assert.ok(
    provisioning.indexOf("resend.domains.remove(existing.id)") <
      provisioning.indexOf(".delete(emailDomain)"),
  );
});
