import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { providerAccount } from "@/db/schema";
import { toPublicProviderAccount } from "@/features/provider-accounts/server/public-account";

describe("integration provider account redaction", () => {
  it("returns typed configuration and secret-presence flags without secret values", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const row: typeof providerAccount.$inferSelect = {
      id: "provider-1",
      organizationId: "org-a",
      locationId: "location-a",
      provider: "MAILCHIMP",
      displayName: "Marketing audience",
      externalAccountId: null,
      encryptedSecret: "encrypted-api-key-value",
      encryptedWebhookSecret: "encrypted-webhook-value",
      ownershipMode: "TENANT_MANAGED_LEGACY",
      environment: "live",
      status: "PENDING_VERIFICATION",
      isDefault: true,
      capabilities: ["marketing.contacts.sync"],
      config: {
        provider: "MAILCHIMP",
        family: "MARKETING_SYNC",
        schemaVersion: 1,
        inheritToLocations: false,
        syncDirection: "BIDIRECTIONAL",
        syncCursor: null,
        resourceMappings: [],
        readiness: "NEEDS_REMOTE_VERIFICATION",
        audienceId: "audience-1",
        serverPrefix: "us21",
      },
      lastHealthCheckAt: null,
      lastSuccessAt: null,
      lastErrorCode: "REMOTE_CHECK_REQUIRED",
      createdByUserId: "user-a",
      createdAt: now,
      updatedAt: now,
    };

    const publicAccount = toPublicProviderAccount(row);
    const serialized = JSON.stringify(publicAccount);

    assert.equal(publicAccount.hasSecret, true);
    assert.equal(publicAccount.hasWebhookSecret, true);
    assert.equal(publicAccount.config?.provider, "MAILCHIMP");
    assert.equal("encryptedSecret" in publicAccount, false);
    assert.equal(serialized.includes("encrypted-api-key-value"), false);
    assert.equal(serialized.includes("encrypted-webhook-value"), false);
  });
});
