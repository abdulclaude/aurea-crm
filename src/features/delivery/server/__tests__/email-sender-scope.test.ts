import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("email sender resolution prioritizes the exact location domain", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/features/delivery/server/email-sender.ts"),
    "utf8",
  );

  assert.match(
    source,
    /CASE WHEN \$\{emailDomain\.locationId\} = \$\{input\.locationId\} THEN 0 ELSE 1 END/,
  );
  assert.match(source, /resolveProviderAccount\(\{/);
});

test("explicit sender selection is revalidated in tenant scope", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/features/delivery/server/email-sender.ts"),
    "utf8",
  );

  assert.match(
    source,
    /eq\(emailSenderAddress\.id, input\.senderAddressId\)/,
  );
  assert.match(
    source,
    /eq\(emailSenderAddress\.organizationId, input\.organizationId\)/,
  );
  assert.match(
    source,
    /eq\(emailSenderAddress\.locationId, input\.locationId\)/,
  );
  assert.match(source, /eq\(emailDomain\.status, "VERIFIED"\)/);
  assert.match(source, /isNull\(emailDomain\.verificationStaleAt\)/);
});
