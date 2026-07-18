import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  integrationProviderSchema,
} from "@/features/provider-accounts/contracts";
import {
  integrationProviderCatalog,
  parseIntegrationProviderConfig,
  parseIntegrationProviderSecret,
} from "@/features/provider-accounts/integration-catalog";
import {
  integrationAccountMatchesScope,
  validateIntegrationDraft,
} from "@/features/provider-accounts/lib/integration-policy";

describe("integration provider control-plane policy", () => {
  it("covers every requested provider family with typed contracts", () => {
    assert.deepEqual(
      integrationProviderCatalog.map((item) => item.provider),
      ["CLASSPASS", "WELLHUB", "KISI", "MAILCHIMP", "ZOOM", "SPIVI"],
    );
    for (const definition of integrationProviderCatalog) {
      assert.equal(
        integrationProviderSchema.safeParse(definition.provider).success,
        true,
      );
      assert.ok(definition.capabilities.length > 0);
    }
    assert.equal(
      parseIntegrationProviderSecret("ZOOM", {
        accountId: "account",
        clientId: "client",
        clientSecret: "secret",
      }).provider,
      "ZOOM",
    );
    assert.throws(() =>
      parseIntegrationProviderSecret("KISI", { clientSecret: "wrong-shape" }),
    );
  });

  it("uses exact location scope with explicit organization inheritance", () => {
    const inherited = parseIntegrationProviderConfig("KISI", {
      inheritToLocations: true,
      placeId: "place-1",
    });
    const privateOrganization = parseIntegrationProviderConfig("SPIVI", {
      inheritToLocations: false,
      studioId: "studio-1",
    });
    const local = parseIntegrationProviderConfig("ZOOM", {
      hostEmail: "host@example.com",
    });

    assert.equal(
      integrationAccountMatchesScope(
        { organizationId: "org-a", locationId: null, config: inherited },
        { organizationId: "org-a", locationId: "location-a" },
      ),
      true,
    );
    assert.equal(
      integrationAccountMatchesScope(
        {
          organizationId: "org-a",
          locationId: null,
          config: privateOrganization,
        },
        { organizationId: "org-a", locationId: "location-a" },
      ),
      false,
    );
    assert.equal(
      integrationAccountMatchesScope(
        { organizationId: "org-a", locationId: "location-a", config: local },
        { organizationId: "org-a", locationId: "location-b" },
      ),
      false,
    );
    assert.equal(
      integrationAccountMatchesScope(
        { organizationId: "org-a", locationId: null, config: inherited },
        { organizationId: "org-b", locationId: "location-a" },
      ),
      false,
    );
  });

  it("requires remote verification after two materially different valid drafts", () => {
    const classPass = validateIntegrationDraft({
      provider: "CLASSPASS",
      inheritToLocations: true,
      syncDirection: "BIDIRECTIONAL",
      syncCursor: null,
      resourceMappings: [],
      settings: { partnerId: "partner-1" },
      credentials: { apiKey: "class-pass-secret" },
      hasStoredSecret: false,
    });
    const zoom = validateIntegrationDraft({
      provider: "ZOOM",
      inheritToLocations: false,
      syncDirection: "OUTBOUND",
      syncCursor: "cursor-10",
      resourceMappings: [
        {
          resourceType: "instructor",
          localResourceId: "instructor-1",
          externalResourceId: "zoom-user-1",
        },
      ],
      settings: { hostEmail: "host@example.com" },
      credentials: {
        accountId: "account",
        clientId: "client",
        clientSecret: "secret",
      },
      hasStoredSecret: false,
    });

    for (const result of [classPass, zoom]) {
      assert.equal(result.valid, true);
      assert.equal(result.canAttemptRemoteCheck, true);
      assert.equal(result.readiness, "NEEDS_REMOTE_VERIFICATION");
      assert.notEqual(result.config?.readiness, "VERIFIED");
    }
  });
});
