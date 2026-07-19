import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("all direct communications plan gates use the testing access overlay", () => {
  for (const relativePath of [
    "src/features/communications/server/profile-service.ts",
    "src/features/communications/server/router.ts",
    "src/features/communications/server/twilio-sms-application.ts",
    "src/features/communications/server/voice-call-service.ts",
    "src/features/communications/server/voice-inbound-response.ts",
  ]) {
    assert.match(source(relativePath), /applyTestingPlanAccess/);
  }
});

test("testing access is unconditional without subscription-provider checks", () => {
  const profileService = source(
    "src/features/communications/server/profile-service.ts",
  );
  assert.doesNotMatch(profileService, /PlanRestrictionsDisabled/);
  assert.doesNotMatch(profileService, /NODE_ENV/);
});

test("testing access does not bypass spend controls or rewrite channel health", () => {
  const profileService = source(
    "src/features/communications/server/profile-service.ts",
  );
  assert.doesNotMatch(profileService, /emailState:\s*"ACTIVE"/);
  assert.doesNotMatch(profileService, /smsState:\s*"ACTIVE"/);
  assert.doesNotMatch(profileService, /voiceState:\s*"ACTIVE"/);

  for (const relativePath of [
    "src/features/communications/server/sms-spend-policy.ts",
    "src/features/communications/server/voice-spend-policy.ts",
  ]) {
    assert.doesNotMatch(source(relativePath), /PlanRestrictionsDisabled/);
  }
});
