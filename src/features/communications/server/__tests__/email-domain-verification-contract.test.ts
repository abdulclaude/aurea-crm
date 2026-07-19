import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("verifying domains are refreshed through durable provisioning work", () => {
  const verification = source(
    "src/features/communications/server/email-domain-verification.ts",
  );
  const inngestFunctions = source(
    "src/features/communications/server/inngest-functions.ts",
  );

  assert.match(verification, /eq\(emailDomain\.status, "VERIFYING"\)/);
  assert.match(verification, /notExists\(/);
  assert.match(
    verification,
    /resend-domain:verification-refresh:\$\{domain\.id\}:\$\{bucket\}/,
  );
  assert.match(verification, /\.onConflictDoNothing\(\)/);
  assert.match(inngestFunctions, /enqueueVerifyingEmailDomainRefreshes\(\)/);
});

test("verification notifications are scoped to provider administrators", () => {
  const verification = source(
    "src/features/communications/server/email-domain-verification.ts",
  );

  assert.match(verification, /inArray\(member\.role, \["owner", "admin"\]\)/);
  assert.match(
    verification,
    /inArray\(locationMember\.role, \["AGENCY", "ADMIN"\]\)/,
  );
  assert.match(verification, /isStaffIdentityAccessBlocked/);
  assert.match(verification, /EMAIL_DOMAIN_VERIFIED/);
});

test("the verified transition and notification insert share one transaction", () => {
  const provisioning = source(
    "src/features/communications/server/provisioning.ts",
  );

  assert.match(provisioning, /\.for\("update"\)/);
  assert.match(provisioning, /currentDomain\.status !== "VERIFIED"/);
  assert.match(provisioning, /result\.domainValues\.status === "VERIFIED"/);
  assert.match(
    provisioning,
    /insertEmailDomainVerifiedNotifications\(tx, currentDomain\)/,
  );
});

test("verification notifications are deterministic and conflict-safe", () => {
  const verification = source(
    "src/features/communications/server/email-domain-verification.ts",
  );

  assert.match(
    verification,
    /email-domain-verified:\$\{domainId\}:\$\{userId\}/,
  );
  assert.match(
    verification,
    /\.onConflictDoNothing\(\{ target: notification\.id \}\)/,
  );
});
