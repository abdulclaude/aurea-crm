import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  path.join(process.cwd(), "src/features/studio-add-ons/server/router.ts"),
  "utf8",
);

function procedureSource(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);

  assert.notEqual(start, -1, `Missing ${name} procedure`);
  assert.notEqual(end, -1, `Missing ${nextName} procedure`);

  return source.slice(start, end);
}

describe("studio add-on management authorization", () => {
  it("requires provider management permission for integration state changes", () => {
    const managementProcedures = [
      procedureSource("upsertChannel", "createPricingRule"),
      procedureSource("createAccessIntegration", "listAccessIntegrations"),
      procedureSource("upsertMarketplaceListing", "listMarketplaceListings"),
    ];

    for (const procedure of managementProcedures) {
      assert.match(procedure, /capability: "provider\.manage"/);
      assert.match(
        procedure,
        /resource:\s*\{\s*organizationId: orgId,\s*locationId: ctx\.locationId,\s*\}/,
      );
    }
  });

  it("scopes integration and marketplace updates to the active tenant", () => {
    const channelProcedure = procedureSource(
      "upsertChannel",
      "createPricingRule",
    );
    const marketplaceProcedure = procedureSource(
      "upsertMarketplaceListing",
      "listMarketplaceListings",
    );

    assert.match(
      channelProcedure,
      /\.where\(\s*and\(\s*eq\(externalChannelIntegration\.id, existing\.id\),\s*tableScope\(externalChannelIntegration, orgId, ctx\.locationId\)/,
    );
    assert.match(
      marketplaceProcedure,
      /\.where\(\s*and\(\s*eq\(marketplaceListing\.id, input\.id\),\s*tableScope\(marketplaceListing, orgId, ctx\.locationId\)/,
    );
    assert.doesNotMatch(
      source,
      /\.delete\((externalChannelIntegration|accessControlIntegration|marketplaceListing)\)/,
    );
  });
});
