import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "drizzle/0080_communications_platform_foundation.sql",
  ),
  "utf8",
);
const convergenceMigration = readFileSync(
  path.join(
    process.cwd(),
    "drizzle/0085_communications_schema_convergence.sql",
  ),
  "utf8",
);
const controlsMigration = readFileSync(
  path.join(process.cwd(), "drizzle/0086_communication_controls.sql"),
  "utf8",
);

describe("communications migration", () => {
  it("is forward-only and preserves legacy communications tables", () => {
    assert.match(
      migration,
      /ALTER TABLE "ProviderAccount" ADD COLUMN "ownershipMode"/,
    );
    assert.doesNotMatch(
      migration,
      /DROP TABLE "(?:SmsConfig|SmsMessage|OutboundDelivery|InboxMessage)"/,
    );
  });

  it("creates tenant-scoped operational resources", () => {
    for (const table of [
      "CommunicationServiceProfile",
      "TwilioComplianceRegistration",
      "TwilioPhoneNumber",
      "VoiceCall",
      "CommunicationProvisioningOperation",
      "CommunicationAuditEvent",
      "CommunicationUsageLedger",
      "CommunicationWebhookReceipt",
    ]) {
      assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
    }
    assert.match(migration, /Campaign_organizationId_emailDomainId_fkey/);
    assert.match(migration, /Campaign_organizationId_templateId_fkey/);
    assert.match(
      migration,
      /ProviderAccount_twilio_platform_external_account_key/,
    );
    assert.match(migration, /VoiceCall_org_provider_phoneNumberId_fkey/);
    assert.match(
      migration,
      /CommunicationUsageLedger_organizationId_deliveryId_fkey/,
    );
    assert.match(migration, /VoiceCall_organization_idempotency_key/);
    assert.match(migration, /"providerCostCurrency" varchar\(3\)/);
  });

  it("does not null a required organization through a composite foreign key", () => {
    for (const constraint of [
      "EmailDomain_organizationId_providerAccountId_fkey",
      "VoiceCall_organizationId_locationId_fkey",
      "VoiceCall_organizationId_clientId_fkey",
      "CommunicationProvisioningOperation_organizationId_providerAccountId_fkey",
      "CommunicationUsageLedger_organizationId_locationId_fkey",
      "CommunicationUsageLedger_organizationId_voiceCallId_fkey",
      "CommunicationWebhookReceipt_organizationId_locationId_fkey",
      "CommunicationWebhookReceipt_organizationId_providerAccountId_fkey",
      "EmailDomain_organizationId_locationId_fkey",
      "TwilioPhoneNumber_organizationId_locationId_fkey",
    ]) {
      const statement = migration
        .split(";\n")
        .find((part) => part.includes(`CONSTRAINT "${constraint}"`));
      assert.ok(statement, `missing ${constraint}`);
      assert.doesNotMatch(statement, /ON DELETE set null/);
    }
  });

  it("fails on legacy campaign scope conflicts instead of changing data", () => {
    assert.match(
      migration,
      /Campaign contains cross-organization email-domain bindings/,
    );
    assert.match(
      migration,
      /Campaign contains cross-organization location bindings/,
    );
    assert.match(
      migration,
      /Campaign contains cross-organization template bindings/,
    );
    assert.doesNotMatch(
      migration,
      /UPDATE "Campaign"[\s\S]{0,300}SET "(?:emailDomainId|locationId)" = NULL/,
    );
    assert.match(migration, /domain\."locationId" IS DISTINCT FROM campaign\."locationId"/);
    assert.match(migration, /template\."locationId" IS DISTINCT FROM campaign\."locationId"/);
    assert.match(migration, /Campaign_communication_scope_trigger/);
  });

  it("enables RLS on every new tenant-owned table", () => {
    const tables =
      migration.match(/CREATE TABLE "(?:Communication|Twilio|Voice)[^"]+"/g) ??
      [];
    for (const statement of tables) {
      const table = statement.slice('CREATE TABLE "'.length, -1);
      assert.match(
        migration,
        new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`),
      );
    }
  });

  it("converges workspaces that applied an earlier communications migration", () => {
    assert.match(
      convergenceMigration,
      /ADD COLUMN IF NOT EXISTS "complianceRegistrationId" text/,
    );
    assert.match(
      convergenceMigration,
      /ADD COLUMN IF NOT EXISTS "providerCostCurrency" varchar\(3\)/,
    );
    assert.match(
      convergenceMigration,
      /CREATE TABLE IF NOT EXISTS "CommunicationAuditEvent"/,
    );
    assert.match(
      convergenceMigration,
      /CREATE UNIQUE INDEX "OutboundDelivery_organizationId_id_key"/,
    );
    assert.doesNotMatch(convergenceMigration, /DROP TABLE/);
  });

  it("adds versioned communication controls without rewriting deliveries", () => {
    for (const table of ["CommunicationRule", "CommunicationRuleVersion", "MailboxBlocklistEntry"]) {
      assert.match(controlsMigration, new RegExp(`CREATE TABLE "${table}"`));
      assert.match(
        controlsMigration,
        new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`),
      );
    }
    assert.match(controlsMigration, /ADD COLUMN "communicationRuleVersionId" text/);
    assert.match(controlsMigration, /OutboundDelivery_scope_communicationRuleVersion_fkey/);
    assert.match(controlsMigration, /CommunicationRuleVersion_org_rule_id_key/);
    assert.match(controlsMigration, /CommunicationRule_exact_scope_id_key/);
    assert.match(controlsMigration, /OutboundDelivery_communicationRuleBinding_check/);
    assert.match(
      controlsMigration,
      /FOREIGN KEY \("organizationId", "scopeKey", "ruleId"\)/,
    );
    assert.match(controlsMigration, /OutboundDelivery_communication_scope_integrity/);
    assert.match(controlsMigration, /IS NOT DISTINCT FROM NEW\."locationId"/);
    assert.doesNotMatch(controlsMigration, /UPDATE "OutboundDelivery"/);
    assert.doesNotMatch(controlsMigration, /DROP TABLE|DROP COLUMN/);
  });

  it("preserves immutable delivery rule references", () => {
    for (const constraint of [
      "OutboundDelivery_scope_communicationRule_fkey",
      "OutboundDelivery_scope_communicationRuleVersion_fkey",
    ]) {
      const statement = controlsMigration
        .split(";\n")
        .find((part) => part.includes(`CONSTRAINT "${constraint}"`));
      assert.ok(statement, `missing ${constraint}`);
      assert.match(statement, /ON DELETE restrict/);
      assert.doesNotMatch(statement, /ON DELETE set null/);
    }
  });
});
