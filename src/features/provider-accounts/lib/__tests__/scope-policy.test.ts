import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  chooseDefaultProviderAccount,
  providerAccountMatchesExactScope,
  providerAccountMatchesScope,
} from "@/features/provider-accounts/lib/scope-policy";
import {
  providerAccountProviderSchema,
  smsProviderConfigSchema,
} from "@/features/provider-accounts/contracts";

test("provider accounts never cross organization boundaries", () => {
  assert.equal(
    providerAccountMatchesScope(
      {
        organizationId: "org-a",
        locationId: null,
        inheritToLocations: true,
      },
      { organizationId: "org-b", locationId: "location-b" },
    ),
    false,
  );
});

test("location account overrides an inheritable organization account", () => {
  const selected = chooseDefaultProviderAccount(
    [
      {
        id: "organization-default",
        organizationId: "org-a",
        locationId: null,
        inheritToLocations: true,
      },
      {
        id: "location-override",
        organizationId: "org-a",
        locationId: "location-a",
        inheritToLocations: false,
      },
    ],
    { organizationId: "org-a", locationId: "location-a" },
  );
  assert.equal(selected?.id, "location-override");
});

test("organization accounts do not inherit when sharing is disabled", () => {
  const selected = chooseDefaultProviderAccount(
    [
      {
        id: "organization-default",
        organizationId: "org-a",
        locationId: null,
        inheritToLocations: false,
      },
    ],
    { organizationId: "org-a", locationId: "location-a" },
  );
  assert.equal(selected, null);
});

test("subscription scope matching never inherits an organization account", () => {
  assert.equal(
    providerAccountMatchesExactScope(
      { organizationId: "org-a", locationId: null },
      { organizationId: "org-a", locationId: "location-a" },
    ),
    false,
  );
  assert.equal(
    providerAccountMatchesExactScope(
      { organizationId: "org-a", locationId: "location-a" },
      { organizationId: "org-a", locationId: "location-a" },
    ),
    true,
  );
});

test("tenant source has no global Resend credential fallback", () => {
  const sourceRoot = path.join(process.cwd(), "src");
  const sourceFiles = readdirSync(sourceRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter(
    (file) =>
      !file.includes("__tests__") &&
      (file.endsWith(".ts") || file.endsWith(".tsx")),
  );
  const forbidden = [
    /process\.env\.RESEND_API_KEY/,
    /process\.env\.RESEND_FROM_EMAIL/,
    /process\.env\.RESEND_WEBHOOK_SECRET/,
    /system:resend/,
    /resend:webhook/,
  ];
  for (const relativeFile of sourceFiles) {
    const contents = readFileSync(path.join(sourceRoot, relativeFile), "utf8");
    for (const token of forbidden) {
      assert.equal(
        token.test(contents),
        false,
        `${relativeFile} contains forbidden global Resend token ${token.source}`,
      );
    }
  }
});

test("tenant source has no global AI credential fallback", () => {
  const sourceRoot = path.join(process.cwd(), "src");
  const sourceFiles = readdirSync(sourceRoot, {
    recursive: true,
    encoding: "utf8",
  }).filter(
    (file) =>
      !file.includes("__tests__") &&
      (file.endsWith(".ts") || file.endsWith(".tsx")),
  );
  const forbidden = [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "OPENAI_API_KEY",
    "OPENCODE_GO_API_KEY",
  ];

  for (const relativeFile of sourceFiles) {
    const contents = readFileSync(path.join(sourceRoot, relativeFile), "utf8");
    for (const token of forbidden) {
      assert.equal(
        contents.includes(token),
        false,
        `${relativeFile} contains forbidden global AI token ${token}`,
      );
    }
  }
});

test("SMS providers use the shared scoped account contract", () => {
  for (const provider of ["TWILIO", "VONAGE", "MESSAGEBIRD"]) {
    assert.equal(
      providerAccountProviderSchema.safeParse(provider).success,
      true,
    );
  }
  assert.deepEqual(
    smsProviderConfigSchema.parse({
      fromNumber: "+442012345678",
      inheritToLocations: false,
    }),
    {
      schemaVersion: 1,
      ownershipMode: "TENANT_MANAGED_LEGACY",
      fromNumber: "+442012345678",
      inheritToLocations: false,
    },
  );
});

test("SMS configuration stores no plaintext provider credentials", () => {
  const schema = readFileSync(
    path.join(process.cwd(), "src/db/schema.ts"),
    "utf8",
  );
  const start = schema.indexOf("export const smsConfig = pgTable(");
  const end = schema.indexOf("export const smsMessage", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const smsConfigSource = schema.slice(start, end);
  assert.match(smsConfigSource, /"SmsConfig"/);
  assert.equal(smsConfigSource.includes("authToken"), false);
  assert.equal(smsConfigSource.includes("accountSid"), false);
  assert.equal(smsConfigSource.includes("providerAccountId"), true);
  assert.equal(smsConfigSource.includes("locationId"), true);
});
