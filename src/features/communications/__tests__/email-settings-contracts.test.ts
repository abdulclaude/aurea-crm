import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createEmailSenderAddressSchema,
  emailDesignSettingsSchema,
  emailTestSendSchema,
} from "@/features/communications/email-settings-contracts";

const customDesign = {
  logoMode: "CUSTOM",
  customLogoUrl: "https://assets.example.com/email-logo.png",
  colorMode: "CUSTOM",
  headerTextColor: "#111827",
  bodyTextColor: "#374151",
  buttonColor: "#0f766e",
  backgroundColor: "#f8fafc",
  primaryFont: "Georgia",
  secondaryFont: "Arial",
  socialLinks: {
    instagram: "https://instagram.com/example",
    facebook: null,
    x: null,
    pinterest: null,
    youtube: null,
    linkedin: null,
  },
} as const;

test("email design supports independent workspace and custom configurations", () => {
  assert.equal(emailDesignSettingsSchema.safeParse(customDesign).success, true);
  assert.equal(
    emailDesignSettingsSchema.safeParse({
      ...customDesign,
      logoMode: "WORKSPACE",
      customLogoUrl: null,
      colorMode: "WORKSPACE",
      primaryFont: "Helvetica Neue",
      secondaryFont: "Lato",
      socialLinks: {
        instagram: null,
        facebook: "https://facebook.com/another-workspace",
        x: null,
        pinterest: null,
        youtube: "https://youtube.com/@another-workspace",
        linkedin: null,
      },
    }).success,
    true,
  );
});

test("custom logo and custom-recipient tests require their dependent values", () => {
  assert.equal(
    emailDesignSettingsSchema.safeParse({
      ...customDesign,
      customLogoUrl: null,
    }).success,
    false,
  );
  assert.equal(
    emailTestSendSchema.safeParse({
      senderAddressId: "sender_1",
      scenario: "CUSTOM",
      recipient: null,
    }).success,
    false,
  );
});

test("sender addresses normalize email boundaries", () => {
  const result = createEmailSenderAddressSchema.parse({
    emailDomainId: "domain_1",
    email: " Hello@Example.COM ",
    displayName: "Example Studio",
    replyTo: " SUPPORT@EXAMPLE.COM ",
    isDefault: true,
  });

  assert.equal(result.email, "hello@example.com");
  assert.equal(result.replyTo, "support@example.com");
});

test("migration preserves legacy domain senders and enforces scoped defaults", () => {
  const migration = readFileSync(
    path.join(process.cwd(), "drizzle/0089_email_sender_settings.sql"),
    "utf8",
  );

  assert.match(migration, /INSERT INTO "EmailSenderAddress"/);
  assert.match(migration, /FROM "EmailDomain" AS domain/);
  assert.match(migration, /'noreply@' \|\| domain\."domain"/);
  assert.match(migration, /EmailSenderAddress_scope_default_key/);
  assert.match(migration, /EmailDesignProfile_scope_key/);
});

test("location email design inherits the organization profile before defaults", () => {
  const service = readFileSync(
    path.join(
      process.cwd(),
      "src/features/communications/server/email-design-service.ts",
    ),
    "utf8",
  );

  assert.match(service, /or\(\s*eq\(emailDesignProfile\.locationId/);
  assert.match(service, /isNull\(emailDesignProfile\.locationId\)/);
  assert.match(service, /CASE WHEN.*locationId.*THEN 0 ELSE 1 END/s);
});

test("campaign sender choices include organization senders for locations", () => {
  const router = readFileSync(
    path.join(
      process.cwd(),
      "src/features/communications/server/email-settings-router.ts",
    ),
    "utf8",
  );

  assert.match(router, /senderChoiceScopeWhere/);
  assert.match(
    router,
    /or\(\s*eq\(emailSenderAddress\.locationId,\s*locationId\),\s*isNull\(emailSenderAddress\.locationId\)/s,
  );
  assert.match(
    router,
    /authorizeMessaging[\s\S]*capability: "messaging\.send"/,
  );
});
